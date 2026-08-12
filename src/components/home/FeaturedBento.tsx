'use client'

/**
 * Featured products as a bento: one large tile, two small.
 *
 * The rail is owner-curated via `Product.featured`. Today that count is zero —
 * 111 flags were cleared because 99 of 101 products were flagged, which made
 * "featured" mean "most recently edited". So this component has to behave
 * correctly at 0, 1, 2 and 3+ products, not just at the happy number:
 *
 *   0        hide entirely. 101 products are live, so "no products available"
 *            would be false, and the catalogue is one tap away below.
 *   1-2      even grid. A lone tile stretched to hero size looks like a bug.
 *   3+       bento: first item spans two columns and two rows.
 *
 * Cards are the existing ProductCard, which already carries stock state,
 * discount badge, wishlist and add-to-cart. A bespoke card here would fork
 * that behaviour.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Product } from '@/lib/types'
import { ProductCard } from '@/components/storefront/ProductCard'
import { SkeletonGrid } from '@/components/ui/SkeletonCard'
import { useT } from '@/lib/i18n/LanguageContext'

export default function FeaturedBento({ limit = 3 }: { limit?: number }) {
  const t = useT()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch(`/api/products/featured?limit=${limit}`, { cache: 'no-store', signal })
      if (!response.ok) throw new Error()
      const body = await response.json()
      const rows: Product[] = body.data?.products || body.products || []
      if (!signal.aborted) setProducts(rows.slice(0, limit))
    } catch (error) {
      // A failed fetch and an empty curation both mean "show nothing here".
      if (!(error instanceof DOMException && error.name === 'AbortError') && !signal.aborted) setProducts([])
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (loading) {
    return (
      <section className="bg-fcs-bg px-4 py-10 md:py-16">
        <div className="mx-auto max-w-5xl">
          <SkeletonGrid count={3} label={t('home.featured_loading')} className="md:grid-cols-2" />
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  const bento = products.length >= 3

  return (
    <section id="featured-products" className="scroll-mt-20 bg-fcs-bg px-4 py-10 md:py-16" aria-labelledby="featured-bento-title">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fcs-brand-text">
              {t('home.featured_eyebrow')}
            </p>
            <h2 id="featured-bento-title" className="mt-1.5 font-display text-3xl font-normal text-fcs-text">
              {t('home.featured_essentials')}
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-fcs-brand-text transition-colors hover:text-fcs-brand-hover"
          >
            {t('home.view_all')}
          </Link>
        </div>

        <ul className={`grid gap-3 md:gap-4 ${bento ? 'grid-cols-2 md:grid-rows-2' : 'grid-cols-2'}`}>
          {products.map((product, index) => (
            <li
              key={product.id}
              className={bento && index === 0 ? 'col-span-2 md:row-span-2' : ''}
            >
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
