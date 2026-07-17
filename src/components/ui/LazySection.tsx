'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLowData } from '@/contexts/LowDataContext'
import { useT } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'

interface LazySectionProps {
  children: ReactNode
  label: string
  className?: string
  onLoad?: () => void
}

export default function LazySection({ children, label, className, onLoad }: LazySectionProps) {
  const t = useT()
  const { isLowData } = useLowData()
  const [detectionSettled, setDetectionSettled] = useState(false)
  const [requested, setRequested] = useState(false)
  const loadRequested = useRef(false)

  const load = useCallback(() => {
    if (loadRequested.current) return
    loadRequested.current = true
    onLoad?.()
    setRequested(true)
  }, [onLoad])

  useEffect(() => {
    const timer = window.setTimeout(() => setDetectionSettled(true), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (detectionSettled && !isLowData) load()
  }, [detectionSettled, isLowData, load])

  if (requested) return <>{children}</>

  return (
    <div
      role="region"
      aria-label={label}
      aria-busy={!detectionSettled}
      className={cn('mx-auto my-6 w-[calc(100%-2rem)] max-w-7xl rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center', className)}
    >
      {detectionSettled ? (
        <>
          <p className="text-sm text-gray-600" aria-live="polite">
            {t('low_data.deferred_section', { section: label })}
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-4 min-h-12 rounded-xl bg-[#1a1a1a] px-6 text-sm font-bold text-white transition-colors hover:bg-[#333]"
          >
            {t('low_data.load_section', { section: label })}
          </button>
        </>
      ) : (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      )}
    </div>
  )
}
