'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Check, Heart, MessageCircle, Minus, Plus, ShoppingCart, Trash2, Truck, X } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import CartWhatsAppOrder from '@/components/cart/CartWhatsAppOrder'
import { useStore } from '@/store/useStore'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { TranslationVariables } from '@/lib/i18n'
import { formatRWF } from '@/lib/format'
import type { CartItem } from '@/store/cartStore'
import { buildWhatsAppShareUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'
import IconButton from '@/components/a11y/IconButton'

interface DeliveryResult { fee: number; deliveryTime: string; isFreeDelivery: boolean; freeDeliveryThreshold: number; amountNeededForFree: number }
interface CouponPreview {
  coupon: { code: string; type: string; value: number; description?: string | null; minOrderAmount: number | null; maxDiscountAmount: number | null; endsAt: string | null; usageRemaining: number | null; usageLimitPerUser: number; appliesToAllProducts: boolean }
  discountAmount: number
  freeShipping: boolean
  canApply: boolean
  rejectionReason: string | null
}
interface CrossSell { id: string; name: string; slug: string; price: number; compareAt: number | null; stock: number; volume: string | null; categorySlug: string; brandName: string | null; imageUrl: string | null; imagePublicId: string | null; imageAlt: string }

export default function CartView() {
  const { t, language } = useLanguage()
  const cart = useCart()
  const appliedCoupon = useStore((state) => state.appliedCoupon)
  const setAppliedCoupon = useStore((state) => state.setAppliedCoupon)
  const clearCoupon = useStore((state) => state.clearCoupon)
  const [districts, setDistricts] = useState<Array<{ province: string; districts: string[] }>>([])
  const [delivery, setDelivery] = useState<DeliveryResult | null>(null)
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || '')
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null)
  const [crossSells, setCrossSells] = useState<CrossSell[]>([])
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/delivery/districts', { signal: controller.signal }).then((response) => response.json()).then((result) => setDistricts(result.provinces || [])).catch(() => {})
    return () => controller.abort()
  }, [])

  const productIds = cart.items.filter((item) => !item.isBundle).map((item) => item.productId).join(',')
  useEffect(() => {
    if (!productIds) { setCrossSells([]); return }
    const controller = new AbortController()
    fetch(`/api/products/cross-sells?productIds=${encodeURIComponent(productIds)}&limit=6`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((result) => setCrossSells(result.data?.products || result.products || []))
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setCrossSells([]) })
    return () => controller.abort()
  }, [productIds])

  useEffect(() => {
    if (!cart.selectedDistrict) { setDelivery(null); return }
    const controller = new AbortController()
    fetch(`/api/delivery/calculate?district=${encodeURIComponent(cart.selectedDistrict)}&orderTotal=${cart.subtotal}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((result) => setDelivery(result.data || result))
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setDelivery(null) })
    return () => controller.abort()
  }, [cart.selectedDistrict, cart.subtotal])

  useEffect(() => {
    if (!appliedCoupon?.code) return
    const controller = new AbortController()
    fetch('/api/coupons/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ code: appliedCoupon.code, items: cart.items.filter((item) => !item.isBundle).map((item) => ({ productId: item.productId, quantity: item.quantity })) }) })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((result) => { const preview = result.data || result; if (!preview.canApply) clearCoupon(); else setAppliedCoupon({ code: preview.coupon.code, type: preview.coupon.type, value: preview.coupon.value, discountAmount: preview.discountAmount, freeShipping: preview.freeShipping }) })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) clearCoupon() })
    return () => controller.abort()
  }, [appliedCoupon?.code, cart.items, cart.subtotal, clearCoupon, productIds, setAppliedCoupon])

  const previewCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true); setCouponError(''); setCouponPreview(null)
    try {
      const response = await fetch('/api/coupons/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: couponCode.trim(), items: cart.items.filter((item) => !item.isBundle).map((item) => ({ productId: item.productId, quantity: item.quantity })) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(t('cart.coupon_invalid'))
      const preview = result.data || result
      setCouponPreview(preview)
      if (!preview.canApply) setCouponError(couponRejectionMessage(preview.rejectionReason, preview.coupon.minOrderAmount, cart.subtotal, t))
    } catch (error) { setCouponError(error instanceof Error ? error.message : t('cart.coupon_invalid')) }
    finally { setCouponLoading(false) }
  }
  const applyCoupon = () => {
    if (!couponPreview || !couponPreview.canApply) return
    setAppliedCoupon({ code: couponPreview.coupon.code, type: couponPreview.coupon.type, value: couponPreview.coupon.value, discountAmount: couponPreview.discountAmount, freeShipping: couponPreview.freeShipping })
    setCouponPreview(null)
  }
  const discount = appliedCoupon?.discountAmount || 0
  const deliveryFee = appliedCoupon?.freeShipping ? 0 : delivery?.fee || 0
  const total = Math.max(0, cart.subtotal - discount + deliveryFee)

  const share = () => {
    const items = cart.items.map((item) => `• ${item.name} ×${item.quantity} — ${formatRWF(item.price * item.quantity)}`).join('\n')
    const message = t('cart.share_message', { items, subtotal: formatRWF(cart.subtotal) })
    window.open(buildWhatsAppShareUrl(message), '_blank', 'noopener,noreferrer')
    trackWhatsAppClick('share_cart', { cartTotal: cart.subtotal, district: cart.selectedDistrict || undefined, language: language === 'en' ? 'en' : 'rw', pagePath: '/cart' })
  }

  if (cart.items.length === 0 && cart.savedItems.length === 0) return <main className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center px-4 py-16 text-center"><div><span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-rose-50"><ShoppingCart className="h-10 w-10 text-[#B76E79]" /></span><h1 className="mt-5 text-3xl font-black">{t('empty.cart')}</h1><p className="mt-2 text-sm text-gray-500">{t('empty.cart_hint')}</p><Link href="/products" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#B76E79] px-6 font-bold text-white">{t('cart.browse_products')}</Link></div></main>

  return <main className="mx-auto max-w-6xl px-4 py-6"><h1 className="text-2xl font-black">{t('cart.title')} <span className="text-sm font-medium text-gray-400">({t('cart.items', { count: cart.itemCount })})</span></h1>
    {cart.lastRemoved && Date.now() - cart.lastRemoved.timestamp <= 10_000 && <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-4 right-4 z-[70] flex items-center gap-3 rounded-2xl bg-gray-900 p-3 text-white shadow-xl sm:left-auto sm:w-96"><span className="min-w-0 flex-1 truncate text-sm">{t('cart.undo_remove', { name: cart.lastRemoved.item.name })}</span><button type="button" onClick={cart.undoRemove} className="min-h-11 rounded-xl bg-white px-4 text-sm font-black text-[#B76E79]">{t('cart.undo')}</button></div>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"><div className="space-y-4">
      {delivery && <section className="rounded-2xl border bg-white p-4"><p className="flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4 text-[#B76E79]" />{delivery.isFreeDelivery ? t('cart.free_delivery_achieved') : t('cart.free_delivery_hint', { amount: formatRWF(delivery.amountNeededForFree) })}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-[#B76E79]" style={{ width: `${Math.min(100, delivery.freeDeliveryThreshold > 0 ? cart.subtotal / delivery.freeDeliveryThreshold * 100 : 0)}%` }} /></div></section>}
      {cart.items.map((item) => <CartRow key={item.productId} item={item} onRemove={() => cart.removeItem(item.productId)} onSave={() => cart.saveForLater(item.productId)} onQuantity={(quantity) => cart.updateQuantity(item.productId, quantity)} />)}
      {cart.savedItems.length > 0 && <section className="rounded-2xl border bg-white p-4"><h2 className="font-black">{t('cart.saved_for_later', { count: cart.savedItems.length })}</h2><div className="mt-3 space-y-2">{cart.savedItems.map((item) => <div key={item.productId} className="flex items-center gap-3 border-t pt-2"><span className="min-w-0 flex-1 truncate text-sm font-bold">{item.name}</span><button type="button" onClick={() => cart.moveToCart(item.productId)} className="min-h-11 px-3 text-xs font-bold text-[#B76E79]">{t('cart.move_to_cart')}</button><IconButton label={`${t('cart.remove')}: ${item.name}`} icon={<X className="h-4 w-4" />} variant="danger" onClick={() => cart.removeSaved(item.productId)} /></div>)}</div></section>}
      <section className="rounded-2xl border bg-white p-4"><h2 className="flex items-center gap-2 font-black"><Truck className="h-4 w-4 text-[#B76E79]" />{t('cart.delivery_estimate')}</h2><select value={cart.selectedDistrict} onChange={(event) => cart.setDistrict(event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-base"><option value="">{t('delivery.select_district')}</option>{districts.map((group) => <optgroup key={group.province} label={group.province}>{group.districts.map((district) => <option key={district}>{district}</option>)}</optgroup>)}</select>{delivery && <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm"><p className="flex justify-between"><span>{delivery.deliveryTime}</span><strong>{delivery.fee === 0 ? t('common.free') : formatRWF(delivery.fee)}</strong></p></div>}</section>
      <button type="button" onClick={share} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-50 font-bold text-green-700"><MessageCircle className="h-5 w-5" />{t('cart.share_whatsapp')}</button>
      {crossSells.length > 0 && <section className="rounded-2xl border bg-white p-4"><h2 className="font-black">{t('cart.complete_routine')}</h2><p className="mt-1 text-xs text-gray-500">{t('cart.same_category_suggestions')}</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{crossSells.map((product) => <article key={product.id} className="overflow-hidden rounded-xl border"><Link href={`/products/${product.slug}`} className="relative block aspect-square bg-gray-50">{product.imageUrl && <Image src={product.imageUrl} alt={product.imageAlt} fill sizes="(max-width: 640px) 45vw, 180px" className="object-contain p-2" />}</Link><div className="p-3"><Link href={`/products/${product.slug}`} className="line-clamp-2 text-xs font-bold">{product.name}</Link><p className="mt-2 text-sm font-black text-[#B76E79]">{formatRWF(product.price)}</p><button type="button" onClick={() => cart.addToCart({ productId: product.id, name: product.name, slug: product.slug, price: product.price, comparePrice: product.compareAt || undefined, quantity: 1, maxQuantity: product.stock, image: product.imageUrl || undefined, imagePublicId: product.imagePublicId || undefined, imageAlt: product.imageAlt, volume: product.volume || undefined, brandName: product.brandName || undefined, categorySlug: product.categorySlug })} className="mt-2 flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-rose-50 px-2 text-xs font-black text-[#B76E79]"><Plus className="h-4 w-4" />{t('product.add_to_cart')}</button></div></article>)}</div></section>}
    </div>
    <aside className="rounded-2xl border bg-white p-5 lg:sticky lg:top-36"><h2 className="font-black">{t('cart.total')}</h2><Summary label={t('cart.subtotal')} value={formatRWF(cart.subtotal)} />{discount > 0 && <Summary label={t('cart.discount')} value={`−${formatRWF(discount)}`} green />}{cart.selectedDistrict && <Summary label={t('cart.delivery')} value={deliveryFee === 0 ? t('common.free') : formatRWF(deliveryFee)} />}<div className="mt-4 border-t pt-4"><Summary label={t('cart.total')} value={formatRWF(total)} strong /></div>
      {!appliedCoupon ? <div className="mt-5 border-t pt-4"><div className="flex gap-2"><input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponPreview(null); setCouponError('') }} placeholder={t('cart.coupon_placeholder')} className="min-h-11 min-w-0 flex-1 rounded-xl border px-3" /><button type="button" onClick={previewCoupon} disabled={couponLoading} className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white">{couponLoading ? t('cart.applying') : t('cart.apply_coupon')}</button></div>{couponError && <p className="mt-2 flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{couponError}</p>}{couponPreview && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><h3 className="font-bold text-amber-900">{t('cart.coupon_terms_title')}</h3>{couponPreview.coupon.description && <p className="mt-1 text-xs text-amber-800">{couponPreview.coupon.description}</p>}<ul className="mt-2 space-y-1 text-xs text-amber-900"><li>{couponBenefit(couponPreview, t)}</li>{couponPreview.coupon.minOrderAmount !== null && <li>{t('cart.coupon_minimum', { amount: formatRWF(couponPreview.coupon.minOrderAmount) })}</li>}{couponPreview.coupon.maxDiscountAmount !== null && <li>{t('cart.coupon_maximum', { amount: formatRWF(couponPreview.coupon.maxDiscountAmount) })}</li>}{couponPreview.coupon.endsAt && <li>{t('cart.coupon_expires', { date: new Date(couponPreview.coupon.endsAt).toLocaleDateString() })}</li>}{couponPreview.coupon.usageRemaining !== null && <li>{t('cart.coupon_uses_remaining', { count: couponPreview.coupon.usageRemaining })}</li>}<li>{t('cart.coupon_per_customer', { count: couponPreview.coupon.usageLimitPerUser })}</li>{!couponPreview.coupon.appliesToAllProducts && <li>{t('cart.coupon_selected_only')}</li>}</ul>{couponPreview.canApply && <p className="mt-2 flex items-center gap-1 text-sm font-bold text-emerald-700"><Check className="h-4 w-4" />{couponPreview.freeShipping ? t('cart.coupon_free_delivery') : t('cart.coupon_will_save', { amount: formatRWF(couponPreview.discountAmount) })}</p>}<button type="button" onClick={applyCoupon} disabled={!couponPreview.canApply} className="mt-3 min-h-11 w-full rounded-xl bg-[#B76E79] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{t('cart.apply_coupon')}</button></div>}</div> : <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 p-3"><span className="text-sm font-bold text-emerald-800">{appliedCoupon.code}</span><IconButton label={t('cart.remove_coupon')} icon={<X className="h-4 w-4" />} onClick={() => { clearCoupon(); setCouponCode('') }} variant="ghost" /></div>}
      <Link href="/checkout" className="mt-5 hidden min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B76E79] font-black text-white md:flex">{t('cart.checkout')}<ArrowRight className="h-4 w-4" /></Link><CartWhatsAppOrder items={cart.items} subtotal={cart.subtotal} discount={discount} district={cart.selectedDistrict} deliveryFee={delivery ? deliveryFee : null} /></aside></div>
    {cart.items.length > 0 && <div className="h-24 md:hidden" />}<div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,.08)] md:hidden"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="text-xs text-gray-500">{t('cart.items', { count: cart.itemCount })}</p><p className="text-lg font-black text-[#B76E79]">{formatRWF(total)}</p></div><Link href="/checkout" className="flex min-h-[52px] items-center rounded-2xl bg-[#B76E79] px-6 font-black text-white">{t('cart.checkout')}</Link></div></div>
  </main>
}


type Translate = (key: string, params?: TranslationVariables) => string
function couponBenefit(preview: CouponPreview, t: Translate) {
  if (preview.coupon.type === 'FREE_SHIPPING') return t('cart.coupon_free_delivery')
  if (preview.coupon.type === 'PERCENTAGE') return t('cart.coupon_percent_off', { value: preview.coupon.value })
  return t('cart.coupon_fixed_off', { amount: formatRWF(preview.coupon.value) })
}
function couponRejectionMessage(reason: string | null, minimum: number | null, subtotal: number, t: Translate) {
  if (reason === 'MINIMUM_ORDER' && minimum !== null) return t('cart.coupon_cannot_apply', { amount: formatRWF(Math.max(0, minimum - subtotal)) })
  if (reason === 'EXPIRED') return t('cart.coupon_expired')
  if (reason === 'NOT_STARTED') return t('cart.coupon_not_started')
  if (reason === 'USAGE_LIMIT' || reason === 'USER_LIMIT') return t('cart.coupon_usage_reached')
  if (reason === 'NO_ELIGIBLE_ITEMS') return t('cart.coupon_no_eligible_items')
  if (reason === 'EMPTY_CART') return t('cart.coupon_empty_cart')
  return t('cart.coupon_invalid')
}
function CartRow({ item, onRemove, onSave, onQuantity }: { item: CartItem; onRemove: () => void; onSave: () => void; onQuantity: (quantity: number) => void }) { const { t } = useLanguage(); const image = item.imagePublicId ? `https://res.cloudinary.com/dohoc0tmp/image/upload/w_300,h_300,c_fill,q_auto,f_auto/${item.imagePublicId}` : item.image; return <article className="rounded-2xl border bg-white p-4"><div className="flex gap-3"><Link href={item.isBundle ? `/bundles/${item.slug}` : `/products/${item.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50">{image && <Image src={image} alt={item.imageAlt || item.name} fill sizes="80px" className="object-contain p-1" />}</Link><div className="min-w-0 flex-1"><h2 className="line-clamp-2 text-sm font-bold">{item.name}</h2>{item.volume && <p className="text-xs text-gray-400">{item.volume}</p>}<p className="mt-1 font-black text-[#B76E79]">{formatRWF(item.price * item.quantity)}</p><p className="mt-1 text-xs text-gray-500">{t('cart.stock_available', { count: item.maxQuantity })}</p></div><IconButton label={`${t('cart.remove')}: ${item.name}`} icon={<Trash2 className="h-4 w-4" />} variant="danger" onClick={onRemove} /></div><div className="mt-3 flex items-center justify-between border-t pt-3"><div className="flex h-11 items-center overflow-hidden rounded-xl border"><IconButton label={`${t('product.decrease_quantity')}: ${item.name}`} icon={<Minus className="h-4 w-4" />} onClick={() => onQuantity(item.quantity - 1)} disabled={item.quantity <= 1} className="rounded-none" /><span className="grid h-11 min-w-11 place-items-center border-x text-sm font-black">{item.quantity}</span><IconButton label={`${t('product.increase_quantity')}: ${item.name}`} icon={<Plus className="h-4 w-4" />} onClick={() => onQuantity(item.quantity + 1)} disabled={item.quantity >= item.maxQuantity} className="rounded-none" /></div><button type="button" onClick={onSave} className="flex min-h-11 items-center gap-1.5 px-2 text-xs font-bold text-gray-500"><Heart className="h-4 w-4" />{t('cart.save_for_later')}</button></div>{item.quantity >= item.maxQuantity && <p className="mt-2 text-xs font-semibold text-amber-700">{t('cart.max_reached')}</p>}</article> }
function Summary({ label, value, green, strong }: { label: string; value: string; green?: boolean; strong?: boolean }) { return <p className={`mt-3 flex justify-between text-sm ${strong ? 'text-base font-black' : ''} ${green ? 'text-emerald-700' : ''}`}><span>{label}</span><span>{value}</span></p> }
