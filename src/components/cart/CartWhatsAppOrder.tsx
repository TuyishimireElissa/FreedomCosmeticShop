'use client'

import { MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { CartItem } from '@/store/cartStore'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { trackWhatsAppClick, WA_CONFIG } from '@/lib/whatsapp-service'

interface CartWhatsAppOrderProps {
  items: CartItem[]
  subtotal: number
  discount: number
  district: string
  deliveryFee: number | null
}

/**
 * Cart -> WhatsApp order hand-off.
 *
 * This used to build a wa.me message from cart state and open it directly.
 * Nothing was persisted, so an order placed this way existed only inside the
 * customer's WhatsApp app: it never appeared in /admin/whatsapp-orders, never
 * received an FC- reference, never decremented stock, and vanished entirely if
 * the customer closed the tab without sending.
 *
 * /api/orders/whatsapp — which saves the order before wa.me opens and
 * recomputes every price server-side — requires a name, phone and district.
 * The cart deliberately collects none of those, and cart state is out of
 * scope to change. So the button now carries the shopper to checkout, which
 * collects exactly those fields and then goes through the saving endpoint.
 * One saved-order path, not two, and the WhatsApp-first flow is preserved.
 */
export default function CartWhatsAppOrder({ items, subtotal, discount, district, deliveryFee }: CartWhatsAppOrderProps) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const lang = language === 'en' ? 'en' : 'rw'
  if (items.length === 0 || !WA_CONFIG.isNumberConfigured) return null
  const ready = Boolean(district) && deliveryFee !== null
  const total = ready ? Math.max(0, subtotal - discount + deliveryFee) : 0

  const orderWithWhatsApp = () => {
    if (!ready || deliveryFee === null) return
    trackWhatsAppClick('order_cart', { cartTotal: total, district, language: lang, pagePath: '/cart' })
    router.push('/checkout')
  }

  return <section className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4"><p className="text-sm font-bold text-gray-800">{t('whatsapp.cart_prefer')}</p><button type="button" onClick={orderWithWhatsApp} disabled={!ready} className="mt-3 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-black text-white transition-colors hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-gray-300"><MessageCircle className="h-5 w-5" />{t('whatsapp.order_cart')}</button><p className="mt-2 text-center text-xs leading-5 text-gray-500">{ready ? t('whatsapp.items_included', { count: items.length }) : t('whatsapp.select_district_first')}</p></section>
}
