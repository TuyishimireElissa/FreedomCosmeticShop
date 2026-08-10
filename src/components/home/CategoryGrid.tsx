'use client'

/**
 * 2×2 category grid.
 *
 * Replaces the previous 3-up carousel, which used nine hard-coded hex values
 * and silently dropped Body Care — the largest category at 45 products —
 * because its priority list stopped at three.
 *
 * Only three of six categories have an image in the database. Rather than
 * leave two tiles blank or invent stock photography, an image-less tile gets a
 * warm token surface and shows its product count, which is real information a
 * shopper can use. Selection is by product count, so the biggest categories
 * lead regardless of whether someone remembered to upload a photo.
 */

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Category } from '@/lib/types'
import { useT } from '@/lib/i18n/LanguageContext'
import LogoRef from '@/components/brand/LogoRef'

interface CategoryGridProps {
  categories: Category[]
  loading?: boolean
  error?: string | null
}

const TRANSLATION_KEYS: Record<string, string> = {
  skincare: 'categories.skincare',
  haircare: 'categories.haircare',
  'hair-care': 'categories.haircare',
  'body-care': 'categories.body_care',
  'bath-body': 'categories.body_care',
  makeup: 'categories.makeup',
}

/** Warm surfaces for tiles with no photograph. Text on each is --fcs-text
 *  (>=4.5:1 on all three) rather than white, so contrast never depends on an
 *  image loading. */
const TONES = ['bg-fcs-surface-muted', 'bg-fcs-sage/25', 'bg-fcs-wheat/25', 'bg-fcs-sky/25']

function productCount(category: Category): number {
  const raw = category as Category & { productCount?: number; _count?: { products?: number } }
  return raw.productCount ?? raw._count?.products ?? 0
}

export default function CategoryGrid({ categories, loading = false, error }: CategoryGridProps) {
  const t = useT()

  // Largest first: a homepage tile is prime real estate and should point at
  // the deepest inventory, not at whichever slug was hard-coded first.
  const tiles = [...categories]
    .sort((a, b) => productCount(b) - productCount(a))
    .slice(0, 4)

  if (error) return null
  // Hide rather than render a lopsided grid.
  if (!loading && tiles.length < 2) return null

  return (
    <section className="bg-fcs-bg px-4 py-10 md:py-16" aria-labelledby="category-grid-title">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fcs-brand-text">
              {t('nav.categories')}
            </p>
            <h2 id="category-grid-title" className="mt-1.5 font-display text-3xl font-normal text-fcs-text">
              {t('home.shop_category')}
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-fcs-brand-text transition-colors hover:text-fcs-brand-hover"
          >
            {t('home.view_all')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:gap-4" aria-busy="true">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="aspect-[4/3] animate-pulse rounded-fcs-md bg-fcs-surface-secondary motion-reduce:animate-none" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:gap-4">
            {tiles.map((category, index) => {
              const label = TRANSLATION_KEYS[category.slug] ? t(TRANSLATION_KEYS[category.slug]) : category.name
              const count = productCount(category)
              const hasImage = Boolean(category.image)
              return (
                <li key={category.id}>
                  <Link
                    href={`/products?category=${encodeURIComponent(category.slug)}`}
                    className={`group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-fcs-md border border-fcs-border-subtle p-4 transition-transform duration-200 ease-fcs-snap hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                      hasImage ? 'bg-fcs-text' : TONES[index % TONES.length]
                    }`}
                  >
                    {hasImage && (
                      <>
                        <Image
                          src={category.image!}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 50vw, 280px"
                          loading="lazy"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
                        />
                        {/* Scrim so white text keeps its contrast over any photo. */}
                        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" aria-hidden="true" />
                      </>
                    )}
                    {/* Owner-requested brand mark, top-left of each tile.
                      *
                      * On photo tiles it needs a white chip. The tile's scrim
                      * is a bottom-up gradient protecting the caption, so the
                      * top-left corner shows the raw photo — and against a
                      * beige or skin-tone image the mark measures 1.54:1 and
                      * effectively vanishes (computed, not assumed). The chip
                      * restores the white ground the logo was drawn for.
                      *
                      * Colour tiles are already pale and flat, so the mark
                      * sits directly on them, dialled back slightly.
                      *
                      * Decorative: the category name below is the content. */}
                    {hasImage ? (
                      <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-fcs-sm bg-white/90 px-1.5 py-1 shadow-sm">
                        <LogoRef height={14} />
                      </span>
                    ) : (
                      <LogoRef
                        height={16}
                        className="pointer-events-none absolute left-3 top-3 z-10 opacity-75"
                      />
                    )}
                    <span className="relative">
                      <span className={`block font-display text-lg leading-tight md:text-xl ${hasImage ? 'text-white' : 'text-fcs-text'}`}>
                        {label}
                      </span>
                      {count > 0 && (
                        <span className={`mt-1 block text-xs font-semibold ${hasImage ? 'text-white/90' : 'text-fcs-text-muted'}`}>
                          {t('home.category_count', { count })}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
