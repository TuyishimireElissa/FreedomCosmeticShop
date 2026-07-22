'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Heart, Package, ShoppingCart, Star } from 'lucide-react'
import type { Product } from '@/lib/types'
import { formatRWF } from '@/lib/format'
import { getCloudinaryUrl, getProductPrimaryImage, IMAGE_QUALITY, optimizeCloudinaryUrl } from '@/lib/cloudinary-images'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useLowData } from '@/contexts/LowDataContext'
import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/use-toast'

interface ProductCardProps {
  product: Product
  compact?: boolean
  wishlisted?: boolean
  onToggleWishlist?: () => void
}

export function ProductCard({ product, compact = false, wishlisted = false, onToggleWishlist }: ProductCardProps) {
  const { t, language } = useLanguage()
  const { isLowData } = useLowData()
  const addToCart = useStore((state) => state.addToCart)
  const { toast } = useToast()
  const [added, setAdded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const primaryImage = getProductPrimaryImage(product)
  const imageUrl = useMemo(() => {
    if (!primaryImage) return null
    if (primaryImage.publicId) return getCloudinaryUrl(primaryImage.publicId, compact || isLowData ? 'CARD_MOBILE' : 'CARD_DESKTOP')
    if (!primaryImage.url) return null
    return optimizeCloudinaryUrl(primaryImage.url, {
      width: compact || isLowData ? 320 : 640,
      quality: isLowData ? IMAGE_QUALITY.lowData : IMAGE_QUALITY.normal,
    })
  }, [compact, isLowData, primaryImage])

  useEffect(() => setImageFailed(false), [imageUrl])

  const imageAlt = language === 'rw' && primaryImage?.altTextRw
    ? primaryImage.altTextRw
    : primaryImage?.altText || product.name
  const outOfStock = product.isOutOfStock ?? product.stock < 1
  const hasDiscount = product.compareAt !== null && product.compareAt > product.price
  const discount = hasDiscount ? Math.round((1 - product.price / product.compareAt!) * 100) : 0
  const size = product.volume || product.size
  const badge = outOfStock
    ? { text: t('common.sold_out'), classes: 'bg-[#1a1a1a] text-white' }
    : hasDiscount
      ? { text: `-${discount}%`, classes: 'bg-[#D64045] text-white' }
      : product.isBestSeller
        ? { text: t('categories.best_sellers'), classes: 'bg-[#B76E79] text-white' }
        : product.isNewArrival
          ? { text: t('common.new'), classes: 'bg-[#2D8A4E] text-white' }
          : null

  const addProduct = () => {
    if (outOfStock) return
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: imageUrl || '',
      stock: product.stock,
    })
    setAdded(true)
    toast({ title: t('product.added'), description: product.name })
    window.setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-[#f5f5f5]">
        <Link href={`/products/${product.slug}`} className="block h-full w-full" aria-label={t('product.view_product', { product: product.name })}>
          {imageUrl && !imageFailed ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              unoptimized
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-105 ${outOfStock ? 'opacity-60' : ''}`}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span role="img" aria-label={imageAlt} className="flex h-full w-full flex-col items-center justify-center px-3 text-center text-gray-300">
              <Package className="mb-2 h-16 w-16" strokeWidth={1} aria-hidden="true" />
              <span className="line-clamp-2 text-xs">{product.name}</span>
            </span>
          )}
        </Link>

        {badge && <span className={`absolute right-2 top-2 rounded-md px-2 py-1 text-xs font-bold ${badge.classes}`}>{badge.text}</span>}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={onToggleWishlist}
            className="absolute left-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-gray-500 shadow-sm transition-colors hover:text-[#B76E79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79]"
            aria-label={`${t('product.add_to_wishlist')}: ${product.name}`}
            aria-pressed={wishlisted}
          >
            <Heart className={`h-4 w-4 ${wishlisted ? 'fill-[#B76E79] text-[#B76E79]' : ''}`} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="mb-1 min-h-[1rem] truncate text-[11px] font-medium uppercase tracking-[0.5px] text-gray-400">
          {product.brand?.name || product.category?.name || ''}
        </p>
        <Link href={`/products/${product.slug}`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79]">
          <h2 className="line-clamp-2 min-h-10 text-[15px] font-semibold leading-5 text-[#1a1a1a] transition-colors duration-200 group-hover:text-[#B76E79]">
            {product.name}
          </h2>
        </Link>
        <p className="mt-1 min-h-[18px] text-xs text-[#777777]">{size || ''}</p>

        {product.reviewsCount > 0 && (
          <div className="mt-2 flex items-center gap-1" aria-label={t('product.rating_label', { rating: product.rating, count: product.reviewsCount })}>
            <Star className="h-3.5 w-3.5 fill-[#E8A838] text-[#E8A838]" aria-hidden="true" />
            <span className="text-xs font-semibold text-gray-700">{product.rating.toFixed(1)}</span>
            <span className="text-[11px] text-gray-400">({product.reviewsCount})</span>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-3">
          <span className="text-lg font-bold text-[#B76E79]">{formatRWF(product.price)}</span>
          {hasDiscount && <span className="text-[13px] text-gray-400 line-through">{formatRWF(product.compareAt!)}</span>}
        </div>

        <button
          type="button"
          onClick={addProduct}
          disabled={outOfStock}
          className="relative mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#B76E79] px-3 text-[13px] font-semibold text-white transition-colors duration-200 before:absolute before:-inset-y-0.5 before:inset-x-0 hover:bg-[#9B5A64] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {added ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
          {outOfStock ? t('common.sold_out') : added ? t('product.added') : t('product.add_to_cart')}
        </button>
      </div>
    </article>
  )
}
