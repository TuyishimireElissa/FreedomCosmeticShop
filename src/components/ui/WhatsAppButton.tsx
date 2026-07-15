'use client'

import { MessageCircle } from 'lucide-react'
import { BUSINESS, getWhatsAppLink } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

interface WhatsAppButtonProps {
  phone?: string
  message?: string
}

function WhatsAppButtonComponent({
  phone,
  message = BUSINESS.whatsappMessage,
}: WhatsAppButtonProps = {}) {
  const t = useT()
  const configuredPhone = phone || BUSINESS.whatsapp
  const url = configuredPhone.includes('TODO')
    ? undefined
    : phone
      ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      : getWhatsAppLink(message)

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group fixed bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] right-4 z-40 grid h-12 w-12 touch-manipulation place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_rgba(37,211,102,0.35)] ring-4 ring-white/90 transition-transform duration-200 hover:scale-105 hover:bg-[#20bd5a] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B76E79]/40 md:bottom-6 md:right-6"
      aria-label={t('ui.whatsapp_business', { business: BUSINESS.tradingName })}
      aria-disabled={!url}
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/20 motion-reduce:hidden" aria-hidden="true" />
      <MessageCircle className="h-7 w-7" strokeWidth={2.2} />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
        {t('ui.chat_with_us')}
      </span>
    </a>
  )
}

export default WhatsAppButtonComponent
export { WhatsAppButtonComponent as WhatsAppButton }
