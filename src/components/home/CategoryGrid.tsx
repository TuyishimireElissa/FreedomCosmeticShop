'use client'

import { ArrowRight, RefreshCw, Shapes } from 'lucide-react'
import type { Category } from '@/lib/types'
import { useStore } from '@/store/useStore'

interface CategoryGridProps {
  categories: Category[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

const categoryIcons: Record<string, string> = {
  skincare: '🧴',
  makeup: '💄',
  haircare: '💇🏾‍♀️',
  'hair-care': '💇🏾‍♀️',
  fragrance: '🌸',
  'bath-body': '🛁',
  'body-care': '🧼',
  'mens-grooming': '🪒',
}

export function CategoryGrid({ categories, loading = false, error, onRetry }: CategoryGridProps) {
  const goCatalog = useStore((state) => state.goCatalog)

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B76E79]">Curated collections</span>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1a1a1a] sm:text-3xl">Shop by category</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-500">Discover authentic beauty essentials selected for every routine, skin tone and hair texture.</p>
        </div>
        <button type="button" onClick={() => goCatalog(null)} className="hidden shrink-0 items-center gap-2 text-sm font-bold text-[#B76E79] hover:text-[#9e5964] sm:flex">View all <ArrowRight className="h-4 w-4" /></button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 sm:aspect-square" />)}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/50 px-5 py-10 text-center">
          <Shapes className="mx-auto h-8 w-8 text-[#B76E79]" />
          <p className="mt-3 text-sm font-semibold text-gray-800">Categories are temporarily unavailable.</p>
          <p className="mt-1 text-xs text-gray-500">Please try loading the collections again.</p>
          {onRetry && <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />Retry</button>}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-3xl bg-[#f8f9fa] px-5 py-10 text-center text-sm text-gray-500">New beauty collections are coming soon.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {categories.slice(0, 6).map((category) => (
            <button key={category.id} type="button" onClick={() => goCatalog(category.slug)} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#f4e8ea] text-left shadow-[0_7px_24px_rgba(26,26,26,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(183,110,121,0.18)] sm:aspect-square">
              {category.image ? <img src={category.image} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" /> : <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#f9edef] to-[#e8cdd2]"><span className="text-5xl" aria-hidden="true">{categoryIcons[category.slug] || '✨'}</span></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                <span className="text-xl drop-shadow" aria-hidden="true">{categoryIcons[category.slug] || category.icon || '✨'}</span>
                <h3 className="mt-1 text-sm font-extrabold text-white sm:text-base">{category.name}</h3>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] text-white/70">{category._count?.products ?? 0} products</span>
                  <ArrowRight className="h-3.5 w-3.5 text-white transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
