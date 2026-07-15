'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Truck, X } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

const STORAGE_KEY = 'freedom-announcement-dismissed'

export default function AnnouncementBar() {
  const t = useT()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(sessionStorage.getItem(STORAGE_KEY) !== 'true')
  }, [])

  const dismiss = () => {
    setVisible(false)
    sessionStorage.setItem(STORAGE_KEY, 'true')
  }

  if (!visible) return null

  return (
    <div className="safe-top relative z-[60] bg-[#1a1a1a] px-12 py-1.5 text-white md:px-10 md:py-2">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-center gap-2 overflow-hidden whitespace-nowrap text-center text-xs leading-tight md:gap-3 md:text-sm">
        <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden">
          <Truck className="h-3.5 w-3.5 shrink-0 text-[#FFD700]" aria-hidden="true" />
          <span className="truncate">
            <strong>{t('announcement.free_delivery', { amount: '50,000' })}</strong>
          </span>
        </span>
        <span className="hidden text-white/30 sm:inline" aria-hidden="true">|</span>
        <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FFD700]" aria-hidden="true" />
          <span className="truncate">
            {t('announcement.promotion', { code: 'BEAUTY20', percent: 20 })}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 touch-manipulation place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700] sm:right-2"
        aria-label={t('announcement.dismiss')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
