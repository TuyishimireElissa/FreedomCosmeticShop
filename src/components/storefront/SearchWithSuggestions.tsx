'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, Loader2, Search, Tag, TrendingUp, X } from 'lucide-react'
import { formatRWF } from '@/lib/format'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  getAlternativeSuggestions,
  getSearchSuggestions,
  POPULAR_PRICE_SEARCHES,
  trackZeroResultSearch,
} from '@/lib/search-vocabulary'

interface ProductSuggestion {
  id: string
  name: string
  slug: string
  price: number
  image: string | null
  imageUrl?: string | null
  imageAlt?: string
  imageAltRw?: string | null
  brand: string | null
  brandName?: string | null
  categoryName?: string | null
}

interface SuggestionResponse {
  products: ProductSuggestion[]
  categories: { id: string; name: string; slug: string }[]
  brands: { id: string; name: string; slug: string }[]
}

interface SearchWithSuggestionsProps {
  className?: string
  placeholder?: string
  autoFocus?: boolean
  onSearch?: (query: string) => void
  variant?: 'navbar' | 'page' | 'hero'
}

const RECENT_SEARCHES_KEY = 'fcs_recent_searches'
const SEARCH_SESSION_KEY = 'fcs_search_session'
const POPULAR_SEARCH_CACHE_KEY = 'fcs_popular_searches'
const CACHE_PREFIX = 'fcs_suggestions_'
const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_RECENT = 8
const EMPTY_RESPONSE: SuggestionResponse = { products: [], categories: [], brands: [] }

function getSearchSessionId() {
  try {
    const existing = sessionStorage.getItem(SEARCH_SESSION_KEY)
    if (existing) return existing
    const created = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(SEARCH_SESSION_KEY, created)
    return created
  } catch {
    return undefined
  }
}

