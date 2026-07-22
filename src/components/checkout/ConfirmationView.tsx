'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Clock, CreditCard, MapPin, MessageCircle, Package, Phone, Share2, ShoppingBag } from 'lucide-react'
import { BUSINESS } from '@/lib/business-config'
import { formatRWF } from '@/lib/format'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CheckoutAddress } from '@/components/checkout/AddressForm'
import type { CheckoutPaymentMethod } from '@/components/checkout/PaymentSelector'
import type { CartItem } from '@/store/useStore'
import { buildWhatsAppShareUrl, buildWhatsAppUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'

export interface ConfirmedCheckoutOrder { id: string; orderNumber: string; total: number; items: CartItem[]; confirmationDelivery?: { sms: string; email: string } }
interface TrackedConfirmation {
  status: string
  paymentStatus: string
  paymentMethod: string
  deliveryFee: number
  estimatedArrival: string | null
  customerPhone: string
  customerName: string
  address: string
  district: string | null
  sector: string | null
  province: string
}

export default function ConfirmationView({ order, address, paymentMethod }: { order: ConfirmedCheckoutOrder; address: CheckoutAddress; paymentMethod: CheckoutPaymentMethod }) {
  const { t, language } = useLanguage()
  const [tracked, setTracked] = useState<TrackedConfirmation | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/orders/${encodeURIComponent(order.id)}/track`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((result) => setTracked(result.order || null))
      .catch(() => {})
    return () => controller.abort()
  }, [order.id])

  const actualMethod = (tracked?.paymentMethod || paymentMethod) as CheckoutPaymentMethod
  const paymentLabel = actualMethod === 'MTN_MOMO' ? t('checkout.mtn_momo') : actualMethod === 'AIRTEL_MONEY' ? t('checkout.airtel_money') : actualMethod === 'CARD' ? t('checkout.card_payment') : t('checkout.cod')
  const paymentStatus = actualMethod === 'COD' ? t('confirmation.pay_on_delivery') : tracked?.paymentStatus === 'PAID' ? t('confirmation.paid') : t('confirmation.pending')
  const expected = tracked?.estimatedArrival ? new Intl.DateTimeFormat(language === 'rw' ? 'rw-RW' : 'en-RW', { dateStyle: 'full' }).format(new Date(tracked.estimatedArrival)) : t('confirmation.estimate_pending')
  const enteredDestination = [address.village, address.cell, address.sector, address.district, address.province].filter(Boolean).join(', ')
  const destination = enteredDestination || tracked?.address || [tracked?.sector, tracked?.district, tracked?.province].filter(Boolean).join(', ') || t('confirmation.destination_pending')
  const customerFirstName = (address.fullName || tracked?.customerName || '').split(' ')[0]
  const message = t('confirmation.share_message', { order: order.orderNumber, total: formatRWF(order.total), destination, expected })
  const supportMessage = t('confirmation.support_message', { order: order.orderNumber })
  const whatsappSupport = buildWhatsAppUrl(supportMessage)
  const hasWhatsApp = true
  const hasPhone = !BUSINESS.phone.includes('TODO:')

  return <main className="mx-auto max-w-2xl">
    <section className="rounded-xl border border-[#EEEEEE] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-9">
      <header className="text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#2D8A4E] text-white"><Check className="h-10 w-10" /></span><h1 className="mt-5 text-3xl font-black text-gray-900">{t('confirmation.title')}</h1><p className="mt-2 text-sm text-gray-500">{customerFirstName ? t('confirmation.thank_you', { name: customerFirstName }) : t('confirmation.received')}</p><div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2"><Package className="h-4 w-4 text-[#B76E79]" /><span className="text-xs text-gray-500">{t('confirmation.order_number_label')}</span><strong className="font-mono text-sm text-[#B76E79]">{order.orderNumber}</strong></div></header>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <InfoCard icon={<CreditCard className="h-5 w-5" aria-hidden="true" />} title={t('confirmation.payment_title')}><Row label={t('confirmation.payment_method')} value={paymentLabel} /><Row label={t('confirmation.payment_status')} value={paymentStatus} /><Row label={t('cart.total')} value={formatRWF(order.total)} strong /></InfoCard>
        <InfoCard icon={<Clock className="h-5 w-5" />} title={t('confirmation.delivery_title')}><p className="text-xs text-gray-500">{t('confirmation.expected_delivery')}</p><p className="mt-1 font-black text-gray-900">{expected}</p>{tracked && <p className="mt-2 text-xs text-gray-500">{t('confirmation.delivery_fee_label', { amount: formatRWF(tracked.deliveryFee) })}</p>}</InfoCard>
      </div>

      <InfoCard icon={<MapPin className="h-5 w-5" />} title={t('confirmation.delivery_to')} className="mt-4"><p className="text-sm font-bold leading-6 text-gray-800">{destination}</p>{address.landmark && <p className="mt-1 text-xs text-gray-500">{t('confirmation.landmark_value', { landmark: address.landmark })}</p>}</InfoCard>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"><p>{order.confirmationDelivery?.sms === 'sent' ? t('confirmation.sms_provider_accepted', { phone: tracked?.customerPhone || address.phone }) : order.confirmationDelivery?.sms === 'failed' ? t('confirmation.sms_send_failed') : t('confirmation.updates_linked', { phone: tracked?.customerPhone || address.phone })}</p>{address.email && <p className="mt-1">{order.confirmationDelivery?.email === 'sent' ? t('confirmation.email_provider_accepted', { email: address.email }) : order.confirmationDelivery?.email === 'failed' ? t('confirmation.email_send_failed') : t('confirmation.email_not_configured')}</p>}</div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2"><Link href="/track-order" className="flex min-h-[52px] items-center justify-center gap-2 rounded-[10px] bg-[#B76E79] font-black text-white"><Package className="h-5 w-5" />{t('confirmation.track_order')}</Link><a href={buildWhatsAppShareUrl(message)} onClick={() => trackWhatsAppClick('track_order', { language: language === 'en' ? 'en' : 'rw', pagePath: '/checkout' })} target="_blank" rel="noreferrer" className="flex min-h-[52px] items-center justify-center gap-2 rounded-[10px] bg-[#25D366] font-black text-white"><Share2 className="h-5 w-5" />{t('confirmation.share_whatsapp')}</a></div>
      <Link href="/products" className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#EEEEEE] font-bold text-gray-700"><ShoppingBag className="h-5 w-5" />{t('confirmation.continue_shopping')}</Link>

      <section className="mt-6 rounded-2xl bg-gray-50 p-4"><h2 className="font-black text-gray-900">{t('confirmation.support_title')}</h2><p className="mt-1 text-sm text-gray-500">{t('confirmation.support_hint')}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row">{hasWhatsApp && <a href={whatsappSupport} onClick={() => trackWhatsAppClick('general_support', { language: language === 'en' ? 'en' : 'rw', pagePath: '/checkout' })} target="_blank" rel="noreferrer" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 font-bold text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>}{hasPhone && <a href={`tel:${BUSINESS.phone}`} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border bg-white font-bold text-gray-700"><Phone className="h-4 w-4" />{t('confirmation.call_support')}</a>}<Link href="/contact" className="flex min-h-12 flex-1 items-center justify-center rounded-xl border bg-white font-bold text-gray-700">{t('confirmation.contact_support')}</Link></div>{!hasWhatsApp && !hasPhone && <p className="mt-2 text-xs text-amber-700">{t('confirmation.direct_contact_unavailable')}</p>}</section>
    </section>
  </main>
}

function InfoCard({ icon, title, className = '', children }: { icon: React.ReactNode; title: string; className?: string; children: React.ReactNode }) { return <section className={`rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] p-4 ${className}`}><h2 className="flex items-center gap-2 text-sm font-black text-gray-900"><span className="text-[#B76E79]">{icon}</span>{title}</h2><div className="mt-3">{children}</div></section> }
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <p className={`mt-2 flex justify-between gap-3 text-sm ${strong ? 'border-t pt-3 font-black' : ''}`}><span className="text-gray-500">{label}</span><span className="text-right font-bold text-gray-900">{value}</span></p> }
