'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ANALYTICS_CONSENT_KEY } from '@/lib/analytics'

/**
 * Sends an anonymous heartbeat so the admin dashboard can show live visitors.
 *
 * Uses sendBeacon, which the browser queues off the main thread, so it never
 * competes with rendering. Runs only when the visitor has already accepted
 * analytics, and stays silent on admin routes.
 */

export const VISITOR_SESSION_STORAGE_KEY = 'fcs_visitor_session'
const HEARTBEAT_MS = 30_000

export function getVisitorSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const existing = window.sessionStorage.getItem(VISITOR_SESSION_STORAGE_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.sessionStorage.setItem(VISITOR_SESSION_STORAGE_KEY, created)
    return created
  } catch {
    return null
  }
}

function hasConsent(): boolean {
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'granted'
  } catch {
    return false
  }
}

export default function VisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return
    if (!hasConsent()) return
    const sessionId = getVisitorSessionId()
    if (!sessionId) return

    const send = () => {
      const body = JSON.stringify({ sessionId, path: pathname, referrer: document.referrer || null })
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/visitors/heartbeat', new Blob([body], { type: 'application/json' }))
          return
        }
      } catch {
        // fall through to fetch
      }
      void fetch('/api/visitors/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }

    send()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') send()
    }, HEARTBEAT_MS)
    return () => window.clearInterval(timer)
  }, [pathname])

  return null
}
