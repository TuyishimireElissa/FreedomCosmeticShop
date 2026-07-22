'use client'

import type { CartItem } from '@/store/useStore'
import { formatRWF } from '@/lib/format'
import { useT } from '@/lib/i18n/LanguageContext'

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: number
  discount?: number
  deliveryFee?: number
  total: number
  couponCode?: string | null
  title?: string
}

export default function OrderSummary({ items, subtotal, discount = 0, deliveryFee = 0, total, couponCode, title }: OrderSummaryProps) {
  const t = useT()
  return (
    <section className="rounded-xl border border-[#EEEEEE] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
      <h2 className="text-lg font-bold text-[#1a1a1a]">{title || t('checkout.order_summary')}</h2>
      <p className="mt-0.5 text-xs text-gray-500">{t('checkout.summary_counts', { units: items.reduce((sum, item) => sum + item.quantity, 0), products: items.length })}</p>
      <ul className="scrollbar-hide mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">{items.map((item) => <li key={item.productId} className="flex gap-3"><div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#FAFAFA]">{item.image && <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" />}<span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-[#1a1a1a] px-1 text-[9px] font-bold text-white">{item.quantity}</span></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-bold leading-5 text-gray-800">{item.name}</p><p className="text-[11px] text-gray-400">{t('cart.price_each', { price: formatRWF(item.price) })}</p></div><p className="shrink-0 text-xs font-black text-gray-800">{formatRWF(item.price * item.quantity)}</p></li>)}</ul>
      <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm"><div className="flex justify-between text-gray-500"><span>{t('cart.subtotal')}</span><span className="font-semibold text-gray-800">{formatRWF(subtotal)}</span></div>{discount > 0 && <div className="flex justify-between text-emerald-600"><span>{t('cart.discount')} {couponCode && `(${couponCode})`}</span><span className="font-bold">−{formatRWF(discount)}</span></div>}<div className="flex justify-between text-gray-500"><span>{t('cart.delivery')}</span><span className={`font-semibold ${deliveryFee === 0 ? 'text-emerald-600' : 'text-gray-800'}`}>{deliveryFee === 0 ? t('common.free') : formatRWF(deliveryFee)}</span></div><div className="flex items-baseline justify-between border-t border-gray-100 pt-3"><span className="font-bold text-[#1a1a1a]">{t('cart.total')}</span><span className="text-xl font-extrabold text-[#B76E79]">{formatRWF(total)}</span></div></div>
    </section>
  )
}
