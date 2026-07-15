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
import Link from "next/link"
import Image from "next/image"
import { Product } from "@/lib/types"
import { useStore } from "@/store/useStore"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Plus, Check, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { getCloudinaryUrl, getImageSizes, getProductPrimaryImage } from "@/lib/cloudinary-images"

interface ProductCardProps {
  product: Product
  compact?: boolean
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const addToCart = useStore((state) => state.addToCart)
  const router = useRouter()
  const { toast } = useToast()
  const { t, language } = useLanguage()
  const [added, setAdded] = useState(false)

  const primaryImage = getProductPrimaryImage(product)
  const imageSource = primaryImage?.publicId
    ? getCloudinaryUrl(primaryImage.publicId, compact ? 'CARD_MOBILE' : 'CARD_DESKTOP')
    : primaryImage?.url || '/placeholder.svg'
  const imageAlt = language === 'rw' && primaryImage?.altTextRw
    ? primaryImage.altTextRw
    : primaryImage?.altText || product.name
  const hasDiscount = product.compareAt !== null && product.compareAt > product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.compareAt! - product.price) / product.compareAt!) * 100)
    : 0
  const outOfStock = product.isOutOfStock ?? product.stock === 0
  const lowStock = product.isLowStock ?? (product.stock > 0 && product.stock <= product.lowStockThreshold)
  const isNewArrival = product.isNewArrival === true
  const isBestSeller = product.isBestSeller === true

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (outOfStock) return
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: primaryImage?.url || imageSource,
      stock: product.stock,
    })
    setAdded(true)
    toast({
      title: t('product.added'),
      description: product.name,
    })
    setTimeout(() => setAdded(false), 1500)
  }

  if (compact) {
    const compactBadge = outOfStock
      ? t('common.sold_out')
      : hasDiscount
        ? `-${discountPercent}%`
        : isBestSeller
          ? `🔥 ${t('categories.best_sellers')}`
          : isNewArrival
            ? t('common.new')
            : null

    return (
      <Link
        href={`/products/${product.slug}`}
        aria-label={t('product.view_product', { product: product.name })}
        className="block h-full touch-manipulation rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79]"
      >
        <article className="h-full w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-transform duration-150 active:scale-[0.98]">
          <div className="relative aspect-square overflow-hidden bg-gray-50">
            <Image
              src={imageSource}
              alt={imageAlt}
              fill
              className={`object-cover ${outOfStock ? 'opacity-60' : ''}`}
              sizes={getImageSizes('card_compact')}
              loading="lazy"
            />
            {compactBadge && (
              <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-[#B76E79] px-1.5 py-0.5 text-xs font-bold text-white shadow-sm">
                {compactBadge}
              </span>
            )}
          </div>
          <div className="p-2">
            <p className="mb-1 line-clamp-2 min-h-[2.5em] text-xs font-medium leading-tight text-gray-900">
              {product.name}
            </p>
            <div className="flex flex-wrap items-baseline gap-1">
              <span className="text-sm font-bold text-[#B76E79]">{formatRWF(product.price)}</span>
              {hasDiscount && (
                <span className="text-xs text-gray-500 line-through">{formatRWF(product.compareAt!)}</span>
              )}
            </div>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <article
      onClick={() => router.push(`/products/${product.slug}`)}
      className="group bg-card relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      {/* Image */}
      <div className="bg-secondary/30 relative aspect-square overflow-hidden">
        {primaryImage ? (
          <Image
            src={imageSource}
            alt={imageAlt}
            fill
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              outOfStock ? "opacity-60" : ""
            }`}
            sizes={getImageSizes('card')}
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
          {isBestSeller && <Badge className="bg-orange-500 text-white shadow">🔥 {t('categories.best_sellers')}</Badge>}
          {isNewArrival && <Badge className="bg-emerald-600 text-white shadow">{t('common.new')}</Badge>}
          {lowStock && <Badge className="bg-amber-500 text-white shadow">{t('common.low_stock', { count: product.stock })}</Badge>}
        </div>

        {product.isAuthentic === true && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-background/90 text-emerald-700 shadow backdrop-blur"
              title={t('product.authenticity_verified')}
            >
              <ShieldCheck className="mr-1 h-3 w-3" />
              {t('common.authentic')}
            </Badge>
          </div>
        )}

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
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
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
          </> : <span className="text-xs">{t('product.no_reviews')}</span>}
        </div>

        {/* NEW: Skin type badge */}
        {product.skinType && product.skinType.length > 0 && (
          <span className="mt-1 inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {t(`skin_types.${product.skinType[0]}`)}
          </span>
        )}

        {/* NEW: Low stock indicator */}
        {lowStock && (
          <p className="mt-1 text-xs font-semibold text-amber-600">
            ⚡ {t('common.low_stock', { count: product.stock })}
          </p>
        )}

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
          className="mt-3 min-h-12 w-full text-base"
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
