'use client'

import { MessageCircle, Phone } from 'lucide-react'
import { BUSINESS, OWNER_TODO } from '@/lib/business-config'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { buildWhatsAppUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'

function configured(value: string) { return value !== OWNER_TODO && !value.includes('TODO:') }

export default function WhatsAppCTA() {
  const { t, language } = useLanguage()
  if (!configured(BUSINESS.whatsapp)) return null
  const hasPhone = configured(BUSINESS.phone) && configured(BUSINESS.phoneDisplay)
  return (
    <section className="px-4 py-14 md:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 rounded-3xl border border-fcs-border bg-fcs-surface px-6 py-10 sm:px-12 sm:py-14 md:flex-row md:items-center">
        <div className="max-w-xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fcs-brand-text">{t('home.concierge_eyebrow')}</span>
          <h2 className="mt-3 font-display text-3xl leading-tight text-fcs-text md:text-4xl">{t('home.whatsapp_title')}</h2>
          <p className="mt-4 text-base leading-7 text-fcs-text-muted">{t('home.whatsapp_subtitle')}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><button type="button" onClick={() => { window.open(buildWhatsAppUrl(t('whatsapp.general_help')), '_blank', 'noopener,noreferrer'); trackWhatsAppClick('general_support', { language: language === 'en' ? 'en' : 'rw', pagePath: '/' }) }} className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-fcs-whatsapp px-8 text-base font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-fcs-whatsapp-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-whatsapp focus-visible:ring-offset-2 motion-reduce:transition-none"><MessageCircle className="h-5 w-5" aria-hidden="true" />{t('home.concierge_cta')}</button>{hasPhone && <a href={`tel:${BUSINESS.phone}`} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-fcs-border px-6 text-sm font-medium text-fcs-text-muted transition-colors hover:text-fcs-text"><Phone className="h-4 w-4" aria-hidden="true" />{BUSINESS.phoneDisplay}</a>}</div>
      </div>
    </section>
  )
}
