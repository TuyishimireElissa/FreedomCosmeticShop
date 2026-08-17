'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { categoryLabel } from '@/lib/category-i18n-map'
import type { Brand, Category, Product } from '@/lib/types'
import ProductGrid from '@/components/products/ProductGrid'
import FilterSidebar from '@/components/products/FilterSidebar'
import MobileFilters from '@/components/products/MobileFilters'
import FilterChips from '@/components/products/FilterChips'
import CategoryQuickJumps from '@/components/products/CategoryQuickJumps'
import RelatedSearches from '@/components/products/RelatedSearches'
import SearchWithSuggestions from '@/components/storefront/SearchWithSuggestions'
import { useProductFilters } from '@/hooks/useProductFilters'
import { useFacets } from '@/hooks/use-facets'
import { useLanguage, useT } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'
import { useLowData } from '@/contexts/LowDataContext'
import StructuredData from '@/components/seo/StructuredData'
import { getItemListSchema } from '@/lib/structured-data'
import { getProductPrimaryImage } from '@/lib/cloudinary-images'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import BannerCarousel from '@/components/banner/BannerCarousel'
import { EVENTS, trackEvent } from '@/lib/analytics'
import { useStore } from '@/store/useStore'
import { wholesaleWhatsAppNumber } from '@/lib/wholesale-whatsapp'

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

const LOW_DATA_PAGE_SIZE = 8
const NORMAL_PAGE_SIZE = 12


const EMPTY_PAGINATION: Pagination = { page: 1, pageSize: NORMAL_PAGE_SIZE, total: 0, totalPages: 0, hasMore: false }

export default function ProductsPageClient() {
  return <Suspense fallback={<ProductsPageSkeleton />}><ProductsContent /></Suspense>
}

