'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

const questions = [
  ['pages.faq_authentic_q', 'pages.faq_authentic_a'],
  ['pages.faq_delivery_q', 'pages.faq_delivery_a'],
  ['pages.faq_payment_q', 'pages.faq_payment_a'],
  ['pages.faq_delivery_time_q', 'pages.faq_delivery_time_a'],
  ['pages.faq_returns_q', 'pages.faq_returns_a'],
  ['pages.faq_tracking_q', 'pages.faq_tracking_a'],
  ['pages.faq_wholesale_q', 'pages.faq_wholesale_a'],
  ['pages.faq_coupon_q', 'pages.faq_coupon_a'],
]

export default function FaqPage() {
  const t = useT()
  const [open, setOpen] = useState(0)
  return <main className="min-h-screen bg-[#f8f9fa] px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><header className="text-center"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#B76E79]">{t('pages.help_centre')}</p><h1 className="mt-3 text-4xl font-black">{t('faq.title')}</h1><p className="mt-3 text-sm text-gray-500">{t('pages.faq_intro')}</p></header><div className="mt-9 space-y-3">{questions.map(([question,answer],index)=><section key={question} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"><button type="button" onClick={()=>setOpen(open===index?-1:index)} className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-black text-[#1a1a1a] sm:text-base" aria-expanded={open===index}>{t(question)}<ChevronDown className={`h-5 w-5 shrink-0 text-[#B76E79] transition-transform ${open===index?'rotate-180':''}`} /></button>{open===index&&<p className="border-t border-gray-100 px-5 py-4 text-sm leading-7 text-gray-600">{t(answer)}</p>}</section>)}</div></div></main>
}
