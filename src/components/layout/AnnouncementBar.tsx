'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

const STORAGE_KEY = 'freedom-announcement-dismissed'

export default function AnnouncementBar() {
  const t = useT()
  const [visible, setVisible] = useState(false)
  useEffect(() => { setVisible(sessionStorage.getItem(STORAGE_KEY) !== 'true') }, [])
  if (!visible) return null

  return (
    <div className="safe-top relative z-[60] flex min-h-8 items-center bg-[#1a1a1a] px-12 text-white">
      <p className="mx-auto truncate text-center text-xs font-medium tracking-wide">{t('announcement.free_delivery', { amount: '50,000' })}</p>
      <button type="button" onClick={() => { setVisible(false); sessionStorage.setItem(STORAGE_KEY, 'true') }} className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label={t('announcement.dismiss')}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
