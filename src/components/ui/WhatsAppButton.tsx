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
      className="safe-bottom group fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_rgba(37,211,102,0.35)] ring-4 ring-white/90 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B76E79]/40 sm:bottom-6 sm:right-6"
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