export function SearchWithSuggestions({
  className = '',
  placeholder,
  autoFocus = false,
  onSearch,
  variant = 'navbar',
}: SearchWithSuggestionsProps) {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const trackedZeroQueries = useRef(new Set<string>())

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
      setRecentSearches(Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string').slice(0, MAX_RECENT) : [])
    } catch {
      setRecentSearches([])
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const loadPopular = async () => {
      try {
        const cachedValue = sessionStorage.getItem(POPULAR_SEARCH_CACHE_KEY)
        if (cachedValue) {
          const cached = JSON.parse(cachedValue) as { timestamp: number; data: string[] }
          if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            setPopularSearches(cached.data)
            return
          }
        }
        const response = await fetch('/api/search/popular', { signal: controller.signal })
        if (!response.ok) return
        const result = await response.json()
        const searches = (result.data || []).map((entry: { query?: unknown }) => entry.query).filter((value: unknown): value is string => typeof value === 'string').slice(0, 6)
        setPopularSearches(searches)
        sessionStorage.setItem(POPULAR_SEARCH_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: searches }))
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setPopularSearches([])
      }
    }
    void loadPopular()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const syncFromUrl = () => {
      if (window.location.pathname === '/products') {
        setQuery(new URLSearchParams(window.location.search).get('search') || '')
      }
    }
    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])

  const saveRecentSearch = useCallback((term: string) => {
    const normalized = term.trim()
    if (!normalized) return
    setRecentSearches((current) => {
      const updated = [normalized, ...current.filter((item) => item.toLocaleLowerCase('rw-RW') !== normalized.toLocaleLowerCase('rw-RW'))].slice(0, MAX_RECENT)
      try { sessionStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const clearRecentSearches = () => {
    try { sessionStorage.removeItem(RECENT_SEARCHES_KEY) } catch {}
    setRecentSearches([])
  }

  useEffect(() => {
    const normalized = query.trim()
    setActiveIndex(-1)
    if (normalized.length < 2) {
      abortRef.current?.abort()
      setSuggestions(null)
      setLoading(false)
      return
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const cacheKey = `${CACHE_PREFIX}${normalized.toLocaleLowerCase('rw-RW')}`
      try {
        const cachedValue = sessionStorage.getItem(cacheKey)
        if (cachedValue) {
          const cached = JSON.parse(cachedValue) as { timestamp: number; data: SuggestionResponse }
          if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            setSuggestions(cached.data)
            setLoading(false)
            return
          }
          sessionStorage.removeItem(cacheKey)
        }
      } catch {}

      setLoading(true)
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(normalized)}`, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('suggestions unavailable')
        const result = await response.json()
        const products = (result.products || result.data?.suggestions || []).slice(0, 6)
        const categories = (result.categories || []).slice(0, Math.max(0, 6 - products.length))
        const brands = (result.brands || []).slice(0, Math.max(0, 6 - products.length - categories.length))
        const data: SuggestionResponse = { products, categories, brands }
        setSuggestions(data)
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data })) } catch {}
        const hasNoResults = data.products.length === 0 && data.categories.length === 0 && data.brands.length === 0
        const trackingKey = normalized.toLocaleLowerCase('rw-RW')
        if (hasNoResults && !trackedZeroQueries.current.has(trackingKey)) {
          trackedZeroQueries.current.add(trackingKey)
          void trackZeroResultSearch(normalized, undefined, getSearchSessionId())
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setSuggestions(EMPTY_RESPONSE)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [query])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const navigateToSearch = useCallback((term: string) => {
    const normalized = term.trim()
    if (!normalized) return
    saveRecentSearch(normalized)
    setIsOpen(false)
    setActiveIndex(-1)
    if (onSearch) {
      onSearch(normalized)
      return
    }
    const onProductsPage = typeof window !== 'undefined' && window.location.pathname === '/products'
    const params = new URLSearchParams(onProductsPage ? window.location.search : '')
    params.set('search', normalized)
    params.delete('page')
    router.push(`/products?${params.toString()}`)
  }, [onSearch, router, saveRecentSearch])

  const navigateToProduct = (product: ProductSuggestion) => {
    saveRecentSearch(query)
    setIsOpen(false)
    router.push(`/products/${product.slug}`)
  }

  const selectableItems = useMemo(() => [
    ...(suggestions?.products || []).map((product) => ({ type: 'product' as const, value: product })),
    ...(suggestions?.categories || []).map((category) => ({ type: 'category' as const, value: category })),
    ...(suggestions?.brands || []).map((brand) => ({ type: 'brand' as const, value: brand })),
  ], [suggestions])

  const activateItem = (index: number) => {
    const item = selectableItems[index]
    if (!item) return navigateToSearch(query)
    if (item.type === 'product') return navigateToProduct(item.value)
    const params = new URLSearchParams()
    params.set(item.type, item.value.slug)
    router.push(`/products?${params.toString()}`)
    setIsOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.min(index + 1, selectableItems.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      activateItem(activeIndex)
    } else if (event.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
    }
  }

  const showEmptyMenu = isOpen && query.trim().length < 2
  const showResults = isOpen && query.trim().length >= 2
  const hasResults = Boolean(suggestions && (suggestions.products.length || suggestions.categories.length || suggestions.brands.length))
  const localSuggestions = showResults ? getSearchSuggestions(query, 5) : []
  const alternatives = showResults && !loading && suggestions && !hasResults ? getAlternativeSuggestions(query, language === 'rw' ? 'rw' : 'en') : []
  let optionIndex = 0

  return (
    <div ref={containerRef} className={`relative ${className}`} role="search">
      <div className="relative">
        {loading ? <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#B76E79]" /> : <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />}
        <input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(event) => { setQuery(event.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('search.placeholder')}
          className={`w-full rounded-2xl border-2 border-gray-200 bg-white pl-10 pr-11 text-base text-gray-900 outline-none transition-colors focus:border-[#B76E79] ${variant === 'hero' || variant === 'page' ? 'min-h-[52px] py-3' : 'min-h-11 py-2'}`}
          aria-label={t('common.search')}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="search-suggestions-listbox"
          aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
        />
        {query && <button type="button" onClick={() => { setQuery(''); setSuggestions(null); setActiveIndex(-1); inputRef.current?.focus() }} className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-gray-400 hover:bg-gray-100" aria-label={t('common.clear')}><X className="h-4 w-4" /></button>}
      </div>

      {isOpen && (showEmptyMenu || showResults) && (
        <div id="search-suggestions-listbox" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-xl">
          {showEmptyMenu && <div className="space-y-4 p-3">
            {recentSearches.length > 0 && <section><div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500"><Clock className="h-3 w-3" />{t('search.recent')}</p><button type="button" onClick={clearRecentSearches} className="min-h-8 px-2 text-xs text-gray-500">{t('search.clear_recent')}</button></div><div className="flex flex-wrap gap-2">{recentSearches.slice(0, 5).map((term) => <button key={term} type="button" onClick={() => { setQuery(term); navigateToSearch(term) }} className="min-h-9 rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-700">{term}</button>)}</div></section>}
            {popularSearches.length > 0 && <section><p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500"><TrendingUp className="h-3 w-3" />{t('search.popular')}</p><div className="flex flex-wrap gap-2">{popularSearches.map((term) => <button key={term} type="button" onClick={() => { setQuery(term); navigateToSearch(term) }} className="min-h-9 rounded-full bg-rose-50 px-3 text-xs font-medium text-[#B76E79]">{term}</button>)}</div></section>}
            <section><p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500"><Tag className="h-3 w-3" />{t('search.price_searches')}</p><div className="flex flex-wrap gap-2">{POPULAR_PRICE_SEARCHES.map((price) => <button key={price.maxPrice} type="button" onClick={() => { setQuery(price.query); navigateToSearch(price.query) }} className="min-h-9 rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-700">{t('search.price_under', { price: price.maxPrice.toLocaleString('en-RW') })}</button>)}</div></section>
          </div>}

          {showResults && loading && <div className="flex items-center gap-2 p-4 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin text-[#B76E79]" />{t('search.searching')}</div>}

          {showResults && !loading && suggestions && <>
            {localSuggestions.length > 0 && <div className="border-b p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{t('search.local_terms')}</p><div className="flex flex-wrap gap-2">{localSuggestions.map((term) => <button key={term} type="button" onClick={() => { setQuery(term); navigateToSearch(term) }} className="min-h-9 rounded-full bg-rose-50 px-3 text-xs font-medium text-[#B76E79]">{term}</button>)}</div></div>}

            {hasResults ? <div className="p-2">
              {suggestions.products.length > 0 && <section><p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">{t('nav.products')}</p>{suggestions.products.slice(0, 6).map((product) => { const index = optionIndex++; const image = product.imageUrl || product.image; const alt = language === 'rw' && product.imageAltRw ? product.imageAltRw : product.imageAlt || product.name; return <button id={`search-option-${index}`} role="option" aria-selected={activeIndex === index} key={product.id} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => navigateToProduct(product)} className={`flex min-h-16 w-full items-center gap-3 rounded-xl p-2 text-left ${activeIndex === index ? 'bg-rose-50' : 'hover:bg-gray-50'}`}><span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100">{image && <Image src={image} alt={alt} fill sizes="48px" className="object-contain p-1" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-900">{product.name}</span><span className="block truncate text-xs text-gray-500">{product.brandName || product.brand}{product.categoryName ? ` · ${product.categoryName}` : ''}</span></span><span className="shrink-0 text-sm font-bold text-[#B76E79]">{formatRWF(product.price)}</span></button>})}</section>}
              {suggestions.categories.length > 0 && <section className="mt-1 border-t pt-1"><p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">{t('nav.categories')}</p>{suggestions.categories.map((category) => { const index = optionIndex++; return <button id={`search-option-${index}`} role="option" aria-selected={activeIndex === index} key={category.id} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => activateItem(index)} className={`flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-sm ${activeIndex === index ? 'bg-rose-50' : 'hover:bg-gray-50'}`}><span>{category.name}</span><ArrowRight className="h-4 w-4 text-gray-400" /></button>})}</section>}
              {suggestions.brands.length > 0 && <section className="mt-1 border-t pt-1"><p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">{t('nav.brands')}</p>{suggestions.brands.map((brand) => { const index = optionIndex++; return <button id={`search-option-${index}`} role="option" aria-selected={activeIndex === index} key={brand.id} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => activateItem(index)} className={`flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-sm ${activeIndex === index ? 'bg-rose-50' : 'hover:bg-gray-50'}`}><span>{brand.name}</span><ArrowRight className="h-4 w-4 text-gray-400" /></button>})}</section>}
              <button type="button" onClick={() => navigateToSearch(query)} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 border-t text-sm font-bold text-[#B76E79]">{t('search.view_all_results', { query })}<ArrowRight className="h-4 w-4" /></button>
            </div> : <div className="p-5"><p className="text-sm font-semibold text-gray-800">{t('search.no_results', { query })}</p><p className="mt-1 text-xs text-gray-500">{t('search.no_results_hint')}</p><div className="mt-3 flex flex-wrap gap-2">{alternatives.map((term) => <button key={term} type="button" onClick={() => { setQuery(term); navigateToSearch(term) }} className="min-h-9 rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-700">{term}</button>)}</div></div>}
          </>}
        </div>
      )}
    </div>
  )
}

export default SearchWithSuggestions
