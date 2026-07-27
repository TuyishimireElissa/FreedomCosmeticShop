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
    <section className="px-4 py-10 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 rounded-xl bg-[#176B3A] px-6 py-8 text-center text-white sm:px-10 md:flex-row md:text-left">
        <div className="flex max-w-2xl items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10"><MessageCircle className="h-6 w-6" aria-hidden="true" /></span><div><h2 className="text-2xl font-bold md:text-3xl">{t('home.whatsapp_title')}</h2><p className="mt-2 text-sm leading-6 text-white/75">{t('home.whatsapp_subtitle')}</p></div></div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><button type="button" onClick={() => { window.open(buildWhatsAppUrl(t('whatsapp.general_help')), '_blank', 'noopener,noreferrer'); trackWhatsAppClick('general_support', { language: language === 'en' ? 'en' : 'rw', pagePath: '/' }) }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-white px-6 text-sm font-semibold text-[#176B3A] hover:bg-[#FAFAFA]"><MessageCircle className="h-4 w-4" aria-hidden="true" />{t('footer.whatsapp_chat')}</button>{hasPhone && <a href={`tel:${BUSINESS.phone}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-white/30 px-5 text-sm font-medium text-white hover:bg-white/10"><Phone className="h-4 w-4" aria-hidden="true" />{BUSINESS.phoneDisplay}</a>}</div>
      </div>
    </section>
  )
}
