'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Star, Truck } from 'lucide-react'
import type { Product } from '@/lib/types'
import { useT } from '@/lib/i18n/LanguageContext'

interface Review { id: string; rating: number; title: string | null; body: string | null; skinType: string | null; createdAt: string; user?: { name: string } | null }
interface ReviewData { reviews: Review[]; stats: { total: number; average: number; distribution: Record<string, number> } }
type Tab = 'description' | 'ingredients' | 'reviews' | 'delivery'

export default function ProductTabs({ product }: { product: Product }) {
  const t = useT()
  const [active, setActive] = useState<Tab>('description')
  const [reviews, setReviews] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState(0)

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null)
    fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error('Reviews are unavailable'); return response.json() })
      .then(setReviews)
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Reviews are unavailable') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [product.id, request])

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'description', label: t('product.description') },
    { id: 'ingredients', label: t('product.ingredients') },
    { id: 'reviews', label: `${t('product.reviews')}${reviews ? ` (${reviews.stats.total})` : ''}` },
    { id: 'delivery', label: t('product.delivery') },
  ]

  return (
    <section className="mt-12 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="scrollbar-hide flex overflow-x-auto border-b border-gray-100 px-2 sm:px-5" role="tablist">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)} className={`shrink-0 border-b-2 px-4 py-4 text-sm font-bold transition-colors ${active === tab.id ? 'border-[#B76E79] text-[#B76E79]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{tab.label}</button>)}</div>
      <div className="p-5 sm:p-7">
        {active === 'description' && <div className="prose prose-sm max-w-none text-gray-600"><h2 className="text-lg font-black text-[#1a1a1a]">{t('product.about_product', { product: product.name })}</h2><p className="whitespace-pre-line leading-7">{product.description}</p>{product.usageInstructions && <><h3 className="mt-6 font-bold text-gray-800">{t('product.how_to_use')}</h3><p className="leading-7">{product.usageInstructions}</p></>}{product.warnings && <div className="mt-5 flex gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p className="m-0 text-sm">{product.warnings}</p></div>}</div>}

        {active === 'ingredients' && <div><h2 className="text-lg font-black text-[#1a1a1a]">{t('product.key_ingredients')}</h2>{product.ingredients?.length ? <div className="mt-4 flex flex-wrap gap-2">{product.ingredients.map((ingredient) => <span key={ingredient} className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-[#9e5964]">{ingredient}</span>)}</div> : <p className="mt-3 text-sm text-gray-500">{t('product.ingredients_missing')}</p>}</div>}

        {active === 'reviews' && <div>{loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin text-[#B76E79]" />{t('product.loading_reviews')}</div> : error ? <div className="py-10 text-center"><p className="text-sm font-semibold text-gray-700">{error}</p><button type="button" onClick={() => setRequest((value) => value + 1)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />{t('common.retry')}</button></div> : reviews && reviews.reviews.length > 0 ? <><div className="mb-6 flex items-center gap-4 rounded-2xl bg-[#f8f9fa] p-4"><span className="text-4xl font-black text-[#1a1a1a]">{reviews.stats.average.toFixed(1)}</span><span><span className="flex">{[1,2,3,4,5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= Math.round(reviews.stats.average) ? 'fill-[#FFD700] text-[#FFD700]' : 'fill-gray-200 text-gray-200'}`} />)}</span><span className="mt-1 block text-xs text-gray-500">{t('product.based_on_reviews', { count: reviews.stats.total })}</span></span></div><div className="space-y-4">{reviews.reviews.map((review) => <article key={review.id} className="rounded-2xl border border-gray-100 p-4"><div className="flex items-center justify-between gap-3"><div className="flex">{[1,2,3,4,5].map((star) => <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? 'fill-[#FFD700] text-[#FFD700]' : 'fill-gray-200 text-gray-200'}`} />)}</div><time className="text-[10px] text-gray-400">{new Date(review.createdAt).toLocaleDateString('en-RW')}</time></div>{review.title && <h3 className="mt-2 text-sm font-bold">{review.title}</h3>}<p className="mt-1 text-sm leading-6 text-gray-600">{review.body || t('product.positive_experience')}</p><p className="mt-3 text-xs font-semibold text-gray-500">{review.user?.name || t('product.verified_customer')} <span className="ml-1 text-emerald-600">✓ {t('product.verified')}</span></p></article>)}</div></> : <div className="py-12 text-center"><Star className="mx-auto h-9 w-9 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-700">{t('product.no_approved_reviews')}</p><p className="mt-1 text-xs text-gray-500">{t('product.first_review')}</p></div>}</div>}

        {active === 'delivery' && <div><h2 className="flex items-center gap-2 text-lg font-black text-[#1a1a1a]"><Truck className="h-5 w-5 text-[#B76E79]" />{t('product.delivery_across_rwanda')}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{[['Kigali City','1,000 RWF','Same day / 1–2 days'],['Northern & Southern','3,000 RWF','2–3 days'],['Eastern Province','3,500 RWF','2–3 days'],['Western Province','4,000 RWF','3–4 days']].map(([zone,fee,time]) => <div key={zone} className="rounded-2xl bg-[#f8f9fa] p-4"><p className="text-sm font-bold text-gray-800">{zone}</p><p className="mt-1 text-sm font-black text-[#B76E79]">{fee}</p><p className="mt-1 text-xs text-gray-500">{time}</p></div>)}</div><div className="mt-4 flex gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" /><p className="text-sm">{t('product.free_delivery_returns')}</p></div></div>}
      </div>
    </section>
  )
}
