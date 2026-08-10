'use client'

/**
 * Related products as a horizontal rail.
 *
 * Replaces a full ProductGrid at the foot of the detail page. On a 360px
 * screen that grid stacked into a long vertical column the shopper had to
 * scroll past to reach anything else; as a rail it reads as "a few more
 * things" and costs one swipe.
 *
 * Deliberately not called a "routine": `brandId` is set on 2 of 101 products
 * and `howToUse` on 0, so the system cannot say which items are actually used
 * together or in what order. Presenting category neighbours as a curated
 * regimen would be an invented claim. The heading says related products,
 * which is what the data supports.
 */

import type { Product } from '@/lib/types'
import { ProductCard } from '@/components/storefront/ProductCard'
import { useT } from '@/lib/i18n/LanguageContext'

export default function RoutineRail({ products }: { products: Product[] }) {
  const t = useT()
  if (!products || products.length === 0) return null

  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="routine-rail-title">
      <div className="mb-5">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-fcs-brand-text">
          {t('product.complete_routine')}
        </span>
        <h2 id="routine-rail-title" className="mt-2 font-display text-2xl font-normal text-fcs-text sm:text-3xl">
          {t('product.related')}
        </h2>
      </div>

      {/* Bleeds to the viewport edge on phones so the last card is visibly
        * clipped — the cue that tells a shopper there is more to swipe. */}
      <ul className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible">
        {products.slice(0, 6).map((product) => (
          <li
            key={product.id}
            className="w-[46vw] max-w-[220px] flex-none snap-start md:w-auto md:max-w-none"
          >
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  )
}
