'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight, ExternalLink, Heart, ImageIcon, Minus, Plus, Share2, ShoppingCart, Star, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { Product } from '@/lib/types'
import { formatRWF } from '@/lib/format'
import { getProductImageGallery, optimizedImageSrcSet, optimizedImageUrl } from '@/lib/cloudinary-images'
import IconButton from '@/components/a11y/IconButton'
import { useStore } from '@/store/useStore'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useToast } from '@/hooks/use-toast'
import { announce } from '@/components/a11y/LiveAnnouncer'
import { buildWhatsAppShareUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'

interface QuickViewProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

interface DeliveryResult { deliveryTime?: string; feeFormatted?: string; message?: string }

export default function QuickView({ product, isOpen, onClose }: QuickViewProps) {
  const { t, language } = useLanguage()
  const user = useStore((state) => state.user)
  const addToCart = useStore((state) => state.addToCart)
  const { toast } = useToast()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)
  const touchStart = useRef({ x: 0, y: 0 })
  const historyPushed = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [zoomed, setZoomed] = useState(false)
  const [added, setAdded] = useState(false)
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistBusy, setWishlistBusy] = useState(false)
  const [delivery, setDelivery] = useState<DeliveryResult | null>(null)

  const gallery = useMemo(() => getProductImageGallery({ productImages: product.productImages, images: product.images, name: product.name }), [product])
  const activeImage = gallery[activeIndex]
  const outOfStock = product.isOutOfStock ?? product.stock < 1
  const isWholesale = user?.wholesaleStatus === 'APPROVED'
  const wholesalePrice = isWholesale && product.wholesalePrice ? product.wholesalePrice : null
  const displayPrice = wholesalePrice || product.price
  const comparePrice = wholesalePrice ? product.price : product.compareAt && product.compareAt > displayPrice ? product.compareAt : null
  const savings = comparePrice ? Math.max(0, comparePrice - displayPrice) : 0
  const discount = comparePrice && comparePrice > displayPrice ? Math.round((1 - displayPrice / comparePrice) * 100) : 0
  const total = displayPrice * quantity
  const size = product.volume || product.size
  const maxQuantity = Math.max(1, Math.min(99, product.stock))

  const nextImage = () => {
    if (gallery.length > 1) setActiveIndex((index) => index === gallery.length - 1 ? 0 : index + 1)
    setZoomed(false)
  }
  const previousImage = () => {
    if (gallery.length > 1) setActiveIndex((index) => index === 0 ? gallery.length - 1 : index - 1)
    setZoomed(false)
  }

  const finishClose = () => {
    if (historyPushed.current && window.history.state?.fcsQuickView) {
      window.history.back()
    } else {
      onClose()
    }
  }
  const requestClose = () => {
    if (closing) return
    setClosing(true)
    closeTimer.current = window.setTimeout(finishClose, 180)
  }

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.history.pushState({ ...window.history.state, fcsQuickView: true }, '')
    historyPushed.current = true
    const handlePopState = () => { historyPushed.current = false; onClose() }
    window.addEventListener('popstate', handlePopState)
    const animationFrame = window.requestAnimationFrame(() => setEntered(true))
    window.setTimeout(() => dialogRef.current?.focus(), 20)
    return () => {
      document.body.style.overflow = previousOverflow
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('popstate', handlePopState)
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    fetch(`/api/delivery/calculate?district=Gasabo&orderTotal=${total}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (result) setDelivery(result.data || result) })
      .catch(() => {})
    return () => controller.abort()
  }, [isOpen, total])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); requestClose(); return }
      if (event.key === 'ArrowRight') { event.preventDefault(); nextImage(); return }
      if (event.key === 'ArrowLeft') { event.preventDefault(); previousImage(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  const addProduct = () => {
    if (outOfStock) return
    const image = gallery[0]
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: displayPrice,
      retailPrice: product.price,
      wholesalePrice: product.wholesalePrice || undefined,
      image: image?.url || '',
      volume: size || undefined,
      stock: product.stock,
    }, quantity)
    setAdded(true)
    announce(`${quantity} ${product.name} added to cart`)
    window.setTimeout(() => setAdded(false), 2000)
  }

  const toggleWishlist = async () => {
    if (!user) { toast({ title: t('nav.sign_in_wishlist') }); return }
    setWishlistBusy(true)
    try {
      const response = await fetch('/api/wishlist', { method: wishlisted ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id }) })
      if (!response.ok) throw new Error()
      setWishlisted((value) => !value)
      toast({ title: wishlisted ? t('search.removed_wishlist') : t('search.saved_wishlist') })
    } catch { toast({ title: t('search.wishlist_failed'), variant: 'destructive' }) }
    finally { setWishlistBusy(false) }
  }

  const shareProduct = () => {
    const origin = window.location.origin
    const message = language === 'rw'
      ? `Reba ${product.name} kuri FreedomCosmeticShop — ${formatRWF(displayPrice)}\n${origin}/products/${product.slug}`
      : `View ${product.name} at FreedomCosmeticShop — ${formatRWF(displayPrice)}\n${origin}/products/${product.slug}`
    window.open(buildWhatsAppShareUrl(message), '_blank', 'noopener,noreferrer')
    trackWhatsAppClick('share_product', { productId: product.id, productSlug: product.slug, language: language === 'en' ? 'en' : 'rw', pagePath: '/products' })
  }

  if (!isOpen) return null

  return <div
    className={`fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm transition-opacity duration-200 md:items-center md:p-6 ${closing || !entered ? 'opacity-0' : 'opacity-100'}`}
    onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose() }}
    role="presentation"
  >
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`quick-view-title-${product.id}`}
      aria-describedby={product.shortDescription ? `quick-view-description-${product.id}` : undefined}
      tabIndex={-1}
      onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }}
      onTouchEnd={(event) => {
        const deltaX = touchStart.current.x - event.changedTouches[0].clientX
        const deltaY = event.changedTouches[0].clientY - touchStart.current.y
        if (deltaY > 90 && Math.abs(deltaX) < 70) requestClose()
        else if (Math.abs(deltaX) > 55 && Math.abs(deltaY) < 80) {
          if (deltaX > 0) nextImage()
          else previousImage()
        }
      }}
      className={`relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none transition-all duration-200 motion-reduce:transition-none md:max-h-[90vh] md:max-w-5xl md:flex-row md:rounded-3xl ${closing || !entered ? 'translate-y-6 scale-95 opacity-0 md:translate-y-0' : 'translate-y-0 scale-100 opacity-100'}`}
    >
      <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-gray-300 md:hidden" aria-hidden="true" />
      <IconButton label="Close Quick View" icon={<X className="h-5 w-5" />} onClick={requestClose} size="lg" className="absolute right-3 top-3 z-30 rounded-full bg-white/95 shadow-md" />

      <section className="relative h-[38vh] min-h-64 shrink-0 overflow-hidden bg-gradient-to-b from-gray-50 to-white md:h-auto md:min-h-[620px] md:w-[45%]">
        {activeImage ? <button type="button" onClick={() => setZoomed((value) => !value)} className="relative h-full w-full overflow-hidden" aria-label={zoomed ? t('product.zoom_out') : t('product.zoom_in')}>
          <img key={activeImage.publicId || activeImage.url} src={optimizedImageUrl(activeImage.url, 800)} srcSet={optimizedImageSrcSet(activeImage.url, [600, 800])} sizes="(max-width: 768px) 100vw, 45vw" alt={activeImage.altText || product.name} loading="eager" decoding="async" className={`h-full w-full object-contain p-6 transition-all duration-300 ${zoomed ? 'scale-150' : 'scale-100'}`} />
          <span className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-gray-700 shadow-sm">{zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}</span>
        </button> : <div className="flex h-full items-center justify-center text-center text-fcs-text-muted"><div><ImageIcon className="mx-auto h-14 w-14 text-gray-300" /><p className="mt-2 text-sm">{product.name}</p></div></div>}
        {gallery.length > 1 && <><IconButton label="Previous product image" icon={<ChevronLeft className="h-5 w-5" />} onClick={previousImage} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 shadow-md" /><IconButton label="Next product image" icon={<ChevronRight className="h-5 w-5" />} onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 shadow-md" /><div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white/85 px-3 py-2 shadow-sm">{gallery.map((image, index) => <button key={image.publicId || image.url} type="button" onClick={() => { setActiveIndex(index); setZoomed(false) }} className="grid h-6 w-6 place-items-center" aria-label={`Show image ${index + 1}`} aria-pressed={index === activeIndex}><span className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-5 bg-fcs-brand' : 'w-2 bg-gray-300'}`} /></button>)}</div></>}
      </section>

      <section className="ub-scroll flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 md:w-[55%] md:px-8 md:py-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-fcs-text-muted">{product.brand?.name || product.category?.name || t('product.beauty')}</p>
        <h2 id={`quick-view-title-${product.id}`} className="mt-1 pr-10 text-2xl font-black leading-tight text-gray-950 md:text-3xl">{product.name}</h2>
        {product.reviewsCount > 0 && <div className="mt-3 flex items-center gap-2" aria-label={t('product.rating_label', { rating: product.rating, count: product.reviewsCount })}><span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />)}</span><span className="text-xs text-gray-500">{product.rating.toFixed(1)} ({product.reviewsCount})</span></div>}
        <div className="my-5 h-px bg-gray-100" />

        <div className="flex flex-wrap items-baseline gap-3"><span className="text-3xl font-black tracking-tight text-fcs-brand-text">{formatRWF(displayPrice)}</span>{comparePrice && <span className="text-sm font-semibold text-fcs-text-muted line-through">{formatRWF(comparePrice)}</span>}{discount > 0 && <span className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-bold text-white">-{discount}%</span>}</div>
        {savings > 0 && <p className="mt-1 text-sm font-bold text-emerald-700">{t('product.you_save')} {formatRWF(savings)}{isWholesale ? t('product.per_unit') : ''}</p>}
        {isWholesale && <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">{t('nav.wholesale')}</span>}

        <div className="mt-4 flex flex-wrap gap-2">{size && <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">{size}</span>}{product.skinType?.slice(0, 3).map((skin) => <span key={skin} className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-[#9B5A64]">{skin.replaceAll('_', ' ')}</span>)}</div>
        {product.shortDescription && <p id={`quick-view-description-${product.id}`} className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">{product.shortDescription}</p>}

        <div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('cart.quantity')}</p><div className="mt-1 flex h-12 items-center overflow-hidden rounded-xl border border-gray-200"><IconButton label={t('product.decrease_quantity')} icon={<Minus className="h-4 w-4" />} onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} className="h-full rounded-none" /><span className="grid h-full min-w-12 place-items-center border-x text-sm font-black" aria-live="polite">{quantity}</span><IconButton label={t('product.increase_quantity')} icon={<Plus className="h-4 w-4" />} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} disabled={quantity >= maxQuantity} className="h-full rounded-none" /></div></div><div className="text-right"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('cart.total')}</p><p className="mt-1 text-xl font-black text-gray-950" aria-live="polite">{formatRWF(total)}</p></div></div>

        <button type="button" onClick={addProduct} disabled={outOfStock} className={`mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-black text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 ${added || isWholesale ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-fcs-brand-strong hover:bg-[#9B5A64]'}`}>{added ? <><Check className="h-5 w-5" />{t('product.added')}</> : <><ShoppingCart className="h-5 w-5" />{outOfStock ? t('common.sold_out') : `${t('product.add_to_cart')} — ${formatRWF(total)}`}</>}</button>

        <Link href={`/products/${product.slug}`} onClick={() => { historyPushed.current = false; window.history.replaceState({ ...window.history.state, fcsQuickView: false }, '') }} className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-800 hover:border-fcs-brand hover:text-fcs-brand-text">{t('product.view_full_details')}<ExternalLink className="h-4 w-4" /></Link>
        <div className="mt-3 grid grid-cols-2 gap-3"><button type="button" onClick={() => void toggleWishlist()} disabled={wishlistBusy} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gray-50 text-sm font-bold text-gray-700 hover:bg-rose-50 hover:text-fcs-brand-text"><Heart className={`h-4 w-4 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />{wishlisted ? t('product.saved') : t('nav.wishlist')}</button><button type="button" onClick={shareProduct} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800 hover:bg-emerald-100"><Share2 className="h-4 w-4" />WhatsApp</button></div>

        <div className="mt-5 grid gap-2 rounded-xl bg-gray-50 p-4 text-sm"><p className={`font-bold ${outOfStock ? 'text-red-600' : product.stock <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>{outOfStock ? t('common.sold_out') : product.stock <= 5 ? t('product.left_in_stock', { count: product.stock }) : t('common.in_stock')}</p>{delivery?.deliveryTime && <p className="text-gray-600"><span className="font-bold text-gray-800">{t('product.kigali_label')}:</span> {delivery.deliveryTime}{delivery.feeFormatted ? ` · ${delivery.feeFormatted}` : ''}</p>}</div>
      </section>
    </div>
  </div>
}
