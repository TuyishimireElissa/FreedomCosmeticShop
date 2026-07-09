"use client"

/**
 * SearchWithSuggestions — search input with autocomplete dropdown.
 *
 * Features:
 *   - Debounced search (300ms)
 *   - Shows product suggestions with image + price
 *   - Shows category + brand matches
 *   - Recent searches from localStorage
 *   - Keyboard navigation (arrow keys + Enter)
 *   - Click outside to close
 *   - Mobile-friendly (full-width dropdown)
 */

import { useEffect, useRef, useState } from "react"
import { useStore } from "@/store/useStore"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, X, Clock, TrendingUp, ArrowRight } from "lucide-react"

interface Suggestion {
  products: {
    id: string
    name: string
    slug: string
    price: number
    image: string | null
    brand: string | null
  }[]
  categories: { id: string; name: string; slug: string }[]
  brands: { id: string; name: string; slug: string }[]
}

const RECENT_SEARCHES_KEY = "freedom-recent-searches"
const MAX_RECENT = 5
const TRENDING_SEARCHES = ["Vitamin C", "Sunscreen", "Foundation", "Hair oil", "Lipstick"]

interface SearchWithSuggestionsProps {
  className?: string
  /** Placeholder text */
  placeholder?: string
}

export function SearchWithSuggestions({
  className = "",
  placeholder = "Search products...",
}: SearchWithSuggestionsProps) {
  const { goCatalog, setCatalogSearch, goProduct } = useStore()

  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Load recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      setRecentSearches(stored ? JSON.parse(stored) : [])
    } catch {
      setRecentSearches([])
    }
  }, [])

  // Save recent search
  const saveRecentSearch = (q: string) => {
    if (!q.trim()) return
    const updated = [
      q,
      ...recentSearches.filter((s) => s.toLowerCase() !== q.toLowerCase()),
    ].slice(0, MAX_RECENT)
    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setSuggestions(null)
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
        }
      } catch (e) {
        console.error("Search suggestions error:", e)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSubmit = (q?: string) => {
    const searchTerm = (q ?? query).trim()
    if (!searchTerm) return
    saveRecentSearch(searchTerm)
    setCatalogSearch(searchTerm)
    goCatalog()
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleProductClick = (slug: string) => {
    saveRecentSearch(query)
    goProduct(slug)
    setIsOpen(false)
    setQuery("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    const totalItems =
      (suggestions?.products?.length || 0) +
      (suggestions?.categories?.length || 0) +
      (suggestions?.brands?.length || 0)

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex === -1) {
        handleSubmit()
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const hasResults =
    suggestions &&
    (suggestions.products.length > 0 ||
      suggestions.categories.length > 0 ||
      suggestions.brands.length > 0)

  const showRecent = isOpen && query.length < 2 && recentSearches.length > 0
  const showTrending = isOpen && query.length < 2
  const showResults = isOpen && query.length >= 2

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-9 rounded-full pl-9 pr-9"
          aria-label="Search products"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setSuggestions(null)
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (showRecent || showTrending || showResults) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border bg-card shadow-lg ub-scroll">
          {/* Loading */}
          {loading && (
            <div className="p-4">
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          )}

          {/* Recent searches */}
          {showRecent && !loading && (
            <div className="border-b p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> Recent searches
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s)
                      handleSubmit(s)
                    }}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/70"
                  >
                    {s}
                  </button>
                ))}
                <button
                  onClick={() => {
                    localStorage.removeItem(RECENT_SEARCHES_KEY)
                    setRecentSearches([])
                  }}
                  className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Trending */}
          {showTrending && !loading && (
            <div className="p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> Trending
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_SEARCHES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s)
                      handleSubmit(s)
                    }}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/70"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {showResults && !loading && (
            <>
              {hasResults ? (
                <div className="p-2">
                  {/* Products */}
                  {suggestions!.products.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Products
                      </p>
                      {suggestions!.products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleProductClick(p.slug)}
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary/50"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary/30">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                            {p.brand && (
                              <p className="text-xs text-muted-foreground">{p.brand}</p>
                            )}
                          </div>
                          <span className="text-sm font-semibold">
                            RWF {p.price.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Categories */}
                  {suggestions!.categories.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Categories
                      </p>
                      {suggestions!.categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            useStore.getState().goCatalog(c.slug)
                            setIsOpen(false)
                          }}
                          className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm hover:bg-secondary/50"
                        >
                          <span>{c.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Brands */}
                  {suggestions!.brands.length > 0 && (
                    <div>
                      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Brands
                      </p>
                      {suggestions!.brands.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            useStore.getState().goCatalog(null)
                            setIsOpen(false)
                          }}
                          className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm hover:bg-secondary/50"
                        >
                          <span>{b.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* View all results */}
                  <button
                    onClick={() => handleSubmit()}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary p-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    View all results for &ldquo;{query}&rdquo;
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different search term or browse categories.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
