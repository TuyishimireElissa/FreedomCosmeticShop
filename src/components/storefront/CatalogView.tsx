"use client"

/**
 * CatalogView — product listing page with full filtering.
 *
 * Features:
 *   - Grid / List view toggle
 *   - Filters sidebar: category, brand, price range, skin type, rating, in-stock
 *   - Sort: newest, price asc/desc, rating, best-selling
 *   - Pagination (24 per page)
 *   - Active filter chips with remove option
 *   - Product count display
 *   - Empty state with suggestions
 *   - Mobile filters in a Sheet
 */

import { useEffect, useState, useCallback } from "react"
import { useStore } from "@/store/useStore"
import { Product, Category, Brand } from "@/lib/types"
import { ProductCard } from "./ProductCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  SlidersHorizontal,
  Search,
  X,
  LayoutGrid,
  List,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react"

type SortKey = "newest" | "price-asc" | "price-desc" | "rating" | "best-selling"
type ViewMode = "grid" | "list"

const SKIN_TYPES = [
  { value: "ALL", label: "All skin types" },
  { value: "OILY", label: "Oily" },
  { value: "DRY", label: "Dry" },
  { value: "COMBINATION", label: "Combination" },
  { value: "SENSITIVE", label: "Sensitive" },
  { value: "NORMAL", label: "Normal" },
]

const PRICE_PRESETS = [
  { label: "Under RWF 5,000", min: 0, max: 5000 },
  { label: "RWF 5,000 - 10,000", min: 5000, max: 10000 },
  { label: "RWF 10,000 - 15,000", min: 10000, max: 15000 },
  { label: "Over RWF 15,000", min: 15000, max: 100000 },
]

