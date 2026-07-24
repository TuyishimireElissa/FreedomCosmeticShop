'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Heart, ImageIcon, ShoppingCart, Star } from 'lucide-react'
import type { Product, ProductImage } from '@/lib/types'
import { formatRWF } from '@/lib/format'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/use-toast'
import SmartImage from '@/components/ui/SmartImage'

type ProductWithImageFallbacks = Product & {
  image?: string | null
  imageUrl?: string | null
  thumbnailUrl?: string | null
}

interface ProductCardProps {
  product: ProductWithImageFallbacks
  wishlisted?: boolean
  onToggleWishlist?: () => void
}

/** Prefer newly uploaded structured images, then fall back to legacy URL fields. */
export function getImageUrl(product: ProductWithImageFallbacks): string | null {
  const structuredImages: unknown = product.productImages
  if (Array.isArray(structuredImages)) {
    const primary = structuredImages.find((value): value is ProductImage => typeof value === 'object' && value !== null && 'isPrimary' in value && value.isPrimary === true)
    const candidate: unknown = primary || structuredImages[0]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
    if (typeof candidate === 'object' && candidate !== null && 'url' in candidate && typeof candidate.url === 'string' && candidate.url.trim()) return candidate.url
  }

  const legacyImages: unknown = product.images
  if (Array.isArray(legacyImages)) {
    const first = legacyImages.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    if (first) return first
  } else if (typeof legacyImages === 'string' && legacyImages.trim()) {
    try {
      const parsed: unknown = JSON.parse(legacyImages)
      if (Array.isArray(parsed)) {
        const first = parsed.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
        if (first) return first
      }
    } catch {
      if (/^https?:\/\//i.test(legacyImages)) return legacyImages
    }
  }

  for (const value of [product.image, product.imageUrl, product.thumbnailUrl]) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

export function getImagePublicId(product: ProductWithImageFallbacks): string | undefined {
  const images = Array.isArray(product.productImages) ? product.productImages : []
  const selected = images.find((image) => image.isPrimary) || images[0]
  return selected?.publicId || undefined
}

export function ProductCard({ product, wishlisted = false, onToggleWishlist }: ProductCardProps) {
  const { t } = useLanguage()
  const addToCart = useStore((state) => state.addToCart)
  const user = useStore((state) => state.user)
  const { toast } = useToast()
  const [added, setAdded] = useState(false)
  const [localWishlisted, setLocalWishlisted] = useState(false)
  const [wishlistBusy, setWishlistBusy] = useState(false)
  const imageUrl = getImageUrl(product)
  const imagePublicId = getImagePublicId(product)
  const outOfStock = product.isOutOfStock ?? product.stock < 1
  const isWholesale = user?.wholesaleStatus === 'APPROVED'
  const wholesalePrice = isWholesale && product.wholesalePrice ? product.wholesalePrice : null
  const displayPrice = wholesalePrice || product.price
  const comparePrice = wholesalePrice
    ? product.price
    : product.compareAt && product.compareAt > displayPrice
      ? product.compareAt
      : null
  const savings = comparePrice ? Math.max(0, comparePrice - displayPrice) : 0
  const discount = comparePrice && comparePrice > displayPrice ? Math.round((1 - displayPrice / comparePrice) * 100) : 0
  const size = product.volume || product.size
  const activeWishlisted = onToggleWishlist ? wishlisted : localWishlisted

  const addProduct = () => {
    if (outOfStock) return
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: displayPrice,
      retailPrice: product.price,
      wholesalePrice: product.wholesalePrice || undefined,
      image: imageUrl || '',
      volume: size || undefined,
      stock: product.stock,
    })
    setAdded(true)
    toast({ title: t('product.added'), description: product.name })
    window.setTimeout(() => setAdded(false), 1500)
  }

  const toggleWishlist = async () => {
    if (wishlistBusy) return
    if (onToggleWishlist) { onToggleWishlist(); return }
    if (!user) {
      toast({ title: t('nav.sign_in_wishlist') })
      window.location.assign('/login')
      return
    }
    setWishlistBusy(true)
    try {
      const response = await fetch('/api/wishlist', {
        method: localWishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      if (!response.ok) throw new Error()
      setLocalWishlisted((current) => !current)
      toast({ title: localWishlisted ? t('search.removed_wishlist') : t('search.saved_wishlist') })
    } catch {
      toast({ title: t('search.wishlist_failed'), variant: 'destructive' })
    } finally { setWishlistBusy(false) }
  }

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <Link href={`/products/${product.slug}`} className="block h-full w-full rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B76E79]" aria-label={t('product.view_product', { product: product.name })}>
          {imageUrl ? (
            <SmartImage
              publicId={imagePublicId}
              fallbackSrc={imageUrl}
              context="card"
              alt={product.name}
              fill
              aspectRatio={4 / 5}
              className={`object-contain p-4 drop-shadow-[0_10px_14px_rgba(15,23,42,0.10)] transition-transform duration-500 group-hover:scale-105 md:p-6 ${outOfStock ? 'opacity-60' : ''}`}
            />
          ) : (
            <span role="img" aria-label={product.name} className="flex h-full w-full items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 text-center">
              <span><ImageIcon className="mx-auto h-12 w-12 text-gray-300" strokeWidth={1.25} aria-hidden="true" /><span className="mt-2 line-clamp-2 text-xs text-gray-400">{product.name}</span></span>
            </span>
          )}
        </Link>

        {discount > 0 && <span className="absolute left-3 top-3 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">-{discount}%</span>}
        <button
          type="button"
          onClick={() => void toggleWishlist()}
          disabled={wishlistBusy}
          className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-gray-600 opacity-100 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79] disabled:cursor-wait md:right-3 md:top-3 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          aria-label={`${activeWishlisted ? t('product.remove_from_wishlist') : t('product.add_to_wishlist')}: ${product.name}`}
          aria-pressed={activeWishlisted}
        >
          <Heart className={`h-4 w-4 ${activeWishlisted ? 'fill-red-500 text-red-500' : ''}`} aria-hidden="true" />
        </button>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-16 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col p-3 md:p-4">
        <p className="mb-1 truncate text-[11px] font-medium uppercase tracking-widest text-gray-400">{product.brand?.name || product.category?.name || ''}</p>
        <Link href={`/products/${product.slug}`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79]">
          <h2 className="mb-1.5 line-clamp-2 min-h-10 text-[13px] font-semibold leading-tight text-gray-900 transition-colors duration-200 group-hover:text-[#B76E79] md:text-sm">{product.name}</h2>
        </Link>

        {product.reviewsCount > 0 && (
          <div className="mb-1.5 flex items-center gap-1.5" aria-label={t('product.rating_label', { rating: product.rating, count: product.reviewsCount })}>
            <span className="flex gap-0.5" aria-hidden="true">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-3 w-3 ${star <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />)}</span>
            <span className="text-[11px] text-gray-400">({product.reviewsCount})</span>
          </div>
        )}

        <p className="mb-2 min-h-[1rem] text-[11px] text-gray-400">{size || ''}</p>
        <div className="flex-1" />

        <div className="mb-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-extrabold tracking-tight text-[#B76E79] md:text-lg">{formatRWF(displayPrice)}</span>
            {comparePrice && <span className="text-xs font-medium text-gray-400 line-through">{formatRWF(comparePrice)}</span>}
          </div>
          {isWholesale && savings > 0 && <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">You save {formatRWF(savings)}</p>}
        </div>

        <button
          type="button"
          onClick={addProduct}
          disabled={outOfStock}
          className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-2 text-[13px] font-semibold text-white transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-gray-300 ${isWholesale ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#B76E79] hover:bg-[#9B5A64]'}`}
        >
          {added ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
          {outOfStock ? t('common.sold_out') : added ? t('product.added') : t('product.add_to_cart')}
        </button>
      </div>
    </article>
  )
}
