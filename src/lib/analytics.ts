import {
  type AnalyticsDevice,
  type AnalyticsLanguage,
  type SafeAnalyticsMetadata,
  type TrackEventData,
} from '@/lib/analytics-events'

export { EVENTS } from '@/lib/analytics-events'
export type { AnalyticsPaymentMethod, EventName, TrackEventData } from '@/lib/analytics-events'

export const ANALYTICS_CONSENT_KEY = 'fcs_analytics_consent'
const SESSION_KEY = 'fcs_analytics_session'

export function hasAnalyticsConsent() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'granted'
  } catch {
    return false
  }
}

export function setAnalyticsConsent(granted: boolean) {
  if (typeof window === 'undefined') return
  try {
    if (granted) window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted')
    else {
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'denied')
      window.sessionStorage.removeItem(SESSION_KEY)
    }
  } catch {
    // Storage restrictions keep analytics disabled.
  }
}

export function getDeviceType(userAgent?: string): AnalyticsDevice {
  const value = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  if (/tablet|ipad|playbook|silk/i.test(value)) return 'tablet'
  if (/mobi|android|iphone|ipod|phone/i.test(value)) return 'mobile'
  return 'desktop'
}

function createSessionHash() {
  if (typeof crypto === 'undefined') return undefined
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

function getSessionHash() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const created = createSessionHash()
    if (created) window.sessionStorage.setItem(SESSION_KEY, created)
    return created
  } catch {
    return undefined
  }
}

function currentLanguage(): AnalyticsLanguage {
  try {
    return window.localStorage.getItem('fcs_language') === 'en' ? 'en' : 'rw'
  } catch {
    return 'rw'
  }
}

function safePath(value?: string) {
  const path = (value || window.location.pathname).trim().split(/[?#]/, 1)[0]
  return path.startsWith('/') && !path.startsWith('//') ? path.slice(0, 300) : undefined
}

function safeMetadata(metadata: SafeAnalyticsMetadata | undefined): SafeAnalyticsMetadata | undefined {
  if (!metadata) return undefined
  return {
    ...(Number.isInteger(metadata.quantity) && (metadata.quantity || 0) >= 0 && (metadata.quantity || 0) <= 1000 ? { quantity: metadata.quantity } : {}),
    ...(Number.isInteger(metadata.resultCount) && (metadata.resultCount || 0) >= 0 && (metadata.resultCount || 0) <= 1_000_000 ? { resultCount: metadata.resultCount } : {}),
    ...(metadata.context ? { context: metadata.context } : {}),
    ...(metadata.step ? { step: metadata.step } : {}),
    ...(metadata.reasonCode && /^[A-Z0-9_]{1,50}$/.test(metadata.reasonCode) ? { reasonCode: metadata.reasonCode } : {}),
    ...(metadata.couponType ? { couponType: metadata.couponType } : {}),
    ...(metadata.source ? { source: metadata.source } : {}),
  }
}

/**
 * Consent-gated first-party analytics. Direct identifiers, contact details,
 * addresses, payment references, credentials, card data, and raw search terms
 * are never read or sent by this service.
 */
export async function trackEvent(data: TrackEventData): Promise<void> {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        consent: true,
        event: data.event,
        path: safePath(data.path),
        productId: data.productId,
        productSlug: data.productSlug,
        productCategory: data.productCategory,
        device: getDeviceType(),
        district: data.district,
        language: currentLanguage(),
        paymentMethod: data.paymentMethod,
        sessionHash: getSessionHash(),
        value: data.value,
        metadata: safeMetadata(data.metadata),
      }),
    })
  } catch {
    // Analytics must never block or alter the customer experience.
  }
}
