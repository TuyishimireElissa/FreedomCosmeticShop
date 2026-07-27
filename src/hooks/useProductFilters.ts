'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface ProductFilters {
  search: string
  category: string
  brand: string
  minPrice: string
  maxPrice: string
  skinType: string
  hairType: string
  inStock: boolean
  sort: string
  shade: string
  minRating: string
  page: string
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  search: '',
  category: '',
  brand: '',
  minPrice: '',
  maxPrice: '',
  skinType: '',
  hairType: '',
  inStock: false,
  sort: 'relevance',
  shade: '',
  minRating: '',
  page: '1',
}

const ACTIVE_FILTER_KEYS: Array<keyof ProductFilters> = [
  'category', 'brand', 'minPrice', 'maxPrice', 'skinType', 'hairType', 'inStock', 'shade', 'minRating',
]

export function readProductFilters(params: Pick<URLSearchParams, 'get'>): ProductFilters {
  return {
    search: params.get('search') || '',
    category: params.get('category') || '',
    brand: params.get('brand') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    skinType: params.get('skinType') || '',
    hairType: params.get('hairType') || '',
    inStock: params.get('inStock') === 'true',
    sort: params.get('sort') || 'relevance',
    shade: params.get('shade') || '',
    minRating: params.get('minRating') || '',
    page: params.get('page') || '1',
  }
}

function isDefaultValue(key: keyof ProductFilters, value: string | boolean) {
  return value === '' || value === false || (key === 'sort' && value === 'relevance') || (key === 'page' && value === '1')
}

export function updateProductFilterParams(
  current: URLSearchParams,
  updates: Partial<ProductFilters>,
  resetPage = true,
) {
  const next = new URLSearchParams(current.toString())
  for (const [rawKey, rawValue] of Object.entries(updates)) {
    const key = rawKey as keyof ProductFilters
    if (rawValue === undefined || isDefaultValue(key, rawValue)) next.delete(key)
    else next.set(key, String(rawValue))
  }
  if (resetPage && !Object.prototype.hasOwnProperty.call(updates, 'page')) next.delete('page')
  return next
}

export function useProductFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const serializedParams = searchParams.toString()
  const filters = useMemo(() => readProductFilters(new URLSearchParams(serializedParams)), [serializedParams])
  const activeFilterCount = useMemo(() => ACTIVE_FILTER_KEYS.filter((key) => Boolean(filters[key])).length, [filters])

  const navigate = useCallback((params: URLSearchParams) => {
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router])

  const setFilter = useCallback(<K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => {
    navigate(updateProductFilterParams(new URLSearchParams(serializedParams), { [key]: value }, key !== 'page'))
  }, [navigate, serializedParams])

  const setFilters = useCallback((updates: Partial<ProductFilters>) => {
    navigate(updateProductFilterParams(new URLSearchParams(serializedParams), updates))
  }, [navigate, serializedParams])

  const clearFilter = useCallback((key: keyof ProductFilters) => {
    const updates: Partial<ProductFilters> = { [key]: DEFAULT_PRODUCT_FILTERS[key] }
    if (key === 'minPrice' || key === 'maxPrice') {
      updates.minPrice = ''
      updates.maxPrice = ''
    }
    navigate(updateProductFilterParams(new URLSearchParams(serializedParams), updates))
  }, [navigate, serializedParams])

  const clearAllFilters = useCallback(() => {
    const next = new URLSearchParams()
    if (filters.search) next.set('search', filters.search)
    navigate(next)
  }, [filters.search, navigate])

  const buildApiQuery = useCallback(() => {
    const next = new URLSearchParams()
    for (const [rawKey, value] of Object.entries(filters)) {
      const key = rawKey as keyof ProductFilters
      if (!isDefaultValue(key, value)) next.set(key, String(value))
    }
    return next.toString()
  }, [filters])

  return { filters, activeFilterCount, setFilter, setFilters, clearAllFilters, clearFilter, buildApiQuery }
}
