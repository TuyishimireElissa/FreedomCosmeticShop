"use client"

/**
 * BrandCarousel — horizontal scroller of brand logos/names.
 *
 * Features:
 *   - Horizontal scroll with snap
 *   - Prev/next arrows (desktop)
 *   - Click navigates to catalog filtered by brand
 *   - Shows brand logo + name + product count
 *   - Fades content to "now playing" effect
 */

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useT } from '@/lib/i18n/LanguageContext'
import IconButton from '@/components/a11y/IconButton'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface Brand {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  country: string | null
  _count?: { products: number }
}

interface BrandCarouselProps {
  brands: Brand[]
}

export function BrandCarousel({ brands }: BrandCarouselProps) {
  const t = useT()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const amount = 280 // Approximate card width + gap
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })
  }

  // No brands — skip section entirely
  if (brands.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('home.top_brands')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('home.brand_subtitle')}
          </p>
        </div>

        {/* Navigation arrows (desktop) */}
        <div className="flex gap-2">
          <IconButton label={t('home.scroll_brands_left')} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => scroll('left')} className="border bg-white" />
          <IconButton label={t('home.scroll_brands_right')} icon={<ChevronRight className="h-4 w-4" />} onClick={() => scroll('right')} className="border bg-white" />
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => router.push(`/products?brand=${encodeURIComponent(brand.slug)}`)}
            className="group flex w-64 shrink-0 flex-col items-center rounded-2xl border bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            style={{ scrollSnapAlign: "start" }}
          >
            {/* Logo */}
            <div className="mb-3 h-20 w-20 overflow-hidden rounded-full bg-secondary/30">
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={t('home.brand_logo', { brand: brand.name })}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-bold text-primary">
                  {brand.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Name */}
            <h3 className="text-base font-semibold">{brand.name}</h3>
            {brand.country && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {brand.country}
              </p>
            )}
            {brand._count && (
              <p className="mt-2 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                {t('home.products_count', { count: brand._count.products })}
              </p>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
