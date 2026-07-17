'use client'

import { Signal, SignalHigh, WifiOff } from 'lucide-react'
import { useLowData } from '@/contexts/LowDataContext'
import type { LowDataPreference } from '@/lib/low-data'
import { useT } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'

export default function LowDataToggle({ variant = 'full' }: { variant?: 'compact' | 'full' }) {
  const t = useT()
  const {
    isLowData,
    isSlowConnection,
    connectionType,
    saveData,
    toggleLowData,
    userPreference,
    setUserPreference,
  } = useLowData()

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleLowData}
        aria-label={isLowData ? t('low_data.turn_off') : t('low_data.turn_on')}
        aria-pressed={isLowData}
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors',
          isLowData ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800',
        )}
      >
        {isLowData ? <Signal className="h-4 w-4" aria-hidden="true" /> : <SignalHigh className="h-4 w-4" aria-hidden="true" />}
        <span>{isLowData ? t('low_data.data_saver') : t('low_data.full_data')}</span>
      </button>
    )
  }

  const options: Array<{ value: LowDataPreference; label: string; description: string }> = [
    { value: 'auto', label: t('low_data.auto'), description: t('low_data.auto_description') },
    { value: 'on', label: t('low_data.on'), description: t('low_data.on_description') },
    { value: 'off', label: t('low_data.off'), description: t('low_data.off_description') },
  ]

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="low-data-title">
      <div className="flex items-start gap-3">
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', isLowData ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700')} aria-hidden="true">
          {isLowData ? <Signal className="h-5 w-5" /> : <SignalHigh className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="low-data-title" className="font-semibold text-gray-950">{t('low_data.title')}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">{t('low_data.description')}</p>

          {(isSlowConnection || saveData) && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-900" role="status">
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{saveData ? t('low_data.save_data_detected') : t('low_data.slow_detected', { type: connectionType })}</span>
            </p>
          )}

          <fieldset className="mt-4">
            <legend className="sr-only">{t('low_data.preference')}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setUserPreference(option.value)}
                  aria-pressed={userPreference === option.value}
                  className={cn(
                    'min-h-[64px] rounded-xl border-2 p-2 text-center transition-colors',
                    userPreference === option.value
                      ? 'border-[#B76E79] bg-rose-50 text-[#8a4b55]'
                      : 'border-gray-200 text-gray-800 hover:border-gray-400',
                  )}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-600">{option.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <p className="mt-3 flex items-center gap-2 text-xs text-gray-600" role="status" aria-live="polite">
            {isLowData ? <Signal className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : <SignalHigh className="h-4 w-4 text-gray-700" aria-hidden="true" />}
            <span>{t('low_data.current_status', { status: isLowData ? t('low_data.status_saver') : t('low_data.status_full') })}</span>
          </p>
        </div>
      </div>
    </section>
  )
}
