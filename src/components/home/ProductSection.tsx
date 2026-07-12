'use client'

import { ArrowRight, PackageOpen, RefreshCw } from 'lucide-react'
import type { Product } from '@/lib/types'
import { ProductCard } from '@/components/storefront/ProductCard'

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
  return (
    <section className={tone === 'soft' ? 'bg-[#f8f9fa]' : 'bg-white'}>
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            {badge && <span className="inline-flex rounded-full bg-[#B76E79]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B76E79]">{badge}</span>}
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1a1a1a] sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-500">{subtitle}</p>}
          </div>
          {onViewAll && <button type="button" onClick={onViewAll} className="hidden shrink-0 items-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-sm font-bold text-[#B76E79] shadow-sm transition-all hover:border-[#B76E79] hover:shadow-md sm:flex">View all <ArrowRight className="h-4 w-4" /></button>}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <div className="aspect-square animate-pulse bg-gray-100" />
                <div className="space-y-2.5 p-3 sm:p-4"><div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" /><div className="h-4 w-full animate-pulse rounded bg-gray-100" /><div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" /><div className="h-10 w-full animate-pulse rounded-xl bg-rose-100" /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-dashed border-rose-200 bg-white px-5 py-12 text-center shadow-sm">
            <PackageOpen className="mx-auto h-9 w-9 text-[#B76E79]" />
            <p className="mt-3 text-sm font-semibold text-gray-800">We couldn&apos;t load these products.</p>
            <p className="mt-1 text-xs text-gray-500">Your beauty collection is safe—please try again.</p>
            {onRetry && <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />Retry products</button>}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-12 text-center"><PackageOpen className="mx-auto h-9 w-9 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-700">Fresh products are coming soon.</p></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {onViewAll && <button type="button" onClick={onViewAll} className="mx-auto mt-7 flex items-center gap-2 rounded-full border border-[#B76E79] px-5 py-2.5 text-sm font-bold text-[#B76E79] sm:hidden">View all <ArrowRight className="h-4 w-4" /></button>}
          </>
        )}
      </div>
    </section>
  )
}
