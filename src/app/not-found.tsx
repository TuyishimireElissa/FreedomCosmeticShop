'use client'

import Link from 'next/link'
import { ArrowLeft, Search, Sparkles } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

export default function NotFound() {
  const t = useT()
  return <main className="relative grid min-h-[70vh] place-items-center overflow-hidden bg-gradient-to-br from-white via-rose-50 to-[#fff8e7] px-4 py-16"><div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#B76E79]/15 blur-3xl" /><div className="relative max-w-xl text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#B76E79] text-2xl font-black text-white shadow-xl">F</span><p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-[#B76E79]">{t('pages.error_404')}</p><h1 className="mt-3 text-4xl font-black tracking-tight text-[#1a1a1a] sm:text-5xl">{t('errors.page_not_found')}</h1><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-500">{t('pages.not_found_hint')}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1a1a1a] px-6 text-sm font-black text-white"><ArrowLeft className="h-4 w-4" />{t('pages.back_home')}</Link><Link href="/products" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#B76E79] px-6 text-sm font-black text-white"><Search className="h-4 w-4" />{t('cart.browse_products')}</Link></div><p className="mt-8 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400"><Sparkles className="h-3.5 w-3.5 text-[#FFD700]" />{t('pages.beauty_freedom_brand')}</p></div></main>
}
