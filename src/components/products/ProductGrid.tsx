'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageOpen, RefreshCw } from 'lucide-react'
import type { Product } from '@/lib/types'
import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useAnalytics } from '@/hooks/useAnalytics'
import { ProductCard } from '@/components/storefront/ProductCard'

interface ProductGridProps {
  products: Product[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function ProductGrid({ products, loading = false, error, onRetry }: ProductGridProps) {
  const { t } = useLanguage()
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
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-[#EEEEEE] bg-white">
            <div className="aspect-square animate-pulse bg-[#f5f5f5] motion-reduce:animate-none" />
            <div className="space-y-2.5 p-4">
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
              <div className="h-10 w-full animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-rose-100 motion-reduce:animate-none" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 px-5 py-16 text-center"><PackageOpen className="mx-auto h-10 w-10 text-[#B76E79]" /><h2 className="mt-4 font-bold text-gray-800">{t('errors.products_load_failed')}</h2><p className="mt-1 text-sm text-gray-500">{t('search.products_load_failed_hint')}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-2.5 text-xs font-bold text-white"><RefreshCw className="h-4 w-4" />{t('common.retry')}</button>}</div>
  }

  if (products.length === 0) {
    return <div className="rounded-3xl border border-dashed border-gray-200 bg-[#f8f9fa] px-5 py-16 text-center"><PackageOpen className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-4 font-bold text-gray-700">{t('search.no_filter_results')}</h2><p className="mt-1 text-sm text-gray-500">{t('search.broaden_search')}</p></div>
  }

  return (
    <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          wishlisted={wishlisted.has(product.id)}
          onToggleWishlist={() => void toggleWishlist(product.id)}
        />
      ))}
    </div>
  )
}
