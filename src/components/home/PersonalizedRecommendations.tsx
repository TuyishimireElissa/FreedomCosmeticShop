'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import type { Product } from '@/lib/types'
import { ProductCard } from '@/components/storefront/ProductCard'
import { useT } from '@/lib/i18n/LanguageContext'

type Reason = 'QUIZ_MATCH' | 'PURCHASE_CATEGORY' | 'SAVED_CATEGORY' | 'BRAND_MATCH'
type Response = {
  products: Product[]
  reasons: Record<string, Reason>
  personalized: boolean
}

const reasonKeys: Record<Reason, string> = {
  QUIZ_MATCH: 'personalized_recommendations.reason_quiz',
  PURCHASE_CATEGORY: 'personalized_recommendations.reason_purchase_category',
  SAVED_CATEGORY: 'personalized_recommendations.reason_saved_category',
  BRAND_MATCH: 'personalized_recommendations.reason_brand',
}

export default function PersonalizedRecommendations() {
  const t = useT()
  const [result, setResult] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/recommendations/personalized?limit=4', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<Response> : null)
      .then((data) => { if (!controller.signal.aborted && data?.personalized && data.products.length) setResult(data) })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  if (loading) {
    return <section className="px-4 py-6" aria-label={t('personalized_recommendations.loading')} aria-busy="true"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />)}</div></section>
  }
  if (!result) return null

  return (
    <section className="px-4 py-6 md:py-8" aria-labelledby="personalized-recommendations-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="personalized-recommendations-title" className="flex items-center gap-2 text-lg font-bold text-gray-900 md:text-xl"><Sparkles className="h-5 w-5 text-[#B76E79]" aria-hidden="true" />{t('personalized_recommendations.title')}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">{t('personalized_recommendations.description')}</p>
          </div>
          <Link href="/products" className="flex min-h-11 shrink-0 items-center gap-1 px-2 text-sm font-medium text-[#8a4b55]">{t('home.view_all')}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>

        <div className="scrollbar-hide -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 md:hidden">
          {result.products.map((product) => <div key={product.id} className="w-[calc(50vw-20px)] min-w-[140px] max-w-[180px] flex-none snap-start"><p className="mb-1 min-h-5 text-xs font-semibold text-[#8a4b55]">{t(reasonKeys[result.reasons[product.id]] || 'personalized_recommendations.reason_activity')}</p><ProductCard product={product} compact /></div>)}
        </div>
        <div className="hidden grid-cols-4 gap-4 md:grid">
          {result.products.map((product) => <div key={product.id}><p className="mb-1 min-h-5 text-xs font-semibold text-[#8a4b55]">{t(reasonKeys[result.reasons[product.id]] || 'personalized_recommendations.reason_activity')}</p><ProductCard product={product} /></div>)}
        </div>
        <p className="mt-4 text-xs leading-5 text-gray-500">{t('personalized_recommendations.privacy_note')}</p>
      </div>
    </section>
  )
}
