'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, Heart, Minus, Plus, RefreshCw, ShieldCheck, ShoppingBag, Star } from 'lucide-react'
import type { Product } from '@/lib/types'
import { formatRWF } from '@/lib/format'
import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/use-toast'
import ProductImageGallery from '@/components/products/ProductImageGallery'
import ProductTabs from '@/components/products/ProductTabs'
import DeliveryEstimator from '@/components/products/DeliveryEstimator'
import ProductGrid from '@/components/products/ProductGrid'
import { useT } from '@/lib/i18n/LanguageContext'
import { getProductPrimaryImage } from '@/lib/cloudinary-images'

interface ProductResponse { product: Product; related: Product[] }

export default function ProductDetailClient({ slug }: { slug: string }) {
  const t = useT()
  const router = useRouter()
  const addToCart = useStore((state) => state.addToCart)
  const { toast } = useToast()
  const [data, setData] = useState<ProductResponse | null>(null)
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
  }, [slug, request])

  if (loading) return <DetailSkeleton />
  if (error || !data) return <div className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 py-16 text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-[#B76E79]"><ShoppingBag className="h-7 w-7" /></div><h1 className="mt-5 text-2xl font-black text-[#1a1a1a]">{error || t('product.product_not_found')}</h1><p className="mt-2 text-sm text-gray-500">{t('product.unavailable_hint')}</p><div className="mt-6 flex justify-center gap-3"><button type="button" onClick={() => router.push('/products')} className="rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white">{t('product.browse_products')}</button><button type="button" onClick={() => setRequest((value) => value + 1)} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold"><RefreshCw className="h-4 w-4" />{t('common.retry')}</button></div></div></div>

  const { product, related } = data
  const outOfStock = product.stock < 1
  const lowStock = product.stock > 0 && product.stock <= product.lowStockThreshold
  const discount = product.compareAt && product.compareAt > product.price ? Math.round((1 - product.price / product.compareAt) * 100) : 0
  const primaryImage = getProductPrimaryImage(product)

  const add = () => {
    if (outOfStock) return
    addToCart({ productId: product.id, slug: product.slug, name: product.name, price: product.price, image: primaryImage?.url || '', stock: product.stock }, quantity)
    toast({ title: t('product.added'), description: `${quantity} × ${product.name}${shade ? ` · ${shade}` : ''}` })
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <nav className="mb-5 flex items-center gap-2 text-xs text-gray-500"><button type="button" onClick={() => router.push('/products')} className="flex items-center gap-1 font-semibold hover:text-[#B76E79]"><ChevronLeft className="h-3.5 w-3.5" />{t('nav.products')}</button><span>/</span><span>{product.category?.name || t('product.beauty')}</span><span>/</span><span className="min-w-0 truncate font-semibold text-gray-800">{product.name}</span></nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductImageGallery productImages={product.productImages || []} legacyImages={product.images || []} productName={product.name} videoUrl={product.videoUrl} discount={discount} outOfStock={outOfStock} isAuthentic={product.isAuthentic === true} />

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B76E79]">{product.brand?.name || t('product.beauty')}</p>
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-[#1a1a1a] sm:text-4xl">{product.name}</h1>
            <button type="button" onClick={() => document.getElementById('product-details')?.scrollIntoView({ behavior: 'smooth' })} className="mt-3 flex items-center gap-2">{product.reviewsCount > 0 ? <><span className="flex">{[1,2,3,4,5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= Math.round(product.rating) ? 'fill-[#FFD700] text-[#FFD700]' : 'fill-gray-200 text-gray-200'}`} />)}</span><span className="text-sm font-bold">{product.rating.toFixed(1)}</span><span className="text-xs text-gray-400">{t('product.reviews_count', { count: product.reviewsCount })}</span></> : <span className="text-sm font-semibold text-gray-500">{t('product.no_reviews')}</span>}</button>

            <div className="mt-5 flex flex-wrap items-baseline gap-3"><span className="text-3xl font-black text-[#B76E79]">{formatRWF(product.price)}</span>{product.compareAt && product.compareAt > product.price && <span className="text-base text-gray-400 line-through">{formatRWF(product.compareAt)}</span>}{discount > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">{t('product.save_percent', { percent: discount })}</span>}</div>
            <div className="mt-3 flex flex-wrap gap-2">{outOfStock ? <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{t('common.sold_out')}</span> : lowStock ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{t('common.low_stock', { count: product.stock })}</span> : <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><Check className="h-3.5 w-3.5" />{t('common.in_stock')}</span>}{product.isAuthentic === true && <span className="flex items-center gap-1 rounded-full border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />{t('common.authentic')}</span>}</div>
            {product.shortDescription && <p className="mt-5 text-sm leading-7 text-gray-600">{product.shortDescription}</p>}

            {product.shades && product.shades.length > 0 && <div className="mt-6"><p className="text-xs font-black uppercase tracking-wider text-gray-500">{t('product.select_shade')} <span className="ml-1 normal-case text-[#B76E79]">{shade}</span></p><div className="mt-2 flex flex-wrap gap-2">{product.shades.map((value) => <button key={value} type="button" onClick={() => setShade(value)} className={`rounded-xl border-2 px-3 py-2 text-sm font-bold ${shade === value ? 'border-[#B76E79] bg-rose-50 text-[#B76E79]' : 'border-gray-200 text-gray-600'}`}>{value}</button>)}</div></div>}

            <div className="mt-7 flex flex-wrap gap-3"><div className="flex h-12 items-center overflow-hidden rounded-xl border border-gray-200"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} className="grid h-full w-11 place-items-center hover:bg-gray-50 disabled:opacity-40"><Minus className="h-4 w-4" /></button><span className="grid h-full min-w-11 place-items-center border-x border-gray-200 text-sm font-black">{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))} disabled={quantity >= product.stock} className="grid h-full w-11 place-items-center hover:bg-gray-50 disabled:opacity-40"><Plus className="h-4 w-4" /></button></div><button type="button" onClick={add} disabled={outOfStock} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-6 text-sm font-black text-white shadow-lg shadow-[#B76E79]/20 hover:bg-[#a55d68] disabled:bg-gray-300"><ShoppingBag className="h-5 w-5" />{outOfStock ? t('common.sold_out') : `${t('product.add_to_cart')} · ${formatRWF(product.price * quantity)}`}</button><button type="button" onClick={() => setWishlisted((value) => !value)} className="grid h-12 w-12 place-items-center rounded-xl border border-gray-200" aria-label={t('product.add_to_wishlist')}><Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} /></button></div>

            <div className="mt-6"><DeliveryEstimator orderTotal={product.price * quantity} /></div>
          </div>
        </div>

        <div id="product-details"><ProductTabs product={product} /></div>

        <section className="mt-14 sm:mt-16"><div className="mb-6"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B76E79]">{t('product.complete_routine')}</span><h2 className="mt-2 text-2xl font-black text-[#1a1a1a] sm:text-3xl">{t('product.related')}</h2></div><ProductGrid products={related || []} /></section>
      </div>
    </div>
  )
}

function DetailSkeleton() { return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="grid gap-8 lg:grid-cols-2"><div className="aspect-square animate-pulse rounded-3xl bg-gray-100" /><div className="space-y-4"><div className="h-3 w-24 animate-pulse rounded bg-rose-100" /><div className="h-12 w-4/5 animate-pulse rounded bg-gray-100" /><div className="h-8 w-40 animate-pulse rounded bg-rose-100" /><div className="h-24 animate-pulse rounded bg-gray-100" /><div className="h-12 animate-pulse rounded-xl bg-gray-100" /><div className="h-40 animate-pulse rounded-2xl bg-gray-100" /></div></div></div> }
