'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, Flag, Loader2, MessageCircle, Star, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useToast } from '@/hooks/use-toast'

interface ProductReviewsProps { productId: string; productSlug: string }
interface ReviewItem {
  id: string; rating: number; title: string | null; body: string | null; photos: string[]; skinType: string | null; hairType: string | null; shadeUsed: string | null; shadeMatched: boolean | null; helpfulVotes: number; notHelpfulCount: number; merchantResponse: string | null; merchantResponseAt: string | null; createdAt: string; reviewer: { displayName: string }; isVerified: true
}
interface ReviewsData {
  reviews: ReviewItem[]; total: number; pages: number; page: number
  distribution: { total: number; average: number; breakdown: Array<{ stars: number; count: number; percentage: number }> }
  stats: { totalReviews: number; averageRating: number; verifiedCount: number; verifiedPercentage: number }
}
const reportReasons = ['SPAM','ABUSE','PRIVACY','IRRELEVANT','OTHER'] as const

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [data, setData] = useState<ReviewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sort, setSort] = useState('helpful')
  const [filter, setFilter] = useState('all')
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState<(typeof reportReasons)[number]>('SPAM')
  const [reportDetails, setReportDetails] = useState('')

  const load = useCallback(async (page = 1, append = false) => {
    if (page === 1) setLoading(true); else setLoadingMore(true)
    try {
      const params = new URLSearchParams({ page: String(page), sort, filter })
      const response = await fetch(`/api/reviews/product/${encodeURIComponent(productId)}?${params}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'REVIEWS_UNAVAILABLE')
      setData((current) => append && current ? { ...result.data, reviews: [...current.reviews, ...result.data.reviews] } : result.data)
    } catch { toast({ title: t('reviews.load_failed'), variant: 'destructive' }) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [filter, productId, sort, t, toast])
  useEffect(() => { void load() }, [load])

  const vote = async (reviewId: string, isHelpful: boolean) => {
    const response = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isHelpful }) })
    const result = await response.json()
    if (!response.ok) { toast({ title: reviewActionError(result.error, t), variant: 'destructive' }); return }
    setData((current) => current ? { ...current, reviews: current.reviews.map((review) => review.id === reviewId ? { ...review, ...result.data } : review) } : current)
  }
  const report = async (reviewId: string) => {
    const response = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reportReason, details: reportDetails.trim() || undefined }) })
    const result = await response.json()
    if (!response.ok) { toast({ title: reviewActionError(result.error, t), variant: 'destructive' }); return }
    toast({ title: t('reviews.report_received') }); setReportingId(null); setReportDetails(''); setReportReason('SPAM')
  }

  if (loading) return <div className="py-10 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#B76E79]" /><p className="mt-2 text-sm text-gray-500">{t('reviews.loading')}</p></div>
  if (!data || data.stats.totalReviews === 0) return <div className="py-12 text-center"><MessageCircle className="mx-auto h-10 w-10 text-gray-300" /><h3 className="mt-3 font-black text-gray-800">{t('reviews.empty_title')}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{t('reviews.empty_hint')}</p></div>

  return <div><section className="grid gap-6 sm:grid-cols-[170px_1fr]"><div className="text-center"><p className="text-5xl font-black">{data.stats.averageRating.toFixed(1)}</p><Stars rating={data.stats.averageRating} /><p className="mt-2 text-xs text-gray-500">{t('reviews.real_count', { count: data.stats.totalReviews })}</p><p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-green-700"><Check className="h-3 w-3" />{t('reviews.all_verified')}</p></div><div className="space-y-1">{data.distribution.breakdown.map((item) => <button type="button" key={item.stars} onClick={() => setFilter(filter === String(item.stars) ? 'all' : String(item.stars))} className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 ${filter === String(item.stars) ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}><span className="flex w-10 items-center gap-1 text-xs">{item.stars}<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /></span><span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><span className="block h-full rounded-full bg-yellow-400" style={{ width: `${item.percentage}%` }} /></span><span className="w-8 text-right text-xs text-gray-500">{item.count}</span></button>)}</div></section>

    <div className="mt-6 flex flex-wrap items-center gap-3 border-y py-3">{filter !== 'all' && <button type="button" onClick={() => setFilter('all')} className="flex min-h-11 items-center gap-2 rounded-full bg-rose-50 px-3 text-sm font-bold text-[#B76E79]">{t('reviews.filtered_stars', { count: filter })}<X className="h-4 w-4" /></button>}<label className="ml-auto text-sm font-bold text-gray-600">{t('reviews.sort_label')}<select value={sort} onChange={(event) => setSort(event.target.value)} className="ml-2 min-h-11 rounded-xl border bg-white px-3"><option value="helpful">{t('reviews.sort_helpful')}</option><option value="recent">{t('reviews.sort_recent')}</option><option value="rating_high">{t('reviews.sort_high')}</option><option value="rating_low">{t('reviews.sort_low')}</option></select></label></div>

    <div className="divide-y">{data.reviews.map((review) => <article key={review.id} className="py-6"><header className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{review.reviewer.displayName}</strong><span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700"><Check className="h-3 w-3" />{t('reviews.verified_purchase')}</span></div><div className="mt-2 flex items-center gap-2"><Stars rating={review.rating} /><time className="text-xs text-gray-400">{new Intl.DateTimeFormat(language === 'rw' ? 'rw-RW' : 'en-RW', { dateStyle: 'medium' }).format(new Date(review.createdAt))}</time></div></div></header>{review.title && <h3 className="mt-3 font-black text-gray-900">{review.title}</h3>}{review.body && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{review.body}</p>}{review.photos.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto">{review.photos.map((photo, index) => <a key={photo} href={photo} target="_blank" rel="noreferrer" className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl"><Image src={photo} alt={t('reviews.photo_alt', { number: index + 1 })} fill sizes="96px" className="object-cover" /></a>)}</div>}<div className="mt-3 flex flex-wrap gap-2 text-xs">{review.skinType && <span className="rounded-full bg-gray-100 px-2 py-1">{t('reviews.skin_value', { value: t(`skin_types.${review.skinType}`) })}</span>}{review.hairType && <span className="rounded-full bg-gray-100 px-2 py-1">{t('reviews.hair_value', { value: t(`hair_types.${review.hairType}`) })}</span>}{review.shadeMatched !== null && <span className={`rounded-full px-2 py-1 ${review.shadeMatched ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{review.shadeMatched ? t('reviews.shade_matched') : t('reviews.shade_not_matched')}</span>}</div>{review.merchantResponse && <div className="mt-4 rounded-xl border-l-4 border-[#B76E79] bg-gray-50 p-3"><strong className="text-xs">{t('reviews.merchant_response')}</strong><p className="mt-1 text-sm leading-6 text-gray-700">{review.merchantResponse}</p></div>}
      <footer className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs text-gray-500">{t('reviews.helpful_question')}</span><button type="button" onClick={() => vote(review.id, true)} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-gray-600 hover:bg-green-50 hover:text-green-700"><ThumbsUp className="h-4 w-4" />{review.helpfulVotes}</button><button type="button" onClick={() => vote(review.id, false)} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-gray-600 hover:bg-red-50 hover:text-red-700"><ThumbsDown className="h-4 w-4" />{review.notHelpfulCount}</button><button type="button" onClick={() => setReportingId(reportingId === review.id ? null : review.id)} className="ml-auto flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs text-gray-500"><Flag className="h-4 w-4" />{t('reviews.report')}</button></footer>
      {reportingId === review.id && <div className="mt-3 rounded-xl bg-gray-50 p-3"><label className="text-xs font-bold">{t('reviews.report_reason')}<select value={reportReason} onChange={(event) => setReportReason(event.target.value as typeof reportReason)} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3">{reportReasons.map((reason) => <option key={reason} value={reason}>{t(`reviews.report_${reason.toLowerCase()}`)}</option>)}</select></label><textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={500} placeholder={t('reviews.report_details')} className="input-field mt-2 resize-none" /><button type="button" onClick={() => report(review.id)} className="mt-2 min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white">{t('reviews.submit_report')}</button></div>}</article>)}</div>
    {data.page < data.pages && <button type="button" onClick={() => load(data.page + 1, true)} disabled={loadingMore} className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl border-2 font-bold text-gray-700">{loadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : t('reviews.load_more')}</button>}
  </div>
}

function Stars({ rating }: { rating: number }) { return <span className="flex justify-center">{[1,2,3,4,5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-300'}`} />)}</span> }
function reviewActionError(error: string, t: (key: string) => string) { const known = new Set(['AUTH_REQUIRED','SELF_VOTE_NOT_ALLOWED','ALREADY_REPORTED','SELF_REPORT_NOT_ALLOWED','INVALID_REPORT']); return t(known.has(error) ? `reviews.error_${error.toLowerCase()}` : 'reviews.action_failed') }
