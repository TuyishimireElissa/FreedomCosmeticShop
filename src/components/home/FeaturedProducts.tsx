'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Product } from '@/lib/types'
import { ProductCard } from '@/components/storefront/ProductCard'
import { useProductUpdates } from '@/hooks/use-realtime'
import { useT } from '@/lib/i18n/LanguageContext'

interface FeaturedProductsProps {
  type?: 'featured' | 'new-arrivals'
  limit?: number
}

export default function FeaturedProducts({ type = 'featured', limit = 4 }: FeaturedProductsProps) {
  const t = useT()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const sectionTitle = type === 'featured' ? t('home.featured_essentials') : t('categories.new_arrivals')
  const viewAllHref = type === 'featured' ? '/products?sort=best-selling' : '/products?sort=newest'
  const apiEndpoint = type === 'featured'
    ? `/api/products/featured?limit=${limit}`
    : `/api/products?sort=newest&pageSize=${limit}&inStock=true`

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(false)

    try {
      const response = await fetch(apiEndpoint, { cache: 'no-store', signal })
      if (!response.ok) throw new Error()
      const data = await response.json()
      const rows = data.data?.products || data.products || []
      if (!signal?.aborted) setProducts(rows.slice(0, limit))
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(true)
        setProducts([])
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [apiEndpoint, limit])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  useProductUpdates(() => {
    void load()
  })

  if (loading) {
    return (
      <section className="px-4 py-6 md:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center justify-between"><div className="h-6 w-40 animate-pulse rounded bg-gray-200" /><div className="h-4 w-16 animate-pulse rounded bg-gray-200" /></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        </div>
      </section>
    )
  }

  if (error || products.length === 0) return null

  return (
    <section className="px-4 py-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900 md:text-xl">{sectionTitle}</h2>
          <Link href={viewAllHref} className="flex min-h-11 shrink-0 items-center gap-1 px-2 text-sm font-medium text-[#B76E79] transition-colors hover:text-[#a55d68]">
            {t('home.view_all')} <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="scrollbar-hide scroll-smooth-ios -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 touch-pan-x md:hidden">
          {products.map((product) => (
            <div key={product.id} className="w-[calc(50vw-20px)] min-w-[140px] max-w-[180px] flex-none snap-start">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>

        <div className="hidden grid-cols-4 gap-4 md:grid">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>

        <Link href={viewAllHref} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 transition-colors hover:border-[#B76E79] hover:text-[#B76E79]">
          {t('home.view_all')} <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
