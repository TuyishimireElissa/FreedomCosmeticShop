'use client'

import { useEffect, useState } from 'react'
import { resolveTranslation, type TranslationVariables } from '@/lib/i18n'

type Priority = 'polite' | 'assertive'
type Listener = (message: string, priority: Priority) => void

const listeners = new Set<Listener>()

export function announce(message: string, priority: Priority = 'polite') {
  const normalized = message.trim()
  if (!normalized) return
  listeners.forEach((listener) => listener(normalized, priority))
}

/** Use translation keys from non-React stores while honoring the active document language. */
export function announceTranslated(
  key: string,
  variables?: TranslationVariables,
  priority: Priority = 'polite',
) {
  if (typeof document === 'undefined') return
  const language = document.documentElement.lang === 'en' ? 'en' : 'rw'
  announce(resolveTranslation(language, key, variables), priority)
}

export default function LiveAnnouncer() {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  useEffect(() => {
    let politeTimer: ReturnType<typeof setTimeout> | null = null
    let assertiveTimer: ReturnType<typeof setTimeout> | null = null

    const listener: Listener = (message, priority) => {
      const setMessage = priority === 'assertive' ? setAssertiveMessage : setPoliteMessage
      const currentTimer = priority === 'assertive' ? assertiveTimer : politeTimer
      if (currentTimer) clearTimeout(currentTimer)

      // Clearing first lets assistive technology announce an identical message again.
      setMessage('')
      const nextTimer = setTimeout(() => {
        setMessage(message)
        const clearTimer = setTimeout(() => setMessage(''), 1500)
        if (priority === 'assertive') assertiveTimer = clearTimer
        else politeTimer = clearTimer
      }, 50)
      if (priority === 'assertive') assertiveTimer = nextTimer
      else politeTimer = nextTimer
    }

    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      if (politeTimer) clearTimeout(politeTimer)
      if (assertiveTimer) clearTimeout(assertiveTimer)
    }
  }, [])

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>
    </>
  )
}
