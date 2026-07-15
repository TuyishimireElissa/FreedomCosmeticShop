'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

export default function QuizBanner() {
  const t = useT()
  return <section className="px-4 py-7 sm:py-9"><div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#B76E79] via-[#985661] to-[#1a1a1a] p-6 text-center text-white shadow-lg sm:p-9"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15"><Sparkles className="h-7 w-7" /></span><h2 className="mt-4 text-2xl font-black">{t('home.quiz_title')}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/80">{t('home.quiz_subtitle')}</p><Link href="/quiz" className="mt-6 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-white px-7 text-base font-black text-[#B76E79] transition-transform active:scale-[0.98]">{t('home.quiz_cta')}<ArrowRight className="h-4 w-4" /></Link><p className="mt-3 text-xs text-white/60">{t('home.quiz_time')}</p></div></section>
}
