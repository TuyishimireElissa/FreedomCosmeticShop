'use client'

import { useT } from '@/lib/i18n/LanguageContext'

export default function Loading() {
  const t = useT()
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-white"><div className="text-center"><div className="relative mx-auto h-20 w-20"><span className="absolute inset-0 animate-ping rounded-full bg-[#B76E79]/15" /><span className="absolute inset-2 grid place-items-center rounded-full bg-[#B76E79] text-2xl font-black text-white shadow-xl">F</span><span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#FFD700]" /></div><p className="mt-5 text-lg font-black text-[#1a1a1a]">FreedomCosmeticShop</p><p className="mt-1 text-xs font-semibold text-[#B76E79]">{t('pages.preparing_beautiful')}</p></div></div>
}
