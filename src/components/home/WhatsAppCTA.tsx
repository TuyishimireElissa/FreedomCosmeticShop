'use client'

import { MessageCircle, Phone } from 'lucide-react'
import { BUSINESS, OWNER_TODO } from '@/lib/business-config'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { buildWhatsAppUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'

function isConfigured(value: string) {
  return value !== OWNER_TODO && !value.includes('TODO:')
}

export default function WhatsAppCTA() {
  const { t, language } = useLanguage()
  const hasWhatsApp = isConfigured(BUSINESS.whatsapp)
  const hasPhone = isConfigured(BUSINESS.phone) && isConfigured(BUSINESS.phoneDisplay)
  const hasHours = isConfigured(BUSINESS.supportHours.weekdays)

  if (!hasWhatsApp) return null

  return (
    <section className="px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-green-500/30">
          <MessageCircle className="h-8 w-8 text-white" aria-hidden="true" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-gray-900 md:text-2xl">{t('home.whatsapp_title')}</h2>
        <p className="mx-auto mb-6 max-w-sm text-sm text-gray-500">{t('home.whatsapp_subtitle')}</p>

        <button
          type="button"
          onClick={() => { window.open(buildWhatsAppUrl(t('whatsapp.general_help')), '_blank', 'noopener,noreferrer'); trackWhatsAppClick('general_support', { language: language === 'en' ? 'en' : 'rw', pagePath: '/' }) }}
          className="mb-4 inline-flex min-h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-8 text-base font-semibold text-white shadow-lg shadow-green-500/30 transition-colors duration-150 hover:bg-[#20bd5a] sm:w-auto"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          {t('footer.whatsapp_chat')}
        </button>

        {hasPhone && (
          <>
            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="h-px max-w-20 flex-1 bg-gray-100" />
              <span className="text-xs text-gray-500">{t('common.or')}</span>
              <div className="h-px max-w-20 flex-1 bg-gray-100" />
            </div>
            <a href={`tel:${BUSINESS.phone}`} className="mt-3 inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium text-gray-700 transition-colors hover:text-[#B76E79]">
              <Phone className="h-4 w-4" aria-hidden="true" />
              {BUSINESS.phoneDisplay}
            </a>
          </>
        )}

        {hasHours && <p className="mt-3 text-xs text-gray-500">{t('home.whatsapp_hours', { hours: BUSINESS.supportHours.weekdays })}</p>}
      </div>
    </section>
  )
}
