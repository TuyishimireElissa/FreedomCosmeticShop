'use client'

import Link from 'next/link'
import { ArrowLeft, Gauge } from 'lucide-react'
import LowDataToggle from '@/components/settings/LowDataToggle'
import { useT } from '@/lib/i18n/LanguageContext'

export default function AccountSettingsPage() {
  const t = useT()

  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/account" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#8a4b55]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('orders.account_home')}
        </Link>
        <header className="mt-4">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8a4b55]">
            <Gauge className="h-4 w-4" aria-hidden="true" />
            {t('low_data.account_settings')}
          </span>
          <h1 className="mt-2 text-3xl font-black text-gray-950">{t('low_data.settings_title')}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">{t('low_data.settings_description')}</p>
        </header>
        <div className="mt-6">
          <LowDataToggle />
        </div>
      </div>
    </main>
  )
}