function ProductsContent() {
  const t = useT()
  const { language } = useLanguage()
  const user = useStore((state) => state.user)
  const isWholesale = user?.wholesaleStatus === 'APPROVED'
  const { isLowData } = useLowData()
  const { filters, setFilter, buildApiQuery, clearAllFilters, activeFilterCount } = useProductFilters()
  // Already fetched for the filter sidebar; reused here so the quick-jump
  // pills cost no extra request.
  const { facets } = useFacets()
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
        const nextPagination = result.pagination || result.data?.pagination || EMPTY_PAGINATION
        setPagination(nextPagination)
        if (filters.search && page === 1 && nextPagination.total === 0) {
          void trackEvent({ event: EVENTS.ZERO_RESULT_SEARCH, path: '/products', metadata: { resultCount: 0, source: 'automatic' } })
        }
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : t('errors.products_load_failed')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [apiQuery, filters.search, page, request, requestSignature, t])

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
  // Was keyed off a local map whose `mens` entry never matched the real
  // `mens-grooming` slug, so that breadcrumb always fell back to English.
  const categoryName = filters.category
    ? selectedCategory
      ? categoryLabel(selectedCategory, t, language)
      : filters.category
    : null
  /**
   * Show Coming Soon instead of "no products match your filters", but only
   * when the shopper genuinely did nothing wrong:
   *   - a category is selected, and we recognise its slug
   *   - that category reports zero buyable products
   *   - there is no search term
   *   - no other filter is narrowing the list (category itself counts as one)
   * Any of those missing means the empty result really is the filters, and
   * the existing message is the correct one.
   */
  const comingSoonCategory = (() => {
    if (!filters.category || !selectedCategory) return null
    if (filters.search) return null
    if (activeFilterCount > 1) return null
    if ((selectedCategory._count?.products ?? 0) > 0) return null
    // `_count` only counts stock > 0, so a sold-out category looks identical
    // to one that was never stocked. `totalProducts` (when the API supplies
    // it) counts rows regardless of stock, which separates the two.
    const everStocked = (selectedCategory as { totalProducts?: number }).totalProducts ?? 0
    return { name: categoryName || selectedCategory.name, soldOut: everStocked > 0 }
  })()

  /**
   * Offer to source the item only when the search itself is what came up
   * empty. A filter narrowing a search to zero is still a filter problem, and
   * the existing "clear filters" message is the right answer there.
   *
   * DidYouMean already handles the misspelling case and probes before it
   * renders, so it stays visible in the generic state; this panel is for a
   * query that is spelled fine and simply is not stocked.
   */
  const rfqQuery = filters.search && activeFilterCount === 0 ? filters.search.trim() : null

  /**
   * Categories this search actually hit, for the quick-jump pills.
   *
   * Source-gated, per rule 20. Only shown when a search term produced results
   * across several categories — never for a bare catalogue browse, where the
   * pills would just duplicate the sidebar, and never on an empty result,
   * where the Coming Soon or sourcing panel owns the space.
   *
   * Facet counts carry id/name/slug/count but NOT nameRw, so the Kinyarwanda
   * label is joined from the categories already fetched for the sidebar. A
   * facet with no matching row still renders: categoryLabel falls back to the
   * i18n key and then to the English name, so a pill can never come out blank.
   */
  const quickJumpCategories = filters.search && products.length > 0
    ? facets.categories
        .filter((entry) => entry.count > 0 && entry.slug)
        .map((entry) => {
          const known = categories.find((category) => category.slug === entry.slug)
          return { ...entry, slug: entry.slug as string, nameRw: known?.nameRw ?? null }
        })
    : []

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
      <div className="relative">
        <BannerCarousel placement="CATEGORY_TOP" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-white/45 backdrop-blur-sm">
          <div className="pointer-events-auto mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        </div>
        <header className="custom-banner-slider__scrim pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-8 pt-20 sm:pb-10">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
            <span className="custom-banner-slider__heading-text custom-banner-slider__heading-line custom-banner-slider__heading-line--1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F5C6CE]">{t('search.catalog')}</span>
            <h1 className="custom-banner-slider__heading-text custom-banner-slider__heading-line custom-banner-slider__heading-line--2 mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">{t('categories.all')}</h1>
            <p className="custom-banner-slider__heading-text custom-banner-slider__heading-line custom-banner-slider__heading-line--3 mt-2 text-sm text-white/85">{loading ? t('search.loading_products') : t('search.products_found', { count: pagination.total })}</p>
          </div>
        </header>
      </div>

      {isWholesale && <div className="border-b border-violet-100 bg-violet-50"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"><div><p className="text-sm font-bold text-violet-900">You are viewing wholesale prices</p><p className="text-xs text-violet-700">{user?.businessName || user?.name} · All wholesale orders go through WhatsApp</p></div><a href={`https://wa.me/${wholesaleWhatsAppNumber(user?.assignedManagerWhatsApp)}?text=${encodeURIComponent('Muraho! Ndi umukiriya wa wholesale. Nshaka gutuma ibicuruzwa byinshi. Mwamfasha?')}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Order multiple products via WhatsApp</a></div></div>}

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 md:hidden"><SearchWithSuggestions variant="page" /></div>
        <FilterChips />

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-gray-500">{filters.search ? t('search.results', { count: pagination.total, query: filters.search }) : t('search.products_found', { count: pagination.total })}</p>
          <MobileFilters availableCategories={categories} availableBrands={brands} />
        </div>

        <div className="scrollbar-hide mb-5 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-semibold text-gray-500">{t('search.sort_by')}:</span>
          {sortOptions.map((option) => <button key={option.value} type="button" onClick={() => setFilter('sort', option.value)} className={cn('min-h-9 shrink-0 rounded-full px-3 text-xs font-bold transition-colors', filters.sort === option.value ? 'bg-fcs-brand text-white' : 'bg-white text-gray-700 hover:bg-gray-100')}>{option.label}</button>)}
        </div>

        <div className="flex items-start gap-5 lg:gap-6">
          <FilterSidebar availableCategories={categories} availableBrands={brands} className={filtersLoading ? 'animate-pulse opacity-60' : ''} />
          <main className="min-w-0 flex-1">
            <CategoryQuickJumps
              categories={quickJumpCategories}
              activeSlug={filters.category}
              onSelect={(slug) => setFilter('category', filters.category === slug ? '' : slug)}
            />
            <div id="product-results">
              <ProductGrid products={products} loading={loading && products.length === 0} error={products.length === 0 ? error : null} onRetry={() => setRequest((value) => value + 1)} onClearFilters={clearAllFilters} hasActiveFilters={activeFilterCount > 0 || Boolean(filters.search)} searchQuery={filters.search} onSearchCorrection={(term) => setFilter('search', term)} comingSoonCategory={comingSoonCategory} rfqQuery={rfqQuery} />
            </div>
            {/* Only under a search that produced results. On an empty grid the
                sourcing panel owns the space, and on a bare browse there is no
                "also searched" to relate to. */}
            {filters.search && products.length > 0 && (
              <RelatedSearches
                currentQuery={filters.search}
                onSelect={(term) => setFilter('search', term)}
              />
            )}
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
                    className="min-h-12 rounded-xl bg-fcs-brand-strong px-6 text-sm font-bold text-white transition-colors hover:bg-fcs-brand-strong-hover disabled:cursor-wait disabled:opacity-60"
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
