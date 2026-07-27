'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

interface HomepageReview {
  id: string
  rating: number
  title: string | null
  comment: string
  skinType: string | null
  isVerified: boolean
  createdAt: string
  user: { displayName: string | null }
  product: { name: string; slug: string }
}

interface ReviewStats {
  totalReviews: number
  averageRating: number
  verifiedCount: number
}

const KNOWN_SKIN_TYPES = new Set(['OILY', 'DRY', 'COMBINATION', 'NORMAL', 'SENSITIVE', 'ALL'])

export function ReviewsSection() {
  const t = useT()
  const [reviews, setReviews] = useState<HomepageReview[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/reviews/homepage?limit=3', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then((data) => {
        if (data.success && data.data) {
          setReviews(data.data.reviews || [])
          setStats(data.data.stats || null)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  if (loading || !stats || reviews.length < 3 || stats.totalReviews < 3) return null

  return (
    <section className="bg-gray-50 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="mb-2 text-xl font-bold text-gray-900 md:text-2xl">{t('home.section_reviews')}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex" aria-label={t('home.rating_stars', { rating: stats.averageRating })}>
                {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= Math.round(stats.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} aria-hidden="true" />)}
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.averageRating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">{t('product.reviews_count', { count: stats.totalReviews })}</span>
              {stats.verifiedCount > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{t('home.verified_reviews_count', { count: stats.verifiedCount })}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {reviews.slice(0, 3).map((review) => {
            const displayName = review.user.displayName || t('checkout.customer')
            return (
              <article key={review.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex" aria-label={t('home.rating_stars', { rating: review.rating })}>
                  {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} aria-hidden="true" />)}
                </div>

                {review.title && <h3 className="mb-1 text-sm font-bold text-gray-900">{review.title}</h3>}
                <p className="mb-3 line-clamp-4 text-sm leading-relaxed text-gray-600">“{review.comment}”</p>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B76E79]/20 text-xs font-bold text-[#B76E79]">{displayName.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-900">{displayName}</p>
                      {review.skinType && KNOWN_SKIN_TYPES.has(review.skinType) && <p className="text-xs text-gray-500">{t(`skin_types.${review.skinType}`)}</p>}
                    </div>
                  </div>
                  {review.isVerified && <span className="shrink-0 text-xs font-medium text-green-700"> {t('product.verified_purchase')}</span>}
                </div>

                <p className="mt-2 line-clamp-1 text-xs text-gray-500">{t('home.purchased_product', { product: review.product.name })}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
