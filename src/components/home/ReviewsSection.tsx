'use client'

import { useCallback, useEffect, useState } from 'react'
import { Quote, RefreshCw, Star } from 'lucide-react'

interface HomepageReview {
  id: string
  rating: number
  title: string | null
  body: string | null
  skinType: string | null
  createdAt: string
  user: { name: string; avatar: string | null } | null
  product: { name: string; slug: string } | null
}

interface ReviewResponse {
  reviews: HomepageReview[]
  stats: { total: number; average: number }
}

export function ReviewsSection() {
  const [data, setData] = useState<ReviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/reviews?limit=6', { cache: 'no-store' })
      if (!response.ok) throw new Error('Customer reviews are unavailable')
      setData(await response.json())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load reviews')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="bg-gradient-to-b from-[#f8f9fa] to-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B76E79]">Real customer stories</span>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1a1a1a] sm:text-3xl">Loved across Rwanda</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">Verified experiences from customers discovering their new beauty favourites.</p>
          {!loading && data && data.stats.total > 0 && <div className="mt-4 flex items-center justify-center gap-2"><div className="flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= Math.round(data.stats.average) ? 'fill-[#FFD700] text-[#FFD700]' : 'fill-gray-200 text-gray-200'}`} />)}</div><span className="text-sm font-bold">{data.stats.average.toFixed(1)}/5</span><span className="text-xs text-gray-400">({data.stats.total} reviews)</span></div>}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((index) => <div key={index} className="h-64 animate-pulse rounded-3xl border border-gray-100 bg-white shadow-sm" />)}</div>
        ) : error ? (
          <div className="rounded-3xl border border-dashed border-rose-200 bg-white px-5 py-10 text-center"><Quote className="mx-auto h-8 w-8 text-[#B76E79]" /><p className="mt-3 text-sm font-semibold text-gray-800">Customer stories are temporarily unavailable.</p><button type="button" onClick={load} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />Retry reviews</button></div>
        ) : !data || data.reviews.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center"><Quote className="mx-auto h-8 w-8 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-700">Be the first to share your beauty experience.</p></div>
        ) : (
          <div className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {data.reviews.slice(0, 6).map((review) => {
              const name = review.user?.name || 'Verified customer'
              return (
                <article key={review.id} className="relative flex min-w-[84vw] snap-center flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(26,26,26,0.06)] sm:min-w-[360px] md:min-w-0">
                  <Quote className="absolute right-5 top-5 h-9 w-9 text-[#B76E79]/12" />
                  <div className="flex" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'fill-[#FFD700] text-[#FFD700]' : 'fill-gray-200 text-gray-200'}`} />)}</div>
                  {review.title && <h3 className="mt-4 pr-8 text-sm font-bold text-[#1a1a1a]">{review.title}</h3>}
                  <p className="mt-2 line-clamp-5 flex-1 text-sm leading-6 text-gray-600">“{review.body || 'A wonderful product and shopping experience.'}”</p>
                  {review.product && <p className="mt-4 truncate text-xs font-bold text-[#B76E79]">Purchased: {review.product.name}</p>}
                  <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
                    {review.user?.avatar ? <img src={review.user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-[#B76E79] text-sm font-bold text-white">{name.charAt(0).toUpperCase()}</span>}
                    <div><p className="text-sm font-bold text-gray-800">{name}</p><p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600">✓ Verified customer</p></div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
