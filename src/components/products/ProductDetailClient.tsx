'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Heart, Minus, Plus, RefreshCw, ShieldCheck, ShoppingBag, Star } from 'lucide-react'
import type { Product } from '@/lib/types'
import { formatRWF } from '@/lib/format'
import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/use-toast'
import ProductImageGallery from '@/components/products/ProductImageGallery'
import ProductTabs from '@/components/products/ProductTabs'
import RoutineRail from '@/components/products/RoutineRail'
import DeliveryEstimator from '@/components/products/DeliveryEstimator'
import OrderViaWhatsApp from '@/components/products/OrderViaWhatsApp'
import { useT } from '@/lib/i18n/LanguageContext'
import IconButton from '@/components/a11y/IconButton'
import StockStatus from '@/components/a11y/StockStatus'
import { getProductPrimaryImage } from '@/lib/cloudinary-images'
import { useAnalytics } from '@/hooks/useAnalytics'

interface ProductResponse { product: Product; related: Product[] }

export default function ProductDetailClient({ slug }: { slug: string }) {
  const t = useT()
  const router = useRouter()
  const addToCart = useStore((state) => state.addToCart)
  const user = useStore((state) => state.user)
  const { toast } = useToast()
  const { trackProductView } = useAnalytics()
  const [data, setData] = useState<ProductResponse | null>(null)
  // Drives the mobile sticky buy bar: it appears only once the real
  // add-to-cart button has scrolled out of view, so there is never a moment
  // where two identical buttons are on screen at once.
  const addToCartRef = useRef<HTMLDivElement | null>(null)
  const [showStickyBuy, setShowStickyBuy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [shade, setShade] = useState('')
  const [wishlisted, setWishlisted] = useState(false)

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null)
    fetch(`/api/products/${encodeURIComponent(slug)}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(response.status === 404 ? t('product.product_not_found') : t('product.unavailable_hint')); return response.json() })
      .then((result: ProductResponse) => { setData(result); setShade(result.product.shades?.[0] || ''); setQuantity(1) })
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || t('product.unavailable_hint')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [slug, request, t])

  useEffect(() => {
    if (!data?.product) return
    trackProductView({
      id: data.product.id,
      slug: data.product.slug,
      category: data.product.category?.slug,
    })
  }, [data?.product, trackProductView])

  useEffect(() => {
    if (user?.wholesaleStatus === 'APPROVED' && data?.product && quantity === 1) setQuantity(Math.min(12, Math.max(1, data.product.stock)))
  }, [data?.product, quantity, user?.wholesaleStatus])

  // Must sit above the early returns so hook order stays stable across renders.
  const observeAddToCart = useCallback((node: HTMLDivElement | null) => {
    addToCartRef.current = node
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBuy(Boolean(entry && !entry.isIntersecting)),
      { rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  if (loading) return <DetailSkeleton />
  if (error || !data) return <div className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 py-16 text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-fcs-brand-text"><ShoppingBag className="h-7 w-7" /></div><h1 className="mt-5 text-2xl font-bold text-[#1a1a1a]">{error || t('product.product_not_found')}</h1><p className="mt-2 text-sm text-gray-500">{t('product.unavailable_hint')}</p><div className="mt-6 flex justify-center gap-3"><button type="button" onClick={() => router.push('/products')} className="rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white">{t('product.browse_products')}</button><button type="button" onClick={() => setRequest((value) => value + 1)} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold"><RefreshCw className="h-4 w-4" />{t('common.retry')}</button></div></div></div>

  const { product, related } = data
  const outOfStock = product.stock < 1
  const isWholesale = user?.wholesaleStatus === 'APPROVED'
  const wholesalePrice = isWholesale && product.wholesalePrice ? product.wholesalePrice : null
  const displayPrice = wholesalePrice || product.price
  const wholesaleSavings = wholesalePrice ? Math.max(0, product.price - wholesalePrice) : 0
  const discount = product.compareAt && product.compareAt > product.price ? Math.round((1 - product.price / product.compareAt) * 100) : 0
  const primaryImage = getProductPrimaryImage(product)

  const add = () => {
    if (outOfStock) return
    addToCart({ productId: product.id, slug: product.slug, name: product.name, price: displayPrice, retailPrice: product.price, wholesalePrice: product.wholesalePrice || undefined, image: primaryImage?.url || '', volume: product.volume || product.size || undefined, stock: product.stock }, quantity)
    toast({ title: t('product.added'), description: `${quantity} × ${product.name}${shade ? ` · ${shade}` : ''}` })
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <nav className="mb-5 flex items-center gap-2 text-xs text-gray-500"><button type="button" onClick={() => router.push('/products')} className="flex items-center gap-1 font-semibold hover:text-fcs-brand-text"><ChevronLeft className="h-3.5 w-3.5" />{t('nav.products')}</button><span>/</span><span>{product.category?.name || t('product.beauty')}</span><span>/</span><span className="min-w-0 truncate font-semibold text-gray-800">{product.name}</span></nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductImageGallery productImages={product.productImages || []} legacyImages={product.images || []} productName={product.name} videoUrl={product.videoUrl} discount={discount} outOfStock={outOfStock} isAuthentic={product.isAuthentic === true} />

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fcs-brand-text">{product.brand?.name || t('product.beauty')}</p>
            <h1 className="mt-2 font-display text-3xl font-normal leading-tight tracking-tight text-fcs-text sm:text-4xl">{product.name}</h1>
            {product.reviewsCount > 0 && <button type="button" onClick={() => document.getElementById('product-details')?.scrollIntoView({ behavior: 'smooth' })} className="mt-3 flex items-center gap-2"><span className="flex">{[1,2,3,4,5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= Math.round(product.rating) ? 'fill-[#FFD700] text-[#FFD700]' : 'fill-gray-200 text-gray-200'}`} />)}</span><span className="text-sm font-bold">{product.rating.toFixed(1)}</span><span className="text-xs text-fcs-text-muted">{t('product.reviews_count', { count: product.reviewsCount })}</span></button>}

            {wholesalePrice ? <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-violet-700">Wholesale pricing</p><div className="mt-2 flex items-baseline gap-3"><span className="text-3xl font-bold text-fcs-brand-text">{formatRWF(wholesalePrice)}</span><span className="text-base text-fcs-text-muted line-through">{formatRWF(product.price)}</span></div><p className="mt-1 text-sm font-semibold text-emerald-700">Save {formatRWF(wholesaleSavings)} per unit</p><div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">{[12,24,48].map((units) => <span key={units} className="rounded-lg bg-white p-2">Buy {units}: save {formatRWF(wholesaleSavings * units)}</span>)}</div></div> : <div className="mt-5 flex flex-wrap items-baseline gap-3"><span className="text-3xl font-bold text-fcs-brand-text">{formatRWF(product.price)}</span>{product.compareAt && product.compareAt > product.price && <span className="text-base text-fcs-text-muted line-through">{formatRWF(product.compareAt)}</span>}{discount > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">{t('product.save_percent', { percent: discount })}</span>}</div>}
            <div className="mt-3 flex flex-wrap gap-2"><StockStatus stock={product.stock} lowStockThreshold={product.lowStockThreshold} className="rounded-full border border-current/20 px-3 py-1" />{product.isAuthentic === true && <span className="flex items-center gap-1 rounded-full border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />{t('common.authentic')}</span>}</div>
            {product.shortDescription && <p className="mt-5 text-sm leading-7 text-gray-600">{product.shortDescription}</p>}

            {product.shades && product.shades.length > 0 && <div className="mt-6"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('product.select_shade')} <span className="ml-1 normal-case text-fcs-brand-text">{shade}</span></p><div className="mt-2 flex flex-wrap gap-2">{product.shades.map((value) => <button key={value} type="button" onClick={() => setShade(value)} className={`rounded-xl border-2 px-3 py-2 text-sm font-bold ${shade === value ? 'border-fcs-brand bg-rose-50 text-fcs-brand-text' : 'border-gray-200 text-gray-600'}`}>{value}</button>)}</div></div>}

            <div ref={observeAddToCart} className="mt-7 flex flex-wrap gap-3"><div className="flex h-12 items-center overflow-hidden rounded-xl border border-gray-200"><IconButton label={t('product.decrease_quantity')} icon={<Minus className="h-4 w-4" />} onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} variant="ghost" className="h-full rounded-none" /><span className="grid h-full min-w-11 place-items-center border-x border-gray-200 text-sm font-bold">{quantity}</span><IconButton label={t('product.increase_quantity')} icon={<Plus className="h-4 w-4" />} onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))} disabled={quantity >= product.stock} variant="ghost" className="h-full rounded-none" /></div><button type="button" onClick={add} disabled={outOfStock} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-fcs-brand-strong px-6 text-sm font-bold text-white hover:bg-[#9B5A64] disabled:bg-gray-300"><ShoppingBag className="h-5 w-5" />{outOfStock ? t('common.sold_out') : `${t('product.add_to_cart')} · ${formatRWF(displayPrice * quantity)}`}</button><IconButton label={wishlisted ? t('product.remove_from_wishlist') : t('product.add_to_wishlist')} icon={<Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />} aria-pressed={wishlisted} onClick={() => setWishlisted((value) => !value)} size="lg" className="rounded-xl border border-gray-200" /></div>

            {isWholesale && user?.assignedManagerName && <div className="mt-4 rounded-xl border bg-gray-50 p-3 text-sm"><p className="font-semibold">Your account manager: {user.assignedManagerName}</p><div className="mt-2 flex gap-3">{user.assignedManagerWhatsApp && <a className="font-semibold text-emerald-700" href={`https://wa.me/${user.assignedManagerWhatsApp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}{user.assignedManagerPhone && <a className="font-semibold text-fcs-brand-text" href={`tel:${user.assignedManagerPhone}`}>Call</a>}</div></div>}
            {!isWholesale && <><div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-gray-100" /><span className="text-xs text-fcs-text-muted">{t('common.or')}</span><span className="h-px flex-1 bg-gray-100" /></div><OrderViaWhatsApp product={{ id: product.id, name: product.name, slug: product.slug, price: product.price, stock: product.stock }} selectedShade={shade || undefined} selectedSize={product.volume || product.size || undefined} quantity={quantity} variant="compact" className="w-full" /></>}

            <div className="mt-6"><DeliveryEstimator orderTotal={displayPrice * quantity} /></div>
          </div>
        </div>

        <div id="product-details"><ProductTabs product={product} /></div>

        <RoutineRail products={related || []} />
      </div>

      {/* Mobile sticky buy bar. At 360px the real add-to-cart button sits
          550-700px down the page, behind a full-screen image gallery, so a
          first-time shopper never sees it. Hidden from md: up, where the
          two-column layout already keeps the button in view. Sits above the
          64px BottomNav and respects the iOS safe area. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden ${showStickyBuy ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        aria-hidden={!showStickyBuy}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-gray-900">{product.name}</p>
            <p className="text-base font-extrabold leading-tight text-fcs-brand-text">{formatRWF(displayPrice * quantity)}</p>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={outOfStock}
            tabIndex={showStickyBuy ? 0 : -1}
            className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-fcs-brand-strong px-6 text-sm font-bold text-white active:scale-[0.98] disabled:bg-gray-300"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {outOfStock ? t('common.sold_out') : t('product.add_to_cart')}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() { return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="grid gap-8 lg:grid-cols-2"><div className="aspect-square animate-pulse rounded-xl bg-gray-100" /><div className="space-y-4"><div className="h-3 w-24 animate-pulse rounded bg-rose-100" /><div className="h-12 w-4/5 animate-pulse rounded bg-gray-100" /><div className="h-8 w-40 animate-pulse rounded bg-rose-100" /><div className="h-24 animate-pulse rounded bg-gray-100" /><div className="h-12 animate-pulse rounded-xl bg-gray-100" /><div className="h-40 animate-pulse rounded-xl bg-gray-100" /></div></div></div> }
