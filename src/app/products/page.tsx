'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Brand, Category, Product } from '@/lib/types'
import ProductGrid from '@/components/products/ProductGrid'
import ProductFilters, { type ProductFilterState } from '@/components/products/ProductFilters'

interface Pagination { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean }
const emptyFilters: ProductFilterState = { category: '', brand: '', minPrice: '', maxPrice: '', skinType: '', minRating: '', inStock: false }

export default function ProductsPage() {
  return <Suspense fallback={<ProductsPageSkeleton />}><ProductsContent /></Suspense>
}

function ProductsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState(0)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') || 1)))
  const [filters, setFilters] = useState<ProductFilterState>({
    category: searchParams.get('category') || '', brand: searchParams.get('brand') || '', minPrice: searchParams.get('minPrice') || '', maxPrice: searchParams.get('maxPrice') || '', skinType: searchParams.get('skinType') || '', minRating: searchParams.get('minRating') || '', inStock: searchParams.get('inStock') === 'true',
  })
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 18, total: 0, totalPages: 0, hasMore: false })

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController(); setFiltersLoading(true)
    Promise.all([
      fetch('/api/categories', { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json() }),
      fetch('/api/brands', { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json() }),
    ]).then(([categoryData, brandData]) => { setCategories(categoryData.categories || []); setBrands(brandData.brands || []) }).catch(() => {}).finally(() => { if (!controller.signal.aborted) setFiltersLoading(false) })
    return () => controller.abort()
  }, [])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filters.category) params.set('category', filters.category)
    if (filters.brand) params.set('brand', filters.brand)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.skinType) params.set('skinType', filters.skinType)
    if (filters.minRating) params.set('minRating', filters.minRating)
    if (filters.inStock) params.set('inStock', 'true')
    params.set('sort', sort); params.set('page', String(page)); params.set('pageSize', '18')
    return params
  }, [filters, page, search, sort])

  const loadProducts = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const response = await fetch(`/api/products?${query.toString()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Products are unavailable')
      const data = await response.json(); setProducts(data.products || []); setPagination(data.pagination || { page, pageSize: 18, total: 0, totalPages: 0, hasMore: false })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load products') }
    finally { setLoading(false) }
  }, [page, query])

  useEffect(() => { loadProducts() }, [loadProducts, request])
  useEffect(() => { router.replace(`/products?${query.toString()}`, { scroll: false }) }, [query, router])

  const changeFilters = (next: ProductFilterState) => { setFilters(next); setPage(1) }
  const clearFilters = () => { setFilters(emptyFilters); setSearch(''); setSearchInput(''); setSort('newest'); setPage(1) }
  const activeCount = Object.entries(filters).filter(([key, value]) => key === 'inStock' ? value : Boolean(value)).length

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="border-b border-gray-100 bg-white"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B76E79]">Authentic beauty · Rwanda</span><h1 className="mt-2 text-3xl font-black tracking-tight text-[#1a1a1a] sm:text-4xl">Shop all products</h1><p className="mt-2 text-sm text-gray-500">{loading ? 'Loading our collection…' : `${pagination.total} premium beauty product${pagination.total === 1 ? '' : 's'}`}</p></div></div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search skincare, makeup, brands…" className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-10 text-sm focus:border-[#B76E79]" />{searchInput && <button type="button" onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-4 w-4" /></button>}</label>
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 focus:border-[#B76E79]"><option value="newest">Newest first</option><option value="best-selling">Best selling</option><option value="rating">Top rated</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select>
          <button type="button" onClick={() => setMobileFilters(true)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-700 lg:hidden"><SlidersHorizontal className="h-4 w-4" />Filters {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#B76E79] px-1 text-[10px] text-white">{activeCount}</span>}</button>
        </div>

        <div className="flex items-start gap-6">
          <aside className="sticky top-40 hidden max-h-[calc(100vh-11rem)] w-64 shrink-0 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:block"><ProductFilters filters={filters} categories={categories} brands={brands} loading={filtersLoading} onChange={changeFilters} onClear={clearFilters} /></aside>
          <main className="min-w-0 flex-1"><ProductGrid products={products} loading={loading} error={error} onRetry={() => setRequest((value) => value + 1)} />
            {!loading && !error && pagination.totalPages > 1 && <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Product pages"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>{Array.from({ length: pagination.totalPages }, (_, index) => index + 1).filter((number) => number === 1 || number === pagination.totalPages || Math.abs(number - page) <= 1).map((number, index, visible) => <span key={number} className="contents">{index > 0 && number - visible[index - 1] > 1 && <span className="px-1 text-gray-400">…</span>}<button type="button" onClick={() => setPage(number)} className={`h-10 min-w-10 rounded-xl px-3 text-sm font-bold ${number === page ? 'bg-[#B76E79] text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{number}</button></span>)}<button type="button" onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages} className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></nav>}
          </main>
        </div>
      </div>

      {mobileFilters && <div className="fixed inset-0 z-[80] lg:hidden"><button type="button" className="absolute inset-0 bg-black/50" onClick={() => setMobileFilters(false)} aria-label="Close filters" /><aside className="absolute inset-y-0 left-0 w-[min(88vw,360px)] overflow-y-auto bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black">Filter products</h2><button type="button" onClick={() => setMobileFilters(false)} className="grid h-9 w-9 place-items-center rounded-full bg-gray-100"><X className="h-4 w-4" /></button></div><ProductFilters filters={filters} categories={categories} brands={brands} loading={filtersLoading} onChange={changeFilters} onClear={clearFilters} /><button type="button" onClick={() => setMobileFilters(false)} className="sticky bottom-0 mt-6 w-full rounded-xl bg-[#B76E79] py-3 text-sm font-bold text-white">Show {pagination.total} products</button></aside></div>}
    </div>
  )
}

function ProductsPageSkeleton() { return <div className="min-h-screen animate-pulse bg-[#f8f9fa] p-4"><div className="mx-auto mt-10 h-12 max-w-7xl rounded-2xl bg-gray-200" /></div> }
