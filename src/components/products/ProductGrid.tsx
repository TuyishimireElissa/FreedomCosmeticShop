'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Heart, PackageOpen, RefreshCw, ShoppingBag, Star } from 'lucide-react'
import type { Product } from '@/lib/types'
import { formatRWF } from '@/lib/format'
import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getCloudinaryUrl, getProductPrimaryImage } from '@/lib/cloudinary-images'
import SmartImage from '@/components/ui/SmartImage'
import { useAnalytics } from '@/hooks/useAnalytics'

interface ProductGridProps {
  products: Product[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function ProductGrid({ products, loading = false, error, onRetry }: ProductGridProps) {
  const { t, language } = useLanguage()
  const addToCart = useStore((state) => state.addToCart)
  const user = useStore((state) => state.user)
  const router = useRouter()
  const { toast } = useToast()
  const { trackAddToWishlist, trackRemoveFromWishlist } = useAnalytics()
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set())

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    const active = wishlisted.has(productId)
    const response = await fetch('/api/wishlist', {
      method: active ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    })
    if (!response.ok) {
      toast({ title: t('search.wishlist_failed'), variant: 'destructive' })
      return
    }
    if (active) trackRemoveFromWishlist(productId)
    else trackAddToWishlist(productId)
    setWishlisted((current) => {
      const next = new Set(current)
      if (active) next.delete(productId)
      else next.add(productId)
      return next
    })
    toast({ title: active ? t('search.removed_wishlist') : t('search.saved_wishlist') })
  }

  if (loading) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{Array.from({ length: 9 }).map((_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white"><div className="aspect-square animate-pulse bg-gray-100" /><div className="space-y-2.5 p-3 sm:p-4"><div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" /><div className="h-4 w-full animate-pulse rounded bg-gray-100" /><div className="h-5 w-1/2 animate-pulse rounded bg-rose-100" /><div className="h-10 animate-pulse rounded-xl bg-gray-100" /></div></div>)}</div>
  }

  if (error) {
    return <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 px-5 py-16 text-center"><PackageOpen className="mx-auto h-10 w-10 text-[#B76E79]" /><h2 className="mt-4 font-bold text-gray-800">{t('errors.products_load_failed')}</h2><p className="mt-1 text-sm text-gray-500">{t('search.products_load_failed_hint')}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-2.5 text-xs font-bold text-white"><RefreshCw className="h-4 w-4" />{t('common.retry')}</button>}</div>
  }

  if (products.length === 0) {
    return <div className="rounded-3xl border border-dashed border-gray-200 bg-[#f8f9fa] px-5 py-16 text-center"><PackageOpen className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-4 font-bold text-gray-700">{t('search.no_filter_results')}</h2><p className="mt-1 text-sm text-gray-500">{t('search.broaden_search')}</p></div>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product) => {
        const primaryImage = getProductPrimaryImage(product)
        const image = primaryImage?.publicId
          ? getCloudinaryUrl(primaryImage.publicId, 'CARD_DESKTOP')
          : primaryImage?.url || ''
        const imageAlt = language === 'rw' && primaryImage?.altTextRw ? primaryImage.altTextRw : primaryImage?.altText || product.name
        const discount = product.compareAt && product.compareAt > product.price ? Math.round((1 - product.price / product.compareAt) * 100) : 0
        const outOfStock = product.isOutOfStock ?? product.stock < 1
        const lowStock = product.isLowStock ?? (product.stock > 0 && product.stock <= product.lowStockThreshold)
        return (
          <article key={product.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_5px_20px_rgba(26,26,26,0.05)] transition-all hover:-translate-y-1 hover:border-rose-100 hover:shadow-[0_16px_34px_rgba(183,110,121,0.14)]">
            <div className="relative aspect-square overflow-hidden bg-[#f8f9fa]">
              <Link href={`/products/${product.slug}`} className="block h-full">
                {image ? <SmartImage publicId={primaryImage?.publicId || undefined} fallbackSrc={primaryImage?.url || undefined} context="card" alt={imageAlt} fill aspectRatio={1} className={`object-cover transition-transform duration-300 group-hover:scale-105 ${outOfStock ? 'opacity-60' : ''}`} /> : <div className="grid h-full place-items-center text-xs text-gray-400">{t('product.no_image')}</div>}
              </Link>
              <div className="absolute left-2 top-2 flex flex-col items-start gap-1">{discount > 0 && <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white">-{discount}%</span>}{product.isNewArrival === true && <span className="rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">{t('common.new')}</span>}{product.isBestSeller === true && <span className="rounded-full bg-[#B76E79] px-2 py-1 text-[10px] font-bold text-white">🔥 {t('categories.best_sellers')}</span>}{lowStock && <span className="rounded-full bg-amber-500 px-2 py-1 text-[10px] font-bold text-white">{t('common.low_stock', { count: product.stock })}</span>}{outOfStock && <span className="rounded-full bg-[#1a1a1a] px-2 py-1 text-[10px] font-bold text-white">{t('common.sold_out')}</span>}</div>
              <button type="button" onClick={() => toggleWishlist(product.id)} className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-gray-500 shadow-sm hover:text-red-500" aria-label={`${t('product.add_to_wishlist')}: ${product.name}`} aria-pressed={wishlisted.has(product.id)}><Heart className={`h-4 w-4 ${wishlisted.has(product.id) ? 'fill-red-500 text-red-500' : ''}`} /></button>
            </div>
            <div className="flex flex-1 flex-col p-3 sm:p-4">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{product.brand?.name || product.category?.name || 'Freedom Beauty'}</p>
              <Link href={`/products/${product.slug}`} className="mt-1"><h2 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[#1a1a1a] transition-colors hover:text-[#B76E79] sm:text-[15px]">{product.name}</h2></Link>
              <div className="mt-2 flex min-h-4 items-center gap-1">{product.reviewsCount > 0 ? <><Star className="h-3.5 w-3.5 fill-[#FFD700] text-[#FFD700]" /><span className="text-xs font-bold">{product.rating.toFixed(1)}</span><span className="text-[11px] text-gray-400">({product.reviewsCount})</span></> : <span className="text-[11px] font-medium text-gray-400">{t('product.no_reviews')}</span>}</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-2"><span className="text-base font-black text-[#B76E79] sm:text-lg">{formatRWF(product.price)}</span>{product.compareAt && product.compareAt > product.price && <span className="text-[10px] text-gray-400 line-through sm:text-xs">{formatRWF(product.compareAt)}</span>}</div>
              <button type="button" disabled={outOfStock} onClick={() => { addToCart({ productId: product.id, slug: product.slug, name: product.name, price: product.price, image: image || '', stock: product.stock }); toast({ title: t('product.added'), description: product.name }) }} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-3 text-xs font-bold text-white transition-colors hover:bg-[#a55d68] disabled:cursor-not-allowed disabled:bg-gray-300 sm:text-sm"><ShoppingBag className="h-4 w-4" />{outOfStock ? t('common.sold_out') : t('product.add_to_cart')}</button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
