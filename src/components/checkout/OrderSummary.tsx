'use client'

import type { CartItem } from '@/store/useStore'
import { formatRWF } from '@/lib/format'

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: number
  discount?: number
  deliveryFee?: number
  total: number
  couponCode?: string | null
  title?: string
}

export default function OrderSummary({ items, subtotal, discount = 0, deliveryFee = 0, total, couponCode, title = 'Order summary' }: OrderSummaryProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-black text-[#1a1a1a]">{title}</h2>
      <p className="mt-0.5 text-xs text-gray-500">{items.reduce((sum, item) => sum + item.quantity, 0)} units in {items.length} product{items.length === 1 ? '' : 's'}</p>
      <ul className="scrollbar-hide mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">{items.map((item) => <li key={item.productId} className="flex gap-3"><div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">{item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}<span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-[#1a1a1a] px-1 text-[9px] font-bold text-white">{item.quantity}</span></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-bold leading-5 text-gray-800">{item.name}</p><p className="text-[11px] text-gray-400">{formatRWF(item.price)} each</p></div><p className="shrink-0 text-xs font-black text-gray-800">{formatRWF(item.price * item.quantity)}</p></li>)}</ul>
      <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm"><div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="font-semibold text-gray-800">{formatRWF(subtotal)}</span></div>{discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount {couponCode && `(${couponCode})`}</span><span className="font-bold">−{formatRWF(discount)}</span></div>}<div className="flex justify-between text-gray-500"><span>Delivery</span><span className={`font-semibold ${deliveryFee === 0 ? 'text-emerald-600' : 'text-gray-800'}`}>{deliveryFee === 0 ? 'FREE' : formatRWF(deliveryFee)}</span></div><div className="flex items-baseline justify-between border-t border-gray-100 pt-3"><span className="font-black text-[#1a1a1a]">Total</span><span className="text-xl font-black text-[#B76E79]">{formatRWF(total)}</span></div></div>
    </section>
  )
}
