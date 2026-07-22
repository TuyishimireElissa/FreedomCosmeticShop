'use client'

import { ArrowRight, RefreshCw, Shapes } from 'lucide-react'
import type { Category } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/LanguageContext'
import ScrollHint from '@/components/ui/ScrollHint'

interface CategoryGridProps {
  categories: Category[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

const categoryIcons: Record<string, string> = {
  skincare: '',
  makeup: '',
  haircare: '',
  'hair-care': '',
  fragrance: '',
  'bath-body': '',
  'body-care': '',
  'mens-grooming': '',
}

export function CategoryGrid({ categories, loading = false, error, onRetry }: CategoryGridProps) {
  const t = useT()
  const router = useRouter()

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:py-16 lg:px-8">
      <div className="mb-4 flex items-end justify-between gap-4 md:mb-7">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#B76E79]">{t('home.curated_collections')}</span>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1a1a1a] sm:text-3xl">{t('home.shop_category')}</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-500">{t('home.category_subtitle')}</p>
        </div>
        <ScrollHint className="shrink-0 md:hidden" />
        <button type="button" onClick={() => router.push('/products')} className="hidden min-h-11 shrink-0 items-center gap-2 text-sm font-bold text-[#B76E79] hover:text-[#9e5964] md:flex">{t('common.view')} {t('categories.all')} <ArrowRight className="h-4 w-4" /></button>
      </div>

      {loading ? (
        <><div className="scrollbar-hide scroll-smooth-ios -mx-4 grid auto-cols-[88px] grid-flow-col grid-rows-2 gap-3 overflow-x-auto px-4 pb-2 md:hidden">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-20 w-[88px] animate-pulse rounded-xl bg-gradient-to-br from-gray-100 to-gray-200" />)}</div><div className="hidden gap-4 md:grid md:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200" />)}</div></>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/50 px-5 py-10 text-center">
          <Shapes className="mx-auto h-8 w-8 text-[#B76E79]" />
          <p className="mt-3 text-sm font-semibold text-gray-800">{t('home.categories_unavailable')}</p>
          <p className="mt-1 text-xs text-gray-500">{t('home.retry_collections_hint')}</p>
          {onRetry && <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />{t('common.retry')}</button>}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-3xl bg-[#f8f9fa] px-5 py-10 text-center text-sm text-gray-500">{t('home.collections_coming')}</div>
      ) : (
        <>
          <div className="scrollbar-hide scroll-smooth-ios -mx-4 grid auto-cols-[88px] grid-flow-col grid-rows-2 gap-3 overflow-x-auto px-4 pb-2 touch-pan-x md:hidden">
            {categories.map((category) => (
              <button key={category.id} type="button" onClick={() => router.push(`/products?category=${encodeURIComponent(category.slug)}`)} className="flex h-20 w-[88px] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border border-gray-100 bg-white px-1 text-center shadow-sm transition-colors active:bg-rose-50">
                <span className="text-3xl" aria-hidden="true">{categoryIcons[category.slug] || category.icon || ''}</span>
                <span className="w-full truncate text-xs font-medium leading-tight text-gray-700">{category.name}</span>
              </button>
            ))}
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 6).map((category) => (
              <button key={category.id} type="button" onClick={() => router.push(`/products?category=${encodeURIComponent(category.slug)}`)} className="group relative aspect-square overflow-hidden rounded-2xl bg-[#f4e8ea] text-left shadow-[0_7px_24px_rgba(26,26,26,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(183,110,121,0.18)]">
                {category.image ? <img src={category.image} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" /> : <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#f9edef] to-[#e8cdd2]"><span className="text-5xl" aria-hidden="true">{categoryIcons[category.slug] || ''}</span></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <span className="text-xl drop-shadow" aria-hidden="true">{categoryIcons[category.slug] || category.icon || ''}</span>
                  <h3 className="mt-1 text-base font-extrabold text-white">{category.name}</h3>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-white/70">{t('home.products_count', { count: category._count?.products ?? 0 })}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-white transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
