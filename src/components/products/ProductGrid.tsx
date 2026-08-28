'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PackageOpen, RefreshCw } from 'lucide-react'
import type { Product } from '@/lib/types'
import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useAnalytics } from '@/hooks/useAnalytics'
import { ProductCard } from '@/components/storefront/ProductCard'
import DidYouMean from '@/components/products/DidYouMean'
import CategoryComingSoon from '@/components/products/CategoryComingSoon'
import SearchRfq from '@/components/products/SearchRfq'
import SearchFallbackNotice from '@/components/products/SearchFallbackNotice'

interface ProductGridProps {
  products: Product[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  /** Offered in the empty state so a visitor is never stuck behind a filter. */
  onClearFilters?: () => void
  hasActiveFilters?: boolean
  /** Current search term, so the empty state can offer a spelling correction. */
  searchQuery?: string
  onSearchCorrection?: (term: string) => void
  /**
   * Set only when the page is showing one category, that category has nothing
   * on the shelf, and no other filter or search term is narrowing the result.
   * In that case the shopper made no mistake and must not be told to remove a
   * filter — they get the Coming Soon panel instead.
   */
  comingSoonCategory?: { name: string; soldOut: boolean } | null
  /**
   * Set only when a search term found nothing AND no filter is narrowing the
   * result. Source-gated: the caller decides, because only it knows whether a
   * filter is also active. An empty result caused by a filter is still a filter
   * problem and must keep the existing "clear filters" message.
   */
  rfqQuery?: string | null
  /** Set when the API returned closest-similar products instead of an exact match. */
  fallbackReason?: string | null
}

export default function ProductGrid({ products, loading = false, error, onRetry, onClearFilters, hasActiveFilters = false, searchQuery, onSearchCorrection, comingSoonCategory = null, rfqQuery = null, fallbackReason = null }: ProductGridProps) {
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-[#EEEEEE] bg-white">
            <div className="aspect-[4/5] animate-pulse bg-gradient-to-b from-gray-50 to-white motion-reduce:animate-none" />
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
    return <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 px-5 py-16 text-center"><PackageOpen className="mx-auto h-10 w-10 text-fcs-brand-text" /><h2 className="mt-4 font-bold text-gray-800">{t('errors.products_load_failed')}</h2><p className="mt-1 text-sm text-gray-500">{t('search.products_load_failed_hint')}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-2.5 text-xs font-bold text-white"><RefreshCw className="h-4 w-4" />{t('common.retry')}</button>}</div>
  }

  if (products.length === 0) {
    // An empty category is not a failed filter. Checked before the generic
    // empty state so the wrong message can never win.
    if (comingSoonCategory) {
      return <CategoryComingSoon categoryName={comingSoonCategory.name} soldOut={comingSoonCategory.soldOut} />
    }
    // A search that found nothing is a sourcing request, not a filter mistake.
    // Checked before the generic empty state so the wrong message cannot win.
    if (rfqQuery) {
      return <SearchRfq query={rfqQuery} />
    }
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-[#f8f9fa] px-5 py-16 text-center">
        <PackageOpen className="mx-auto h-10 w-10 text-gray-300" />
        <h2 className="mt-4 font-bold text-gray-700">{t('search.no_filter_results')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('search.broaden_search')}</p>
        {/* Only when there is a search term AND the correction is verified to
          * return products. See DidYouMean: it probes before it renders. */}
        {searchQuery && onSearchCorrection && <DidYouMean query={searchQuery} onSelect={onSearchCorrection} />}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {hasActiveFilters && onClearFilters && (
            <button type="button" onClick={onClearFilters} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-fcs-brand-strong px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#9B5A64]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />{t('search.clear_all_filters')}
            </button>
          )}
          <Link href="/products" className="inline-flex min-h-11 items-center rounded-full border border-gray-300 px-5 py-2.5 text-xs font-bold text-gray-700 transition-colors hover:border-fcs-brand hover:text-fcs-brand-text">
            {t('nav.products')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {fallbackReason && products.length > 0 && (
        <div className="mb-4">
          <SearchFallbackNotice />
        </div>
      )}
      <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            wishlisted={wishlisted.has(product.id)}
            onToggleWishlist={() => void toggleWishlist(product.id)}
          />
        ))}
      </div>
    </div>
  )
}
