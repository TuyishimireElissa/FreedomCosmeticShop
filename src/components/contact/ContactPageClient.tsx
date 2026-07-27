'use client'

import Link from 'next/link'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { BUSINESS, getWhatsAppLink } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

export default function ContactPageClient() {
  const t = useT()

  return <main className="min-h-screen bg-[#f8f9fa] px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><header className="text-center"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#B76E79]">{t('pages.customer_care')}</p><h1 className="mt-3 text-4xl font-black text-[#1a1a1a]">{t('pages.contact_business', { business: BUSINESS.tradingName })}</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-500">{t('pages.contact_intro')}</p></header><div className="mt-10 grid gap-4 md:grid-cols-3">{[
    { icon: MessageCircle, title: 'WhatsApp', value: BUSINESS.whatsapp, href: BUSINESS.whatsapp.includes('TODO') ? undefined : getWhatsAppLink() },
    { icon: Phone, title: t('pages.call_us'), value: BUSINESS.phoneDisplay, href: BUSINESS.phone.includes('TODO') ? undefined : `tel:${BUSINESS.phone}` },
    { icon: Mail, title: t('pages.email'), value: BUSINESS.email, href: BUSINESS.email.includes('TODO') ? undefined : `mailto:${BUSINESS.email}` },
  ].map(({icon:Icon,title,value,href})=><a key={title} href={href} target={href?.startsWith('http')?'_blank':undefined} rel="noreferrer" className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-[#B76E79]"><Icon className="h-5 w-5" /></span><h2 className="mt-4 font-black">{title}</h2><p className="mt-1 break-all text-sm text-gray-500">{value}</p></a>)}</div><section className="mt-6 rounded-3xl bg-[#1a1a1a] p-7 text-white sm:p-9"><div className="flex items-start gap-3"><MapPin className="mt-1 h-5 w-5 shrink-0 text-[#FFD700]" /><div><h2 className="text-xl font-black">{BUSINESS.address.short}, {BUSINESS.address.country} </h2><p className="mt-2 text-sm leading-6 text-gray-400">{t('pages.contact_orders_notice')}</p><p className="mt-4 text-xs text-gray-500">{t('pages.support_hours', { weekdays: BUSINESS.supportHours.weekdays, saturday: BUSINESS.supportHours.saturday, sunday: BUSINESS.supportHours.sunday, timezone: BUSINESS.supportHours.timezone })}</p></div></div></section><div className="mt-7 text-center"><Link href="/faq" className="font-bold text-[#B76E79]">{t('pages.read_faq')} →</Link></div></div></main>
}
