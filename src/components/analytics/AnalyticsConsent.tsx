'use client'

import { useEffect, useState } from 'react'
import { BarChart3, ShieldCheck } from 'lucide-react'
import {
  ANALYTICS_CONSENT_KEY,
  EVENTS,
  setAnalyticsConsent,
  trackEvent,
} from '@/lib/analytics'
import { useT } from '@/lib/i18n/LanguageContext'

type ConsentChoice = 'granted' | 'denied' | null

function readChoice(): ConsentChoice {
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return 'denied'
  }
}

export function AnalyticsConsentBanner() {
  const t = useT()
  const [choice, setChoice] = useState<ConsentChoice>('denied')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setChoice(readChoice())
    setReady(true)
  }, [])

  const choose = (granted: boolean) => {
    setAnalyticsConsent(granted)
    setChoice(granted ? 'granted' : 'denied')
    if (granted) void trackEvent({ event: EVENTS.PAGE_VIEW, path: window.location.pathname, metadata: { source: 'button' } })
  }

  if (!ready || choice !== null) return null

  return (
    <aside className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl md:bottom-5" aria-label={t('analytics_consent.title')}>
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#8a4b55]" aria-hidden="true" />
        <div>
          <h2 className="font-black text-gray-950">{t('analytics_consent.title')}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">{t('analytics_consent.description')}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => choose(false)} className="min-h-12 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-800">{t('analytics_consent.decline')}</button>
        <button type="button" onClick={() => choose(true)} className="min-h-12 rounded-xl bg-[#B76E79] px-4 text-sm font-bold text-white">{t('analytics_consent.accept')}</button>
      </div>
    </aside>
  )
}

export function AnalyticsConsentSettings() {
  const t = useT()
  const [choice, setChoice] = useState<ConsentChoice>('denied')

  useEffect(() => setChoice(readChoice()), [])

  const choose = (granted: boolean) => {
    setAnalyticsConsent(granted)
    setChoice(granted ? 'granted' : 'denied')
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="analytics-consent-heading">
      <div className="flex items-start gap-3">
        <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-[#8a4b55]" aria-hidden="true" />
        <div>
          <h2 id="analytics-consent-heading" className="font-black text-gray-950">{t('analytics_consent.settings_title')}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">{t('analytics_consent.settings_description')}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button type="button" aria-pressed={choice === 'denied'} onClick={() => choose(false)} className={`min-h-12 rounded-xl border px-4 text-sm font-bold ${choice === 'denied' ? 'border-[#B76E79] bg-rose-50 text-[#8a4b55]' : 'border-gray-300 text-gray-800'}`}>{t('analytics_consent.off')}</button>
        <button type="button" aria-pressed={choice === 'granted'} onClick={() => choose(true)} className={`min-h-12 rounded-xl border px-4 text-sm font-bold ${choice === 'granted' ? 'border-[#B76E79] bg-rose-50 text-[#8a4b55]' : 'border-gray-300 text-gray-800'}`}>{t('analytics_consent.on')}</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500" aria-live="polite">{choice === 'granted' ? t('analytics_consent.status_on') : t('analytics_consent.status_off')}</p>
    </section>
  )
}