export function CatalogView() {
  const {
    catalogCategory,
    catalogSearch,
    setCatalogSearch,
    clearCatalogSearch,
    goCatalog,
  } = useStore()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  // Filters
  const [sort, setSort] = useState<SortKey>("newest")
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000])
  const [priceEnabled, setPriceEnabled] = useState(false)
  const [skinType, setSkinType] = useState<string>("")
  const [minRating, setMinRating] = useState<number>(0)
  const [inStockOnly, setInStockOnly] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasMore: false,
  })

  // UI state
  const [searchInput, setSearchInput] = useState(catalogSearch)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Sync search input
  useEffect(() => {
    setSearchInput(catalogSearch)
  }, [catalogSearch])

  // Load categories + brands once
  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/brands").then((r) => r.json()),
    ])
      .then(([cats, brs]) => {
        setCategories(cats.categories || [])
        setBrands(brs.brands || [])
      })
      .catch((e) => console.error(e))
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [
    catalogCategory,
    catalogSearch,
    sort,
    selectedBrand,
    priceEnabled,
    priceRange,
    skinType,
    minRating,
    inStockOnly,
  ])

  // Load products
  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (catalogCategory) params.set("category", catalogCategory)
      if (catalogSearch) params.set("search", catalogSearch)
      if (selectedBrand) params.set("brand", selectedBrand)
      params.set("sort", sort)
      if (priceEnabled) {
        params.set("minPrice", String(priceRange[0]))
        params.set("maxPrice", String(priceRange[1]))
      }
      if (skinType) params.set("skinType", skinType)
      if (minRating > 0) params.set("minRating", String(minRating))
      if (inStockOnly) params.set("inStock", "true")
      params.set("page", String(page))
      params.set("pageSize", "24")

      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      setProducts(data.products || [])
      setPagination({
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
        hasMore: data.pagination?.hasMore || false,
      })
    } catch (e) {
      console.error("Failed to load products:", e)
    } finally {
      setLoading(false)
    }
  }, [
    catalogCategory,
    catalogSearch,
    selectedBrand,
    priceEnabled,
    priceRange,
    skinType,
    minRating,
    inStockOnly,
    sort,
    page,
  ])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCatalogSearch(searchInput.trim())
  }

  const clearAllFilters = () => {
    clearCatalogSearch()
    setSelectedBrand("")
    setPriceEnabled(false)
    setPriceRange([0, 50000])
    setSkinType("")
    setMinRating(0)
    setInStockOnly(false)
    setSort("newest")
    goCatalog(null)
  }

  // Active filter chips
  const activeFilters: { label: string; onRemove: () => void }[] = []
  if (catalogCategory) {
    const cat = categories.find((c) => c.slug === catalogCategory)
    activeFilters.push({
      label: `Category: ${cat?.name || catalogCategory}`,
      onRemove: () => goCatalog(null),
    })
  }
  if (catalogSearch) {
    activeFilters.push({
      label: `Search: "${catalogSearch}"`,
      onRemove: () => clearCatalogSearch(),
    })
  }
  if (selectedBrand) {
    const br = brands.find((b) => b.slug === selectedBrand)
    activeFilters.push({
      label: `Brand: ${br?.name || selectedBrand}`,
      onRemove: () => setSelectedBrand(""),
    })
  }
  if (priceEnabled) {
    activeFilters.push({
      label: `RWF ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}`,
      onRemove: () => setPriceEnabled(false),
    })
  }
  if (skinType) {
    activeFilters.push({
      label: `Skin: ${skinType}`,
      onRemove: () => setSkinType(""),
    })
  }
  if (minRating > 0) {
    activeFilters.push({
      label: `${minRating}+ stars`,
      onRemove: () => setMinRating(0),
    })
  }
  if (inStockOnly) {
    activeFilters.push({
      label: "In stock only",
      onRemove: () => setInStockOnly(false),
    })
  }

  const hasActiveFilters = activeFilters.length > 0
  const currentCategoryName = catalogCategory
    ? categories.find((c) => c.slug === catalogCategory)?.name || "Catalog"
    : "All products"

  // ─── Filter panel (reused in sidebar + mobile sheet) ──────────────
  const FilterPanel = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/70">
          Category
        </h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              goCatalog(null)
              setFiltersOpen(false)
            }}
            className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !catalogCategory
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
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
              {c._count && (
                <span className="ml-1 text-xs opacity-70">({c._count.products})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/70">
            Brand
          </h3>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setSelectedBrand("")}
              className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                !selectedBrand ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              All brands
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBrand(b.slug)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedBrand === b.slug
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/70">
          Price range (RWF)
        </h3>
        <div className="mb-3 flex items-center gap-2">
          <Checkbox
            id="price-enable"
            checked={priceEnabled}
            onCheckedChange={(v) => setPriceEnabled(v === true)}
          />
          <Label htmlFor="price-enable" className="text-sm font-normal">
            Filter by price
          </Label>
        </div>
        {priceEnabled && (
          <>
            <div className="mb-3 px-1">
              <Slider
                value={priceRange}
                onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
                min={0}
                max={50000}
                step={500}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>RWF {priceRange[0].toLocaleString()}</span>
                <span>RWF {priceRange[1].toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {PRICE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setPriceRange([p.min, p.max])
                    setPriceEnabled(true)
                  }}
                  className="rounded-lg px-2 py-1 text-left text-xs text-foreground/70 hover:bg-secondary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Skin type */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/70">
          Skin type
        </h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setSkinType("")}
            className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !skinType ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            }`}
          >
            All skin types
          </button>
          {SKIN_TYPES.filter((s) => s.value !== "ALL").map((s) => (
            <button
              key={s.value}
              onClick={() => setSkinType(skinType === s.value ? "" : s.value)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                skinType === s.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/70">
          Minimum rating
        </h3>
        <div className="flex flex-col gap-1">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(r)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                minRating === r ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              {r === 0 ? (
                "All ratings"
              ) : (
                <>
                  <span className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= Math.round(r)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted"
                        }`}
                      />
                    ))}
                  </span>
                  <span>{r}+ stars</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* In stock */}
      <div className="flex items-center gap-2 rounded-lg bg-secondary/30 p-3">
        <Checkbox
          id="in-stock"
          checked={inStockOnly}
          onCheckedChange={(v) => setInStockOnly(v === true)}
        />
        <Label htmlFor="in-stock" className="text-sm font-normal">
          In stock only
        </Label>
      </div>

      {/* Clear all */}
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
          {currentCategoryName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? "Loading products..."
            : `${pagination.total} product${pagination.total !== 1 ? "s" : ""} found`}
          {catalogSearch && (
            <>
              {" "}for <span className="font-medium">&ldquo;{catalogSearch}&rdquo;</span>
            </>
          )}
        </p>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((f, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="flex items-center gap-1 py-1.5 pl-3 pr-1.5"
            >
              <span className="text-xs">{f.label}</span>
              <button
                onClick={f.onRemove}
                className="rounded-full p-0.5 hover:bg-background"
                aria-label={`Remove filter: ${f.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
            Clear all
          </Button>
        </div>
      )}

      {/* Search + sort + view toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 pl-9 pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("")
                clearCatalogSearch()
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
            <SelectItem value="best-selling">Best selling</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle (desktop) */}
        <div className="hidden items-center rounded-lg border sm:flex">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-10 w-10 rounded-r-none"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-10 w-10 rounded-l-none"
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile filter button */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilters.length}
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

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border bg-card p-4 ub-scroll">
            {FilterPanel}
          </div>
        </aside>

        {/* Grid / List */}
        <div className="flex-1">
          {loading ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"
                  : "flex flex-col gap-3"
              }
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton
                  key={i}
                  className={viewMode === "grid" ? "aspect-[3/4] rounded-2xl" : "h-32 rounded-2xl"}
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed py-20 text-center">
              <PackageOpen className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No products found</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Try adjusting your filters or search terms. Check the category
                or remove some filters.
              </p>
              <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {products.map((p) => (
                <ProductListCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: pagination.totalPages }).map((_, i) => {
                const p = i + 1
                // Show first 3, last 3, and 2 around current
                const show =
                  p <= 3 ||
                  p > pagination.totalPages - 3 ||
                  Math.abs(p - page) <= 2
                if (!show) {
                  if (p === 4 || p === pagination.totalPages - 3) {
                    return (
                      <span key={p} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    )
                  }
                  return null
                }
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => setPage(p)}
                    className="h-10 w-10"
                  >
                    {p}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * ProductListCard — horizontal card for list view.
 */
function ProductListCard({ product }: { product: Product }) {
  const { goProduct, addToCart } = useStore()
  const images = product.images || []
  const primaryImage = images[0] || "/placeholder.svg"
  const hasDiscount =
    product.compareAt !== null && product.compareAt > product.price
  const outOfStock = product.stock === 0

  return (
    <article
      onClick={() => goProduct(product.slug)}
      className="group flex cursor-pointer gap-4 rounded-2xl border bg-card p-3 shadow-sm transition-all hover:shadow-md sm:p-4"
    >
      {/* Image */}
      <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-secondary/30 sm:w-32">
        <img
          src={primaryImage}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            outOfStock ? "opacity-60" : ""
          }`}
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col">
        {product.brand?.name && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {product.brand.name}
          </p>
        )}
        <h3 className="line-clamp-1 text-sm font-medium sm:text-base">{product.name}</h3>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
            {product.shortDescription}
          </p>
        )}
        {/* Rating */}
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-medium text-foreground/80">{product.rating.toFixed(1)}</span>
          <span>({product.reviewsCount})</span>
          {product.skinType && product.skinType.length > 0 && (
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px]">
              {product.skinType[0]}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold sm:text-lg">
              RWF {product.price.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                RWF {product.compareAt!.toLocaleString()}
              </span>
            )}
          </div>
          <Button
            size="sm"
            disabled={outOfStock}
            onClick={(e) => {
              e.stopPropagation()
              addToCart({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: primaryImage,
                stock: product.stock,
              })
            }}
          >
            {outOfStock ? "Sold out" : "Add to cart"}
          </Button>
        </div>
      </div>
    </article>
  )
}
