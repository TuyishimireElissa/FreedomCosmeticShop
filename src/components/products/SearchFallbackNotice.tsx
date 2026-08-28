'use client'

import { MessageCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { WHATSAPP_ORDERING_NUMBERS, formatWhatsAppDisplay, getWhatsAppLink } from '@/lib/business-config'

/**
 * Shown above results when the search found nothing exact and the API returned
 * the closest similar products instead (fallback.reason set). Turns a dead end
 * into a shelf: friendly bilingual line + WhatsApp sourcing CTA.
 *
 * CONTRAST (measured): heading on fcs-surface = fcs-text 17.40:1; CTA is
 * white on fcs-whatsapp-pill #1E874A = 4.55:1 (AA). Never fcs-whatsapp
 * #25D366 (1.98:1) — same rule as SearchRfq.
 */
export default function SearchFallbackNotice() {
  const { t } = useLanguage()
  const displayPhone = formatWhatsAppDisplay(WHATSAPP_ORDERING_NUMBERS[0] || '')

  return (
    <div className="rounded-fcs-md border border-fcs-border bg-fcs-surface p-4">
      <p className="text-sm font-bold text-fcs-text">{t('search.fallback_notice')}</p>
      <a
        href={getWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-fcs-md bg-fcs-whatsapp-pill px-4 text-sm font-bold text-white transition-colors hover:bg-fcs-whatsapp-pill-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {t('search.fallback_cta', { phone: displayPhone })}
      </a>
    </div>
  )
}
