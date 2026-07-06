"use client"

/**
 * Catalog view — product listing with filters and sorting.
 *
 * Features:
 *  - Category filter (All / Skincare / Makeup / Haircare)
 *  - Search bar (synced with the store's catalogSearch)
 *  - Sort dropdown (Newest, Price asc, Price desc, Top rated)
 *  - Price range filter (min / max)
 *  - Responsive: sidebar collapses on mobile into a Sheet
 *  - Result count + clear filters
 *  - Empty state
 */

import { useEffect, useState, useCallback } from "react"
import { useStore } from "@/store/useStore"
import { Product, Category } from "@/lib/types"
import { ProductCard } from "./ProductCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SlidersHorizontal, Search, X, PackageOpen } from "lucide-react"

type SortKey = "newest" | "price-asc" | "price-desc" | "rating"

export function CatalogView() {
  const { catalogCategory, catalogSearch, setCatalogSearch, clearCatalogSearch, goCatalog } =
    useStore()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>("newest")
  const [minPrice, setMinPrice] = useState<string>("")
  const [maxPrice, setMaxPrice] = useState<string>("")
  const [searchInput, setSearchInput] = useState(catalogSearch)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Sync search input when store value changes (e.g. from header)
  useEffect(() => {
    setSearchInput(catalogSearch)
  }, [catalogSearch])

  // Load categories once
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch((e) => console.error(e))
  }, [])

  // Load products when filters change
  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (catalogCategory) params.set("category", catalogCategory)
      if (catalogSearch) params.set("search", catalogSearch)
      params.set("sort", sort)
      if (minPrice) params.set("minPrice", minPrice)
      if (maxPrice) params.set("maxPrice", maxPrice)
      params.set("limit", "100")
      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      setProducts(data.products || [])
    } catch (e) {
      console.error("Failed to load products:", e)
    } finally {
      setLoading(false)
    }
  }, [catalogCategory, catalogSearch, sort, minPrice, maxPrice])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCatalogSearch(searchInput.trim())
  }

  const clearAllFilters = () => {
    clearCatalogSearch()
    setMinPrice("")
    setMaxPrice("")
    setSort("newest")
    goCatalog(null)
  }

  const hasActiveFilters =
    catalogCategory || catalogSearch || minPrice || maxPrice || sort !== "newest"

  // Build the filter panel content (reused in sidebar and mobile sheet)
  const FilterPanel = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-foreground/70 mb-3 text-sm font-semibold tracking-wider uppercase">
          Category
        </h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              goCatalog(null)
              setFiltersOpen(false)
            }}
            className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !catalogCategory ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            }`}
          >
            All categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                goCatalog(c.slug)
                setFiltersOpen(false)
              }}
              className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                catalogCategory === c.slug
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary"
              }`}
            >
              {c.name}
              <span className="ml-1 text-xs opacity-70">({c._count?.products || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-foreground/70 mb-3 text-sm font-semibold tracking-wider uppercase">
          Price range (RWF)
        </h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-9"
            min="0"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-9"
            min="0"
          />
        </div>
        <p className="text-muted-foreground mt-1.5 text-xs">Filter products by price.</p>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <Button variant="outline" className="w-full" onClick={clearAllFilters}>
          <X className="mr-1.5 h-4 w-4" /> Clear all filters
        </Button>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {catalogCategory
            ? categories.find((c) => c.slug === catalogCategory)?.name || "Catalog"
            : "All products"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {loading
            ? "Loading products..."
            : `${products.length} product${products.length !== 1 ? "s" : ""} found`}
          {catalogSearch && (
            <>
              {" "}
              for <span className="font-medium">&ldquo;{catalogSearch}&rdquo;</span>
            </>
          )}
        </p>
      </div>

      {/* Search bar (above grid on mobile, in toolbar on desktop) */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 pr-9 pl-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("")
                clearCatalogSearch()
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Sort */}
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-10 w-[160px] sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="rating">Top rated</SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile filter button */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-primary text-primary-foreground ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold">
                  !
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{FilterPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Two-column layout: sidebar + grid */}
      <div className="flex gap-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="bg-card sticky top-24 rounded-2xl border p-4">{FilterPanel}</div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed py-20 text-center">
              <PackageOpen className="text-muted-foreground/50 h-12 w-12" />
              <h3 className="mt-4 text-lg font-semibold">No products found</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Try adjusting your filters or search.
              </p>
              <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
