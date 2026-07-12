'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRWF } from '@/lib/format'
import OrderSummary from '@/components/checkout/OrderSummary'

export default function CartPage() {
  const router = useRouter()
  const { items, updateQuantity, removeFromCart, cartSubtotal, appliedCoupon, setAppliedCoupon, clearCoupon } = useStore()
  const [coupon, setCoupon] = useState(appliedCoupon?.code || '')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const subtotal = cartSubtotal()
  const discount = appliedCoupon?.discountAmount || 0
  const estimatedDelivery = appliedCoupon?.freeShipping ? 0 : 1000
  const total = Math.max(0, subtotal - discount + estimatedDelivery)

  const applyCoupon = async () => {
    if (!coupon.trim()) return
    setCouponLoading(true); setCouponError(null)
    try {
      const response = await fetch('/api/coupons/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: coupon.trim(), subtotal }) })
      const data = await response.json()
      if (!response.ok || !data.valid) throw new Error(data.error || 'Coupon is invalid')
      setAppliedCoupon({ code: data.coupon.code, type: data.coupon.type, value: data.coupon.value, discountAmount: data.discountAmount, freeShipping: data.freeShipping })
      setCoupon(data.coupon.code)
    } catch (reason) { setCouponError(reason instanceof Error ? reason.message : 'Coupon could not be applied') }
    finally { setCouponLoading(false) }
  }

  if (items.length === 0) {
    return <div className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center px-4 py-16 text-center"><div><span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-rose-50 text-[#B76E79]"><ShoppingBag className="h-11 w-11" /></span><h1 className="mt-6 text-3xl font-black text-[#1a1a1a]">Your beauty bag is empty</h1><p className="mt-2 text-sm text-gray-500">Discover authentic skincare, makeup and haircare selected for Rwanda.</p><Link href="/products" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#B76E79] px-6 py-3 text-sm font-bold text-white">Start shopping <ArrowRight className="h-4 w-4" /></Link></div></div>
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-4"><div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B76E79]">Your selection</span><h1 className="mt-2 text-3xl font-black text-[#1a1a1a]">Shopping cart</h1><p className="mt-1 text-sm text-gray-500">{items.reduce((sum, item) => sum + item.quantity, 0)} items ready for checkout</p></div><Link href="/products" className="hidden text-sm font-bold text-[#B76E79] sm:block">Continue shopping →</Link></div>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <ul className="space-y-3">{items.map((item) => <li key={item.productId} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"><Link href={`/products/${item.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-28">{item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[10px] text-gray-400">No image</span>}</Link><div className="flex min-w-0 flex-1 flex-col"><div className="flex items-start justify-between gap-2"><Link href={`/products/${item.slug}`} className="line-clamp-2 text-sm font-bold leading-5 text-gray-800 hover:text-[#B76E79] sm:text-base">{item.name}</Link><button type="button" onClick={() => removeFromCart(item.productId)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${item.name}`}><Trash2 className="h-4 w-4" /></button></div><p className="mt-1 text-xs text-gray-400">{formatRWF(item.price)} each</p><div className="mt-auto flex items-end justify-between gap-3 pt-3"><div className="flex h-9 items-center overflow-hidden rounded-xl border border-gray-200"><button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} disabled={item.quantity <= 1} className="grid h-full w-9 place-items-center disabled:opacity-35"><Minus className="h-3.5 w-3.5" /></button><span className="grid h-full min-w-9 place-items-center border-x border-gray-200 text-xs font-black">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock} className="grid h-full w-9 place-items-center disabled:opacity-35"><Plus className="h-3.5 w-3.5" /></button></div><p className="text-sm font-black text-[#B76E79] sm:text-base">{formatRWF(item.price * item.quantity)}</p></div></div></li>)}</ul>

            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Tag className="h-4 w-4 text-[#B76E79]" /><h2 className="text-sm font-black">Coupon code</h2></div>{appliedCoupon ? <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5"><span><strong className="block text-sm text-emerald-800">{appliedCoupon.code} applied</strong><span className="text-xs text-emerald-600">You save {formatRWF(discount)}</span></span><button type="button" onClick={() => { clearCoupon(); setCoupon('') }} className="grid h-8 w-8 place-items-center rounded-full hover:bg-emerald-100"><X className="h-4 w-4 text-emerald-700" /></button></div> : <><div className="mt-3 flex gap-2"><input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === 'Enter' && applyCoupon()} placeholder="Enter BEAUTY20" className="input-field h-11 flex-1" /><button type="button" onClick={applyCoupon} disabled={couponLoading || !coupon.trim()} className="rounded-xl bg-[#1a1a1a] px-5 text-sm font-bold text-white disabled:opacity-50">{couponLoading ? 'Applying…' : 'Apply'}</button></div>{couponError && <p className="mt-2 text-xs font-semibold text-red-600">{couponError}</p>}<p className="mt-2 text-xs text-gray-400">Use <strong className="text-[#B76E79]">BEAUTY20</strong> for 20% off.</p></>}</section>
          </div>

          <aside className="lg:sticky lg:top-40"><OrderSummary items={items} subtotal={subtotal} discount={discount} deliveryFee={estimatedDelivery} total={total} couponCode={appliedCoupon?.code} /><p className="mt-2 text-center text-[10px] text-gray-400">Delivery shown for Kigali; your exact district fee is calculated at checkout.</p><button type="button" onClick={() => router.push('/checkout')} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 text-sm font-black text-white shadow-lg shadow-[#B76E79]/20 hover:bg-[#a55d68]">Secure checkout <ArrowRight className="h-4 w-4" /></button><div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-semibold text-gray-500"><span>🔒 Secure</span><span>💛 MTN MoMo</span><span>🇷🇼 Rwanda</span></div></aside>
        </div>
      </div>
    </div>
  )
}
