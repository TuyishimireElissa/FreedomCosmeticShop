'use client'

import { MessageCircle } from 'lucide-react'
import type { CartItem } from '@/store/cartStore'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { buildCartOrderMessage, buildWhatsAppUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'

interface CartWhatsAppOrderProps {
  items: CartItem[]
  subtotal: number
  discount: number
  district: string
  deliveryFee: number | null
}

export default function CartWhatsAppOrder({ items, subtotal, discount, district, deliveryFee }: CartWhatsAppOrderProps) {
  const { t, language } = useLanguage()
  const lang = language === 'en' ? 'en' : 'rw'
  if (items.length === 0) return null
  const ready = Boolean(district) && deliveryFee !== null
  const total = ready ? Math.max(0, subtotal - discount + deliveryFee) : 0

  const orderWithWhatsApp = () => {
    if (!ready || deliveryFee === null) return
    const storeUrl = window.location.origin
    const message = buildCartOrderMessage({
      items: items.map((item) => ({
        name: item.name,
        nameRw: item.nameRw,
        quantity: item.quantity,
        price: item.price,
        size: item.volume || undefined,
        productUrl: new URL(item.isBundle ? `/bundles/${encodeURIComponent(item.slug)}` : `/products/${encodeURIComponent(item.slug)}`, storeUrl).toString(),
      })),
      subtotal,
      discount,
      district,
      deliveryFee,
      totalRWF: total,
      language: lang,
      storeUrl,
    })
    const whatsappUrl = buildWhatsAppUrl(message)
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    trackWhatsAppClick('order_cart', { cartTotal: total, district, language: lang, pagePath: '/cart' })
  }

  return <section className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4"><p className="text-sm font-bold text-gray-800">{t('whatsapp.cart_prefer')}</p><button type="button" onClick={orderWithWhatsApp} disabled={!ready} className="mt-3 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-black text-white transition-colors hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-gray-300"><MessageCircle className="h-5 w-5" />{t('whatsapp.order_cart')}</button><p className="mt-2 text-center text-xs leading-5 text-gray-500">{ready ? t('whatsapp.items_included', { count: items.length }) : t('whatsapp.select_district_first')}</p></section>
}
