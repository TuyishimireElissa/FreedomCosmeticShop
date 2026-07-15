'use client'

import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

interface ScrollHintProps {
  className?: string
}

export default function ScrollHint({ className = '' }: ScrollHintProps) {
  const t = useT()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className={`flex items-center gap-1 text-xs text-gray-500 motion-safe:animate-pulse ${className}`}>
      <span>{t('ui.swipe')}</span>
      <ChevronRight className="h-3 w-3" aria-hidden="true" />
    </div>
  )
}
