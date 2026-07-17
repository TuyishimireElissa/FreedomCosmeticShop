'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Brand, Category, Product } from '@/lib/types'
import ProductGrid from '@/components/products/ProductGrid'
import FilterSidebar from '@/components/products/FilterSidebar'
import MobileFilters from '@/components/products/MobileFilters'
import FilterChips from '@/components/products/FilterChips'
import SearchWithSuggestions from '@/components/storefront/SearchWithSuggestions'
import { useProductFilters } from '@/hooks/useProductFilters'
import { useT } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'
import IconButton from '@/components/a11y/IconButton'

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

const EMPTY_PAGINATION: Pagination = { page: 1, pageSize: 18, total: 0, totalPages: 0, hasMore: false }

export default function ProductsPage() {
  return <Suspense fallback={<ProductsPageSkeleton />}><ProductsContent /></Suspense>
}

function ProductsContent() {
  const t = useT()
  const { filters, setFilter, buildApiQuery } = useProductFilters()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState(0)
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)

  useEffect(() => {
    const controller = new AbortController()
    setFiltersLoading(true)
    Promise.all([
      fetch('/api/categories', { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json() }),
      fetch('/api/brands', { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json() }),
    ])
      .then(([categoryData, brandData]) => {
        setCategories(categoryData.categories || categoryData.data || [])
        setBrands(brandData.brands || brandData.data || [])
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) { setCategories([]); setBrands([]) } })
      .finally(() => { if (!controller.signal.aborted) setFiltersLoading(false) })
    return () => controller.abort()
  }, [])

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams(buildApiQuery())
    params.set('pageSize', '18')
    return params.toString()
  }, [buildApiQuery])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(`/api/products?${apiQuery}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(t('errors.products_load_failed')); return response.json() })
      .then((result) => {
        setProducts(result.products || result.data?.products || [])
        setPagination(result.pagination || result.data?.pagination || EMPTY_PAGINATION)
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : t('errors.products_load_failed')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [apiQuery, request, t])

  const sortOptions = [
    { value: 'relevance', label: t('search.sort_relevance') },
    { value: 'best_selling', label: t('search.sort_best_selling') },
    { value: 'newest', label: t('search.sort_newest') },
    { value: 'price_asc', label: t('search.sort_price_low') },
    { value: 'price_desc', label: t('search.sort_price_high') },
    { value: 'rating', label: t('search.sort_top_rated') },
  ]
  const page = Math.max(1, Number(filters.page) || 1)

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B76E79]">{t('search.catalog')}</span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#1a1a1a] sm:text-4xl">{t('categories.all')}</h1>
          <p className="mt-2 text-sm text-gray-500">{loading ? t('search.loading_products') : t('search.products_found', { count: pagination.total })}</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 md:hidden"><SearchWithSuggestions variant="page" /></div>
        <FilterChips />

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-gray-500">{filters.search ? t('search.results', { count: pagination.total, query: filters.search }) : t('search.products_found', { count: pagination.total })}</p>
          <MobileFilters availableCategories={categories} availableBrands={brands} />
        </div>

        <div className="scrollbar-hide mb-5 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-semibold text-gray-500">{t('search.sort_by')}:</span>
          {sortOptions.map((option) => <button key={option.value} type="button" onClick={() => setFilter('sort', option.value)} className={cn('min-h-9 shrink-0 rounded-full px-3 text-xs font-bold transition-colors', filters.sort === option.value ? 'bg-[#B76E79] text-white' : 'bg-white text-gray-700 hover:bg-gray-100')}>{option.label}</button>)}
        </div>

        <div className="flex items-start gap-5 lg:gap-6">
          <FilterSidebar availableCategories={categories} availableBrands={brands} className={filtersLoading ? 'animate-pulse opacity-60' : ''} />
          <main className="min-w-0 flex-1">
            <ProductGrid products={products} loading={loading} error={error} onRetry={() => setRequest((value) => value + 1)} />
            {!loading && !error && pagination.totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-2" aria-label={t('ui.pagination')}>
                <IconButton label={t('ui.go_previous_page')} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setFilter('page', String(Math.max(1, page - 1)))} disabled={page <= 1} className="rounded-xl border border-gray-200 bg-white" />
                {Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
                  .filter((number) => number === 1 || number === pagination.totalPages || Math.abs(number - page) <= 1)
                  .map((number, index, visible) => <span key={number} className="contents">{index > 0 && number - visible[index - 1] > 1 && <span className="px-1 text-gray-400">…</span>}<button type="button" onClick={() => setFilter('page', String(number))} className={cn('h-11 min-w-11 rounded-xl px-3 text-sm font-bold', number === page ? 'bg-[#B76E79] text-white' : 'border border-gray-200 bg-white text-gray-600')}>{number}</button></span>)}
                <IconButton label={t('ui.go_next_page')} icon={<ChevronRight className="h-4 w-4" />} onClick={() => setFilter('page', String(Math.min(pagination.totalPages, page + 1)))} disabled={page >= pagination.totalPages} className="rounded-xl border border-gray-200 bg-white" />
              </nav>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function ProductsPageSkeleton() {
  return <div className="min-h-screen animate-pulse bg-[#f8f9fa] p-4"><div className="mx-auto mt-10 h-12 max-w-7xl rounded-2xl bg-gray-200" /></div>
}
