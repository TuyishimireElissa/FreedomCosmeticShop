'use client'

import { WifiOff } from 'lucide-react'
import { useOfflineDetection } from '@/hooks/useOfflineDetection'
import { useT } from '@/lib/i18n/LanguageContext'

export default function OfflineBanner() {
  const t = useT()
  const { isOffline } = useOfflineDetection()

  if (!isOffline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-center gap-3 text-sm">
        <WifiOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-bold">{t('offline.title')}</p>
          <p className="mt-0.5 text-xs leading-5 sm:text-sm">{t('offline.cart_saved')}</p>
        </div>
      </div>
    </div>
  )
}
