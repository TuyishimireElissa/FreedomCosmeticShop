'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, Camera, Check, Loader2, Star, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MAX_REVIEW_PHOTOS, REVIEW_REWARD_POINTS } from '@/lib/review-constants'
import FormField from '@/components/a11y/FormField'
import FormTextarea from '@/components/a11y/FormTextarea'
import { ResilientFetchError, useResilientFetch } from '@/hooks/useResilientFetch'
import { useAnalytics } from '@/hooks/useAnalytics'

interface Props { orderId: string; productId: string }
interface Eligibility {
  order: { id: string; orderNumber: string; deliveredAt: string; reviewDeadline: string }
  product: { id: string; name: string; slug: string; image: string | null; categorySlug: string; hasShades: boolean; supportsSkinType: boolean; supportsHairType: boolean }
}
const skinTypes = ['OILY','DRY','COMBINATION','NORMAL','SENSITIVE','ALL'] as const
const hairTypes = ['NATURAL','RELAXED','WAVY','CURLY','COILY','ALL_HAIR'] as const

export default function ReviewSubmissionForm({ orderId, productId }: Props) {
  const { t } = useLanguage()
  const { resilientFetch } = useResilientFetch()
  const { trackReviewSubmitted } = useAnalytics()
  const [eligibility, setEligibility] = useState<Eligibility | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [skinType, setSkinType] = useState('')
  const [hairType, setHairType] = useState('')
  const [shadeMatched, setShadeMatched] = useState<boolean | undefined>()
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    resilientFetch(`/api/reviews/eligibility?orderId=${encodeURIComponent(orderId)}&productId=${encodeURIComponent(productId)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'ELIGIBILITY_UNAVAILABLE'); return result })
      .then((result) => setEligibility(result.data))
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        if (reason instanceof ResilientFetchError) setError(reason.code === 'OFFLINE' ? 'NETWORK_OFFLINE' : 'NETWORK_REQUEST_FAILED')
        else setError(reason instanceof Error ? reason.message : 'ELIGIBILITY_UNAVAILABLE')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [orderId, productId, resilientFetch])

  const uploadPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files || [])].slice(0, MAX_REVIEW_PHOTOS - photos.length)
    event.target.value = ''
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('INVALID_REVIEW_PHOTO'); continue }
        const form = new FormData(); form.append('file', file)
        const response = await fetch('/api/reviews/upload', { method: 'POST', body: form })
        const result = await response.json()
        if (!response.ok) { setError(result.error || 'REVIEW_PHOTO_UPLOAD_FAILED'); continue }
        setPhotos((current) => current.length < MAX_REVIEW_PHOTOS ? [...current, result.data.url] : current)
      }
    } finally { setUploading(false) }
  }

  const submit = async () => {
    if (!rating || !eligibility) { setError('RATING_REQUIRED'); return }
    setSubmitting(true); setError('')
    try {
      const response = await resilientFetch('/api/reviews/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, productId, rating, title: title.trim() || undefined, comment: comment.trim() || undefined, skinType: skinType || undefined, hairType: hairType || undefined, shadeMatched, photos }) })
      const result = await response.json()
      if (!response.ok) { setError(result.error || 'REVIEW_SUBMISSION_FAILED'); return }
      trackReviewSubmitted(productId)
      setSubmitted(true)
    } catch (reason) {
      if (reason instanceof ResilientFetchError) setError(reason.code === 'OFFLINE' ? 'NETWORK_OFFLINE' : 'NETWORK_REQUEST_FAILED')
      else setError('REVIEW_SUBMISSION_FAILED')
    }
    finally { setSubmitting(false) }
  }

  if (loading) return <main className="grid min-h-[60vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-[#B76E79]" /><p className="mt-3 text-sm text-gray-500">{t('reviews.checking_eligibility')}</p></div></main>
  if (error && !eligibility) return <State message={reviewError(error, t)} />
  if (!eligibility) return <State message={t('reviews.not_eligible')} />
  if (submitted) return <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center"><div><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-50 text-green-600"><Check className="h-9 w-9" /></span><h1 className="mt-5 text-2xl font-black">{t('reviews.thank_you')}</h1><p className="mt-2 text-sm text-gray-600">{t('reviews.points_awarded_equal', { points: REVIEW_REWARD_POINTS })}</p><Link href={`/products/${eligibility.product.slug}`} className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#B76E79] px-6 font-black text-white">{t('reviews.back_to_product')}</Link></div></main>

  const product = eligibility.product
  return <main className="mx-auto max-w-2xl px-4 py-7 pb-28"><header><h1 className="text-3xl font-black text-gray-900">{t('reviews.form_title')}</h1><p className="mt-2 text-sm leading-6 text-gray-600">{t('reviews.equal_reward_notice', { points: REVIEW_REWARD_POINTS })}</p></header>
    <section className="mt-5 flex items-center gap-4 rounded-2xl bg-gray-50 p-4">{product.image && <Image src={product.image} alt={product.name} width={72} height={72} className="h-[72px] w-[72px] rounded-xl object-cover" />}<div><h2 className="font-black text-gray-900">{product.name}</h2><p className="mt-1 text-xs text-gray-500">{t('reviews.order_value', { order: eligibility.order.orderNumber })}</p><p className="mt-1 flex items-center gap-1 text-xs font-bold text-green-700"><Check className="h-3 w-3" />{t('reviews.verified_purchase')}</p></div></section>

    <fieldset className="mt-6" aria-required="true" aria-invalid={error === 'RATING_REQUIRED' ? true : undefined} aria-describedby={error === 'RATING_REQUIRED' ? 'review-form-error' : undefined}><legend className="text-sm font-black text-gray-900">{t('reviews.rating_label')}<span className="ml-1 text-red-700" aria-hidden="true">*</span><span className="sr-only"> {t('accessibility.required')}</span></legend><div className="mt-2 flex gap-1" role="radiogroup">{[1,2,3,4,5].map((star) => <button type="button" role="radio" aria-checked={rating === star} key={star} onClick={() => { setRating(star); if (error === 'RATING_REQUIRED') setError('') }} className="grid h-12 w-12 place-items-center rounded-xl hover:bg-yellow-50" aria-label={t('reviews.stars_label', { count: star })}><Star aria-hidden="true" className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-300'}`} /></button>)}</div>{rating > 0 && <p className="mt-2 text-sm font-bold text-gray-600">{t(`reviews.rating_${rating}`)}</p>}</fieldset>

    <div className="mt-6 space-y-5"><FormField id="review-title" label={t('reviews.title_optional')} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder={t('reviews.title_placeholder')} /><FormTextarea id="review-comment" label={t('reviews.comment_optional')} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={5} placeholder={t('reviews.comment_placeholder')} textareaClassName="resize-none text-base" afterField={<span className="block text-right text-xs text-gray-500">{comment.length}/2000</span>} /></div>

    {product.supportsSkinType && <OptionGroup title={t('reviews.skin_optional')} values={skinTypes} selected={skinType} setSelected={setSkinType} prefix="skin_types" t={t} />}
    {product.supportsHairType && <OptionGroup title={t('reviews.hair_optional')} values={hairTypes} selected={hairType} setSelected={setHairType} prefix="hair_types" t={t} />}
    {product.hasShades && <section className="mt-6"><h2 className="text-sm font-black text-gray-800">{t('reviews.shade_match')}</h2><div className="mt-2 grid grid-cols-2 gap-3"><button type="button" onClick={() => setShadeMatched(true)} className={`min-h-12 rounded-xl border-2 font-bold ${shadeMatched === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}>{t('common.yes')}</button><button type="button" onClick={() => setShadeMatched(false)} className={`min-h-12 rounded-xl border-2 font-bold ${shadeMatched === false ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200'}`}>{t('common.no')}</button></div></section>}

    <section className="mt-6"><h2 className="text-sm font-black text-gray-800">{t('reviews.photos_optional', { count: MAX_REVIEW_PHOTOS })}</h2><div className="mt-3 grid grid-cols-3 gap-3">{photos.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"><Image src={url} alt={t('reviews.photo_alt', { number: index + 1 })} fill sizes="160px" className="object-cover" /><button type="button" onClick={() => setPhotos((current) => current.filter((item) => item !== url))} className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-red-600" aria-label={t('reviews.remove_photo')}><X className="h-4 w-4" /></button></div>)}{photos.length < MAX_REVIEW_PHOTOS && <label className="flex aspect-square min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-500"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadPhotos} disabled={uploading} className="sr-only" />{uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}<span className="mt-1 text-xs font-bold">{t('reviews.add_photo')}</span></label>}</div></section>

    {error && <p id="review-form-error" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700" role="alert" aria-live="assertive"><AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />{reviewError(error, t)}</p>}
    <button type="button" onClick={submit} disabled={!rating || submitting || uploading} className="mt-7 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#B76E79] px-5 font-black text-white disabled:opacity-40">{submitting ? t('reviews.submitting') : t('reviews.submit_equal', { points: REVIEW_REWARD_POINTS })}</button><p className="mt-2 text-center text-xs text-gray-500">{t('reviews.negative_welcome')}</p>
  </main>
}

function OptionGroup({ title, values, selected, setSelected, prefix, t }: { title: string; values: readonly string[]; selected: string; setSelected: (value: string) => void; prefix: string; t: (key: string, values?: Record<string,string|number>) => string }) { return <section className="mt-6"><h2 className="text-sm font-black text-gray-800">{title}</h2><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{values.map((value) => <button type="button" key={value} onClick={() => setSelected(selected === value ? '' : value)} className={`min-h-11 rounded-xl border-2 px-3 text-sm font-bold ${selected === value ? 'border-[#B76E79] bg-rose-50 text-[#B76E79]' : 'border-gray-200 text-gray-700'}`}>{t(`${prefix}.${value}`)}</button>)}</div></section> }
function State({ message }: { message: string }) { const { t } = useLanguage(); return <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center"><div><AlertCircle className="mx-auto h-12 w-12 text-amber-500" /><h1 className="mt-4 text-xl font-black">{message}</h1><Link href="/account/orders" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[#1a1a1a] px-5 font-bold text-white">{t('reviews.back_to_orders')}</Link></div></main> }
function reviewError(error: string, t: (key: string) => string) { if (error === 'NETWORK_OFFLINE') return t('network.offline'); if (error === 'NETWORK_REQUEST_FAILED') return t('network.request_failed'); const known = new Set(['AUTH_REQUIRED','DELIVERED_ORDER_REQUIRED','PRODUCT_NOT_IN_ORDER','REVIEW_WINDOW_EXPIRED','ALREADY_REVIEWED','INVALID_REVIEW_PHOTO','REVIEW_PHOTO_UPLOAD_FAILED','RATING_REQUIRED','REVIEW_SUBMISSION_FAILED','ELIGIBILITY_UNAVAILABLE']); return t(known.has(error) ? `reviews.error_${error.toLowerCase()}` : 'reviews.error_review_submission_failed') }
