'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Clock, MessageCircle, X } from 'lucide-react'
import { BUSINESS } from '@/lib/business-config'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { buildWhatsAppUrl, trackWhatsAppClick, WA_CONFIG } from '@/lib/whatsapp-service'

interface WhatsAppButtonProps { phone?: string; message?: string }

function customUrl(phone: string, message: string) {
  const number = phone.replace(/\D/g, '')
  if (!/^2507[2389]\d{7}$/.test(number)) return null
  const text = encodeURIComponent(message)
  const desktop = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  return desktop ? `https://web.whatsapp.com/send?phone=${number}&text=${text}` : `https://wa.me/${number}?text=${text}`
}

function WhatsAppButtonComponent({ phone, message }: WhatsAppButtonProps = {}) {
  const { t, language } = useLanguage()
  const pathname = usePathname()
  const lang = language === 'en' ? 'en' : 'rw'
  const [tooltip, setTooltip] = useState(false)
  const [interacted, setInteracted] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('wa-tooltip-seen')) return
      const timer = window.setTimeout(() => { setTooltip(true); sessionStorage.setItem('wa-tooltip-seen', 'true') }, 5000)
      return () => window.clearTimeout(timer)
    } catch { return }
  }, [])

  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout') || (!phone && !WA_CONFIG.isNumberConfigured)) return null
  const contextMessage = message || (pathname.startsWith('/products/') ? t('whatsapp.floating_product') : pathname === '/cart' ? t('whatsapp.floating_cart') : pathname.startsWith('/account/orders') || pathname === '/track-order' ? t('whatsapp.floating_order') : t('whatsapp.general_help'))

  const open = () => {
    const url = phone ? customUrl(phone, contextMessage) : buildWhatsAppUrl(contextMessage)
    if (!url) return
    setTooltip(false); setInteracted(true)
    window.open(url, '_blank', 'noopener,noreferrer')
    const eventType = pathname.startsWith('/products/') ? 'product_inquiry' : pathname.startsWith('/account/orders') || pathname === '/track-order' ? 'track_order' : 'general_support'
    trackWhatsAppClick(eventType, { language: lang, pagePath: pathname })
  }

  return <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] right-4 z-40 md:bottom-6 md:right-6">
    {tooltip && !interacted && <aside className="absolute bottom-full right-0 mb-3 w-64 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl"><button type="button" onClick={() => setTooltip(false)} className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full text-gray-400 hover:bg-gray-100" aria-label={t('common.close')}><X className="h-4 w-4" /></button><div className="flex items-center gap-2 pr-9"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366] text-white"><MessageCircle className="h-5 w-5" /></span><div><p className="text-sm font-black text-gray-900">{WA_CONFIG.agentName || BUSINESS.tradingName}</p><p className="text-xs text-gray-500">{t('whatsapp.assisted_support')}</p></div></div><p className="mt-3 text-xs leading-5 text-gray-700">{t('whatsapp.floating_invitation')}</p><p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-gray-500"><Clock className="mt-0.5 h-3 w-3 shrink-0" />{WA_CONFIG.responseHours.responseTime || t('whatsapp.response_time_unpublished')}</p></aside>}
    <button type="button" onClick={open} className="grid h-14 w-14 touch-manipulation place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/30 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B76E79]/40" aria-label={t('ui.whatsapp_business', { business: BUSINESS.tradingName })}><MessageCircle className="h-7 w-7" /></button>
  </div>
}

export default WhatsAppButtonComponent
export { WhatsAppButtonComponent as WhatsAppButton }
