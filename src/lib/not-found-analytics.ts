import { createHmac } from 'node:crypto'

export function normalizeNotFoundPath(value: string) {
  const path = value.trim().split(/[?#]/, 1)[0]
  if (!path.startsWith('/') || path.startsWith('//')) return null
  return path.slice(0, 500)
}

export function sanitizeReferrer(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return `${url.origin}${url.pathname}`.slice(0, 500)
  } catch {
    return null
  }
}

export function classifyUserAgent(value: string | null) {
  if (!value) return null
  if (/android/i.test(value)) return 'Android'
  if (/iphone|ipad|ipod/i.test(value)) return 'iOS'
  if (/windows/i.test(value)) return 'Windows'
  if (/macintosh|mac os/i.test(value)) return 'macOS'
  if (/linux/i.test(value)) return 'Linux'
  return 'Other'
}

/** Daily-rotating pseudonymous hash; raw network addresses are never returned. */
export function dailyNetworkHash(value: string | null, secret: string, date = new Date()) {
  const normalized = value?.split(',')[0]?.trim()
  if (!normalized || normalized === 'unknown') return null
  const day = date.toISOString().slice(0, 10)
  return createHmac('sha256', `${secret}:${day}`).update(normalized).digest('hex').slice(0, 24)
}
