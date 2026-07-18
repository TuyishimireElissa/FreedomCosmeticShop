'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { Brand, Category, Product } from '@/lib/types'
import ProductGrid from '@/components/products/ProductGrid'
import FilterSidebar from '@/components/products/FilterSidebar'
import MobileFilters from '@/components/products/MobileFilters'
import FilterChips from '@/components/products/FilterChips'
import SearchWithSuggestions from '@/components/storefront/SearchWithSuggestions'
import { useProductFilters } from '@/hooks/useProductFilters'
import { useT } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'
import { useLowData } from '@/contexts/LowDataContext'
import StructuredData from '@/components/seo/StructuredData'
import { getItemListSchema } from '@/lib/structured-data'
import { getProductPrimaryImage } from '@/lib/cloudinary-images'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

const LOW_DATA_PAGE_SIZE = 8
const NORMAL_PAGE_SIZE = 20

const CATEGORY_TRANSLATION_KEYS: Record<string, string> = {
  skincare: 'categories.skincare',
  haircare: 'categories.haircare',
  makeup: 'categories.makeup',
  fragrance: 'categories.fragrance',
  'body-care': 'categories.body_care',
  mens: 'categories.mens',
  natural: 'categories.natural',
}

const EMPTY_PAGINATION: Pagination = { page: 1, pageSize: NORMAL_PAGE_SIZE, total: 0, totalPages: 0, hasMore: false }

export default function ProductsPageClient() {
  return <Suspense fallback={<ProductsPageSkeleton />}><ProductsContent /></Suspense>
}

function ProductsContent() {
  const t = useT()
  const { isLowData } = useLowData()
  const { filters, setFilter, buildApiQuery } = useProductFilters()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState(0)
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)
  const lastProductRequest = useRef({ signature: '', page: 0 })
  const page = Math.max(1, Number(filters.page) || 1)
  const pageSize = isLowData ? LOW_DATA_PAGE_SIZE : NORMAL_PAGE_SIZE
  const previousPageSize = useRef(pageSize)

  useEffect(() => {
    if (previousPageSize.current === pageSize) return
    previousPageSize.current = pageSize
    lastProductRequest.current = { signature: '', page: 0 }
    setFilter('page', '1')
  }, [pageSize, setFilter])

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

  const { apiQuery, requestSignature } = useMemo(() => {
    const params = new URLSearchParams(buildApiQuery())
    params.set('pageSize', String(pageSize))
    const signatureParams = new URLSearchParams(params)
    signatureParams.delete('page')
    return {
      apiQuery: params.toString(),
      requestSignature: signatureParams.toString(),
    }
  }, [buildApiQuery, pageSize])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(`/api/products?${apiQuery}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(t('errors.products_load_failed')); return response.json() })
      .then((result) => {
        const rows: Product[] = result.products || result.data?.products || []
        const canAppend = page > 1
          && lastProductRequest.current.signature === requestSignature
          && lastProductRequest.current.page === page - 1
        setProducts((current) => {
          if (!canAppend) return rows
          const existingIds = new Set(current.map((product) => product.id))
          return [...current, ...rows.filter((product) => !existingIds.has(product.id))]
        })
        lastProductRequest.current = { signature: requestSignature, page }
        setPagination(result.pagination || result.data?.pagination || EMPTY_PAGINATION)
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : t('errors.products_load_failed')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [apiQuery, page, request, requestSignature, t])

  const sortOptions = [
    { value: 'relevance', label: t('search.sort_relevance') },
    { value: 'best_selling', label: t('search.sort_best_selling') },
    { value: 'newest', label: t('search.sort_newest') },
    { value: 'price_asc', label: t('search.sort_price_low') },
    { value: 'price_desc', label: t('search.sort_price_high') },
    { value: 'rating', label: t('search.sort_top_rated') },
  ]

  const selectedCategory = filters.category
    ? categories.find((category) => category.slug === filters.category)
    : undefined
  const categoryName = filters.category
    ? CATEGORY_TRANSLATION_KEYS[filters.category]
      ? t(CATEGORY_TRANSLATION_KEYS[filters.category])
      : selectedCategory?.name || filters.category
    : null
  const breadcrumbItems = [
    { name: t('nav.products'), url: '/products' },
    ...(categoryName && filters.category
      ? [{ name: categoryName, url: `/products?category=${encodeURIComponent(filters.category)}` }]
      : []),
  ]

  const itemListSchema = products.length > 0
    ? getItemListSchema(products.map((product) => {
      const image = getProductPrimaryImage(product)
      return {
        name: product.name,
        url: `/products/${product.slug}`,
        image: image?.url,
        price: product.price,
      }
    }))
    : null

  return (
    <>
      {itemListSchema && <StructuredData data={itemListSchema} />}
      <div className="min-h-screen bg-[#f8f9fa]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbItems} />
      </div>
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
            <div id="product-results">
              <ProductGrid products={products} loading={loading && products.length === 0} error={products.length === 0 ? error : null} onRetry={() => setRequest((value) => value + 1)} />
            </div>
            {error && products.length > 0 && <p role="alert" className="mt-4 text-center text-sm text-red-700">{error}</p>}
            {!error && products.length > 0 && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-sm text-gray-500" aria-live="polite">
                  {t('search.showing_products', { shown: products.length, total: pagination.total })}
                </p>
                {pagination.hasMore && (
                  <button
                    type="button"
                    onClick={() => setFilter('page', String(page + 1))}
                    disabled={loading}
                    aria-controls="product-results"
                    className="min-h-12 rounded-xl bg-[#B76E79] px-6 text-sm font-bold text-white transition-colors hover:bg-[#a55d68] disabled:cursor-wait disabled:opacity-60"
                  >
                    {loading ? t('search.loading_more_products') : t('search.load_more_products')}
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
    </>
  )
}

function ProductsPageSkeleton() {
  return <div className="min-h-screen animate-pulse bg-[#f8f9fa] p-4"><div className="mx-auto mt-10 h-12 max-w-7xl rounded-2xl bg-gray-200" /></div>
}
