'use client'

import Link from 'next/link'
import { Clock, CreditCard, MessageCircle, Phone, RotateCcw, ShieldCheck, Truck, User } from 'lucide-react'
import { BUSINESS } from '@/lib/business-config'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { buildWhatsAppUrl, trackWhatsAppClick, WA_CONFIG, type WAEventType } from '@/lib/whatsapp-service'

const cards: Array<{ event: WAEventType; icon: typeof CreditCard; title: string; description: string; inquiry: string; color: string }> = [
  { event: 'payment_help', icon: CreditCard, title: 'support_payment_title', description: 'support_payment_description', inquiry: 'support_payment_inquiry', color: 'border-yellow-200 bg-yellow-50 text-yellow-800' },
  { event: 'delivery_inquiry', icon: Truck, title: 'support_delivery_title', description: 'support_delivery_description', inquiry: 'support_delivery_inquiry', color: 'border-blue-200 bg-blue-50 text-blue-800' },
  { event: 'returns_inquiry', icon: RotateCcw, title: 'support_returns_title', description: 'support_returns_description', inquiry: 'support_returns_inquiry', color: 'border-green-200 bg-green-50 text-green-800' },
  { event: 'authenticity_check', icon: ShieldCheck, title: 'support_authenticity_title', description: 'support_authenticity_description', inquiry: 'support_authenticity_inquiry', color: 'border-purple-200 bg-purple-50 text-purple-800' },
]

export default function WhatsAppSupportView() {
  const { t, language } = useLanguage()
  const lang = language === 'en' ? 'en' : 'rw'
  const hasPhone = !BUSINESS.phone.includes('TODO:')
  const send = (event: WAEventType, message: string) => {
    const url = buildWhatsAppUrl(message)
    window.open(url, '_blank', 'noopener,noreferrer')
    trackWhatsAppClick(event, { language: lang, pagePath: '/support/whatsapp' })
  }

  return <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
    <header className="text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-200"><MessageCircle className="h-10 w-10" /></span><h1 className="mt-5 text-3xl font-black text-gray-900">{t('whatsapp.support_title')}</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">{t('whatsapp.support_subtitle')}</p></header>

    <section className="mt-7 rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-[#B76E79]"><User className="h-7 w-7" /></span><div><p className="font-black text-gray-900">{WA_CONFIG.agentName || t('whatsapp.agent_name_unpublished')}</p><p className="text-sm text-gray-500">{t('whatsapp.assisted_support')}</p><p className="mt-1 text-xs text-amber-700">{t('whatsapp.availability_not_claimed')}</p></div></div>
      <div className="mt-4 rounded-xl bg-gray-50 p-4"><h2 className="flex items-center gap-2 text-sm font-black text-gray-900"><Clock className="h-4 w-4 text-[#B76E79]" />{t('whatsapp.support_hours')}</h2>{WA_CONFIG.responseHours.weekdays ? <div className="mt-2 space-y-1 text-sm text-gray-600"><p>{WA_CONFIG.responseHours.weekdays}</p>{WA_CONFIG.responseHours.saturday && <p>{WA_CONFIG.responseHours.saturday}</p>}{WA_CONFIG.responseHours.sunday && <p>{WA_CONFIG.responseHours.sunday}</p>}<p className="text-xs text-gray-400">{WA_CONFIG.responseHours.timezone}</p>{WA_CONFIG.responseHours.responseTime && <p className="border-t pt-2 text-xs">{t('whatsapp.response_time_value', { time: WA_CONFIG.responseHours.responseTime })}</p>}</div> : <p className="mt-2 text-sm leading-6 text-amber-700">{t('whatsapp.hours_unpublished')}</p>}</div>
    </section>

    <section className="mt-7"><h2 className="font-black text-gray-900">{t('whatsapp.quick_replies')}</h2><div className="mt-3 grid grid-cols-2 gap-3">{cards.map((card) => { const Icon = card.icon; return <button type="button" key={card.event} onClick={() => send(card.event, t(`whatsapp.${card.inquiry}`))} className={`min-h-[132px] touch-manipulation rounded-2xl border-2 p-4 text-left transition-transform active:scale-[.98] ${card.color}`}><Icon className="h-6 w-6" /><span className="mt-3 block text-sm font-black">{t(`whatsapp.${card.title}`)}</span><span className="mt-1 block text-xs leading-5 opacity-75">{t(`whatsapp.${card.description}`)}</span></button> })}</div></section>

    <section className="mt-6 flex gap-3 rounded-2xl bg-rose-50 p-4"><span className="text-2xl" aria-hidden></span><div><h2 className="text-sm font-black text-gray-900">{t('whatsapp.language_note')}</h2><p className="mt-1 text-xs leading-5 text-gray-600">{t('whatsapp.language_note_detail')}</p></div></section>

    <button type="button" onClick={() => send('general_support', t('whatsapp.general_help'))} className="mt-6 flex min-h-[60px] w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-5 text-lg font-black text-white shadow-xl shadow-green-200 transition-colors hover:bg-[#20bd5a]"><MessageCircle className="h-6 w-6" />{t('whatsapp.start_chat')}</button>
    <p className="mt-3 text-center text-xs text-gray-500">{t('whatsapp.verified_number', { number: `+${WA_CONFIG.number}` })}</p>
    {hasPhone ? <a href={`tel:${BUSINESS.phone}`} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 font-bold text-gray-700"><Phone className="h-4 w-4" />{BUSINESS.phoneDisplay}</a> : <p className="mt-3 text-center text-xs text-amber-700">{t('whatsapp.phone_unpublished')}</p>}
    <Link href="/contact" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border-2 font-bold text-gray-700">{t('confirmation.contact_support')}</Link>
  </main>
}
