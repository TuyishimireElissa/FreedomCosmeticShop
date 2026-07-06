"use client"

/**
 * ProductSection — reusable section for displaying a grid of products.
 *
 * Used for:
 *   - Best Sellers (sort by rating)
 *   - New Arrivals (sort by createdAt)
 *   - Featured Products
 *
 * Features:
 *   - Section header with title + subtitle + "View all" link
 *   - Responsive grid (2 cols mobile, 4 cols desktop)
 *   - Loading skeletons
 *   - Empty state
 */

import { Product } from "@/lib/types"
import { ProductCard } from "@/components/storefront/ProductCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight } from "lucide-react"

interface ProductSectionProps {
  title: string
  subtitle?: string
  products: Product[]
  loading?: boolean
  onViewAll?: () => void
  /** Number of skeleton loaders to show while loading */
  skeletonCount?: number
  /** Optional badge/icon for the section header */
  badge?: string
}

export function ProductSection({
  title,
  subtitle,
  products,
  loading = false,
  onViewAll,
  skeletonCount = 8,
  badge,
}: ProductSectionProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {badge && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary">
                {badge}
              </span>
            )}
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="shrink-0">
            View all
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
