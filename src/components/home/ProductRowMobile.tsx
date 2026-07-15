'use client'

import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import type { Product } from '@/lib/types'
import { ProductCard } from '@/components/storefront/ProductCard'
import ScrollHint from '@/components/ui/ScrollHint'
import { useT } from '@/lib/i18n/LanguageContext'

interface ProductRowMobileProps {
  title: string
  subtitle?: string
  badge?: string
  products: Product[]
  viewAllHref?: string
  onViewAll?: () => void
}

export default function ProductRowMobile({
  title,
  subtitle,
  badge,
  products,
  viewAllHref = '/products',
  onViewAll,
}: ProductRowMobileProps) {
  const t = useT()
  const desktopProducts = products.slice(0, 8)
  const mobileProducts = products.slice(0, 4)

  return (
    <>
      <div className="mb-3 flex items-end justify-between gap-3 md:mb-7">
        <div className="min-w-0">
          {badge && (
            <span className="inline-flex rounded-full bg-[#B76E79]/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-[#B76E79]">
              {badge}
            </span>
          )}
          <h2 className="mt-2 text-lg font-black leading-tight tracking-tight text-[#1a1a1a] md:text-3xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ScrollHint className="md:hidden" />
          <Link
            href={viewAllHref}
            onClick={onViewAll}
            className="hidden min-h-11 items-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-sm font-bold text-[#B76E79] shadow-sm transition-colors hover:border-[#B76E79] md:flex"
          >
            {t('home.view_all')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="scrollbar-hide scroll-smooth-ios -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 touch-pan-x md:hidden">
        {mobileProducts.map((product) => (
          <div
            key={product.id}
            className="w-[calc(50vw-20px)] min-w-[140px] max-w-[180px] flex-none snap-start"
          >
            <ProductCard product={product} compact />
          </div>
        ))}
        {products.length > 4 && (
          <Link
            href={viewAllHref}
            onClick={onViewAll}
            className="flex min-h-[220px] w-[calc(50vw-20px)] min-w-[120px] max-w-[180px] flex-none snap-start flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 text-center text-sm font-medium text-[#B76E79] transition-colors hover:border-[#B76E79] hover:bg-[#B76E79]/5"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
            {t('home.view_all')}
            <span className="text-xs text-gray-500">
              {products.length - 4}+ {t('nav.products')}
            </span>
          </Link>
        )}
      </div>

      <div className="hidden grid-cols-2 gap-4 md:grid lg:grid-cols-4">
        {desktopProducts.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </>
  )
}
