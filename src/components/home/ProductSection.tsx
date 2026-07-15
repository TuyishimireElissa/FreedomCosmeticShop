'use client'

import { ArrowRight, PackageOpen, RefreshCw } from 'lucide-react'
import type { Product } from '@/lib/types'
import ProductRowMobile from '@/components/home/ProductRowMobile'
import { useT } from '@/lib/i18n/LanguageContext'

interface ProductSectionProps {
  title: string
  subtitle?: string
  products: Product[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onViewAll?: () => void
  skeletonCount?: number
  badge?: string
  tone?: 'white' | 'soft'
}

export function ProductSection({
  title,
  subtitle,
  products,
  loading = false,
  error,
  onRetry,
  onViewAll,
  skeletonCount = 8,
  badge,
  tone = 'white',
}: ProductSectionProps) {
  const t = useT()
  const hasProducts = !loading && !error && products.length > 0

  return (
    <section className={tone === 'soft' ? 'bg-[#f8f9fa]' : 'bg-white'}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-16 sm:px-6 lg:px-8">
        {hasProducts ? (
          <ProductRowMobile
            title={title}
            subtitle={subtitle}
            badge={badge}
            products={products}
            viewAllHref="/products"
            onViewAll={onViewAll}
          />
        ) : (
          <>
            <div className="mb-4 flex items-end justify-between gap-4 md:mb-7">
              <div>
                {badge && <span className="inline-flex rounded-full bg-[#B76E79]/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-[#B76E79]">{badge}</span>}
                <h2 className="mt-2 text-lg font-black tracking-tight text-[#1a1a1a] md:text-3xl">{title}</h2>
                {subtitle && <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-500">{subtitle}</p>}
              </div>
              {onViewAll && <button type="button" onClick={onViewAll} className="hidden min-h-11 shrink-0 items-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-sm font-bold text-[#B76E79] shadow-sm transition-colors hover:border-[#B76E79] md:flex">{t('home.view_all')} <ArrowRight className="h-4 w-4" /></button>}
            </div>

            {loading ? (
              <>
                <div className="scrollbar-hide -mx-4 flex gap-3 overflow-hidden px-4 pb-4 md:hidden">
                  {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-64 w-40 flex-none animate-pulse rounded-xl bg-gray-100" />)}
                </div>
                <div className="hidden grid-cols-2 gap-4 md:grid lg:grid-cols-4">
                  {Array.from({ length: skeletonCount }).map((_, index) => (
                    <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                      <div className="aspect-square animate-pulse bg-gray-100" />
                      <div className="space-y-2.5 p-4"><div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" /><div className="h-4 w-full animate-pulse rounded bg-gray-100" /><div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" /><div className="h-10 w-full animate-pulse rounded-xl bg-rose-100" /></div>
                    </div>
                  ))}
                </div>
              </>
            ) : error ? (
              <div className="rounded-3xl border border-dashed border-rose-200 bg-white px-5 py-12 text-center shadow-sm">
                <PackageOpen className="mx-auto h-9 w-9 text-[#B76E79]" />
                <p className="mt-3 text-sm font-semibold text-gray-800">{t('home.products_load_failed')}</p>
                <p className="mt-1 text-xs text-gray-500">{t('home.collection_safe_retry')}</p>
                {onRetry && <button type="button" onClick={onRetry} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />{t('home.retry_products')}</button>}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-12 text-center"><PackageOpen className="mx-auto h-9 w-9 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-700">{t('home.fresh_products_coming')}</p></div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
