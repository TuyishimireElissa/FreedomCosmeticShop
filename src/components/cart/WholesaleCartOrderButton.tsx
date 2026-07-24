'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { formatRWF } from '@/lib/format'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { buildWholesaleCartWhatsAppOrder, type WholesaleCartOrderItem } from '@/lib/wholesale-whatsapp'
import { trackWhatsAppClick } from '@/lib/whatsapp-service'

interface WholesaleCartOrderButtonProps {
  items: WholesaleCartOrderItem[]
  managerWhatsApp?: string | null
  onClearCart: () => void
  onNavigate?: () => void
  className?: string
}

export default function WholesaleCartOrderButton({ items, managerWhatsApp, onClearCart, onNavigate, className = '' }: WholesaleCartOrderButtonProps) {
  const { language } = useLanguage()
  const [opened, setOpened] = useState(false)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const isKinyarwanda = language !== 'en'
  const href = buildWholesaleCartWhatsAppOrder({
    items,
    language: isKinyarwanda ? 'rw' : 'en',
    managerWhatsApp,
  })

  if (opened) {
    return <section role="status" aria-live="polite" className={`rounded-2xl border border-emerald-200 bg-emerald-50 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
        <div>
          <h3 className="font-bold text-emerald-950">{isKinyarwanda ? 'WhatsApp yafunguwe' : 'WhatsApp opened for your order'}</h3>
          <p className="mt-1 text-sm leading-6 text-emerald-900">{isKinyarwanda ? 'Niba wohereje ubutumwa, itsinda ryacu rizemeza ibyo watumije kuri WhatsApp.' : 'If you sent the message, our team will confirm your order request on WhatsApp.'}</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/80 p-3 text-sm">
        <div><dt className="text-gray-500">{isKinyarwanda ? 'Ibicuruzwa' : 'Items'}</dt><dd className="font-bold">{itemCount}</dd></div>
        <div><dt className="text-gray-500">{isKinyarwanda ? 'Igiteranyo' : 'Total'}</dt><dd className="font-bold">{formatRWF(subtotal)}</dd></div>
      </dl>
      <p className="mt-4 text-sm font-semibold text-gray-800">{isKinyarwanda ? 'Wohereje ibyo watumije?' : 'Did you send your order?'}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onClearCart} className="min-h-11 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white hover:bg-emerald-800">{isKinyarwanda ? 'Yego, sukura igitebo' : 'Yes, clear my cart'}</button>
        <button type="button" onClick={() => setOpened(false)} className="min-h-11 rounded-xl border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-900">{isKinyarwanda ? 'Oya, sigamo ibicuruzwa' : 'No, keep items'}</button>
      </div>
      <Link href="/products" onClick={onNavigate} className="mt-3 flex min-h-11 items-center justify-center text-sm font-bold text-[#B76E79]">{isKinyarwanda ? 'Komeza guhaha' : 'Continue Shopping'}</Link>
    </section>
  }

  return <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => {
      setOpened(true)
      trackWhatsAppClick('order_cart', { cartTotal: subtotal, language: isKinyarwanda ? 'rw' : 'en', pagePath: '/cart' })
    }}
    className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-center text-base font-bold text-white transition-colors hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${className}`}
  >
    <MessageCircle className="h-5 w-5" aria-hidden="true" />
    {isKinyarwanda ? 'Tumiza Byose kuri WhatsApp' : 'Order All via WhatsApp'}
  </a>
}
