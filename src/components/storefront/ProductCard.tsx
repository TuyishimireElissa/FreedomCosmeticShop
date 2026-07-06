"use client"

/**
 * Product card used in the catalog and home grids.
 *
 * Shows:
 *  - Product image (with hover zoom)
 *  - Brand, name, rating
 *  - Price + compare-at price (strikethrough)
 *  - Sale badge if compareAt > price
 *  - "Add to cart" button (quick add, qty = 1)
 *  - Out-of-stock overlay if stock === 0
 */

import { useState } from "react"
import { Product } from "@/lib/types"
import { useStore } from "@/store/useStore"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Plus, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { goProduct, addToCart } = useStore()
  const { toast } = useToast()
  const [added, setAdded] = useState(false)

  const images = product.images || []
  const primaryImage = images[0] || "/placeholder.svg"
  const hasDiscount = product.compareAt !== null && product.compareAt > product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.compareAt! - product.price) / product.compareAt!) * 100)
    : 0
  const outOfStock = product.stock === 0

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (outOfStock) return
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: primaryImage,
      stock: product.stock,
    })
    setAdded(true)
    toast({
      title: "Added to cart",
      description: product.name,
    })
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article
      onClick={() => goProduct(product.slug)}
      className="group bg-card relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      {/* Image */}
      <div className="bg-secondary/30 relative aspect-square overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              outOfStock ? "opacity-60" : ""
            }`}
            loading="lazy"
          />
        ) : (
          <div className="text-muted-foreground grid h-full w-full place-items-center">
            No image
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {hasDiscount && (
            <Badge className="bg-primary text-primary-foreground shadow">-{discountPercent}%</Badge>
          )}
          {product.featured && <Badge className="bg-amber-500 text-white shadow">★ Featured</Badge>}
        </div>

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <div className="bg-background/40 absolute inset-0 grid place-items-center">
            <span className="bg-foreground/80 text-background rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.brand && (
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            {product.brand}
          </p>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm leading-snug font-medium sm:text-[15px]">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-foreground/80 font-medium">{product.rating.toFixed(1)}</span>
          <span>({product.reviews})</span>
        </div>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-foreground text-base font-semibold sm:text-lg">
            {formatRWF(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-muted-foreground text-xs line-through">
              {formatRWF(product.compareAt!)}
            </span>
          )}
        </div>

        {/* Spacer pushes button to bottom */}
        <div className="flex-1" />

        {/* Add to cart */}
        <Button
          onClick={handleQuickAdd}
          disabled={outOfStock}
          size="sm"
          className="mt-3 w-full"
          variant={added ? "secondary" : "default"}
        >
          {added ? (
            <>
              <Check className="mr-1.5 h-4 w-4" /> Added
            </>
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" /> Add to cart
            </>
          )}
        </Button>
      </div>
    </article>
  )
}
