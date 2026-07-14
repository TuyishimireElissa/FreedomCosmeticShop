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
import { useRouter } from "next/navigation"
import { Product } from "@/lib/types"
import { useStore } from "@/store/useStore"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Plus, Check, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useT } from "@/lib/i18n/LanguageContext"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, user } = useStore()
  const router = useRouter()
  const { toast } = useToast()
  const t = useT()
  const [added, setAdded] = useState(false)

  // Section 4: Check if user is approved wholesale
  const isWholesaleUser =
    user &&
    (user.userType === "WHOLESALE" || user.userType === "BOTH") &&
    user.wholesaleStatus === "APPROVED"

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
      title: t('product.added'),
      description: product.name,
    })
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article
      onClick={() => router.push(`/products/${product.slug}`)}
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
            {t('product.no_image')}
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {hasDiscount && (
            <Badge className="bg-primary text-primary-foreground shadow">-{discountPercent}%</Badge>
          )}
          {product.featured && <Badge className="bg-orange-500 text-white shadow">🔥 {t('categories.best_sellers')}</Badge>}
        </div>

        {/* Top-right: Authentic badge + Wishlist heart */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-background/90 text-emerald-700 shadow backdrop-blur"
            title={t('product.authentic_guarantee')}
          >
            <ShieldCheck className="mr-1 h-3 w-3" />
            {t('common.authentic')}
          </Badge>
        </div>

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <div className="bg-background/40 absolute inset-0 grid place-items-center">
            <span className="bg-foreground/80 text-background rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase">
              {t('common.sold_out')}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.brand?.name && (
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            {product.brand.name}
          </p>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm leading-snug font-medium sm:text-[15px]">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="text-muted-foreground mt-1 flex min-h-4 items-center gap-1 text-xs">
          {product.reviewsCount > 0 ? <>
            <div className="flex" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${star <= Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
                />
              ))}
            </div>
            <span className="text-foreground/80 font-medium">{product.rating.toFixed(1)}</span>
            <span>({product.reviewsCount})</span>
          </> : <span className="text-[11px]">{t('product.no_reviews')}</span>}
        </div>

        {/* NEW: Skin type badge */}
        {product.skinType && product.skinType.length > 0 && (
          <span className="mt-1 inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {product.skinType[0].charAt(0) + product.skinType[0].slice(1).toLowerCase()} skin
          </span>
        )}

        {/* NEW: Low stock indicator */}
        {product.stock > 0 && product.stock <= 5 && (
          <p className="mt-1 text-[10px] font-semibold text-amber-600">
            ⚡ {t('common.low_stock', { count: product.stock })}
          </p>
        )}

        {/* Price — Section 4: Show wholesale price for wholesale users */}
        {isWholesaleUser ? (
          <div className="mt-2">
            <p className="text-[10px] text-muted-foreground line-through">
              {t('product.retail_price', { price: formatRWF(product.price) })}
            </p>
            <p className="text-base font-bold text-violet-700 sm:text-lg">
              {formatRWF(product.price)}
            </p>
            <p className="text-[10px] font-medium text-violet-600">
              💛 {t('product.wholesale_price', { count: product.minWholesaleQty || 6 })}
            </p>
          </div>
        ) : (
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
        )}

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
              <Check className="mr-1.5 h-4 w-4" /> {t('product.added')}
            </>
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" /> {t('product.add_to_cart')}
            </>
          )}
        </Button>
      </div>
    </article>
  )
}
