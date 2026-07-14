'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Truck, X } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

const STORAGE_KEY = 'freedom-announcement-dismissed'

export default function AnnouncementBar() {
  const t = useT()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_KEY) !== 'true')
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  if (!visible) return null

  return (
    <div className="safe-top relative z-[60] bg-[#1a1a1a] px-10 py-2 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] leading-4 sm:text-xs md:text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 shrink-0 text-[#FFD700]" aria-hidden="true" />
          <span>
            <strong>{t('announcement.free_delivery', { amount: '50,000' })}</strong>
          </span>
        </span>
        <span className="hidden text-white/30 sm:inline" aria-hidden="true">|</span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FFD700]" aria-hidden="true" />
          <span>
            {t('announcement.promotion', { code: 'BEAUTY20', percent: 20 })}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700] sm:right-4"
        aria-label={t('announcement.dismiss')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
