import { createHmac } from 'node:crypto'
import { DISTRICT_TO_PROVINCE_MAP, getAllDistricts, type RwandaProvince } from '@/lib/rwanda-locations'

/**
 * Helpers for anonymous live-visitor tracking.
 *
 * Privacy model matches the existing analytics pipeline: a raw IP address is
 * used only in-memory for the geolocation lookup and is never persisted or
 * logged. Everything stored is either an HMAC or a coarse place name.
 *
 * IP geolocation in Rwanda resolves to country reliably, province and district
 * only approximately, and cannot resolve sector, cell or village at all:
 * mobile traffic is carrier-NATed through a handful of Kigali gateways. Those
 * three fields come exclusively from the optional visitor-submitted form.
 */

export const VISITOR_ONLINE_WINDOW_MS = 60_000
export const VISITOR_HEARTBEAT_MS = 30_000
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const GEO_TIMEOUT_MS = 6_000

export type VisitorDevice = 'mobile' | 'tablet' | 'desktop'

export interface VisitorGeo {
  country: string | null
  countryCode: string | null
  province: string | null
  district: string | null
}

const EMPTY_GEO: VisitorGeo = { country: null, countryCode: null, province: null, district: null }

interface CacheEntry {
  geo: VisitorGeo
  expiresAt: number
}

const globalForGeoCache = globalThis as unknown as { __freedomVisitorGeoCache?: Map<string, CacheEntry> }
const geoCache = globalForGeoCache.__freedomVisitorGeoCache ?? new Map<string, CacheEntry>()
globalForGeoCache.__freedomVisitorGeoCache = geoCache

/** Stable per-visitor identifier. The client session id never reaches the database. */
export function visitorSessionHash(clientSessionId: string, secret: string) {
  return createHmac('sha256', secret).update(`visitor-session-v1:${clientSessionId}`).digest('hex').slice(0, 40)
}

export function detectDevice(userAgent: string): VisitorDevice {
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return 'tablet'
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return 'mobile'
  return 'desktop'
}

export function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('edg/')) return 'Edge'
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera'
  if (ua.includes('samsungbrowser')) return 'Samsung Internet'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('chrome') || ua.includes('crios')) return 'Chrome'
  if (ua.includes('safari')) return 'Safari'
  return 'Other'
}

/** Group a referrer into a channel. Never stores the full URL with its query string. */
export function classifyReferrer(referrer: string | null | undefined): string {
  if (!referrer) return 'Direct'
  let host: string
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'Direct'
  }
  if (!host) return 'Direct'
  if (host.includes('google')) return 'Google'
  if (host.includes('facebook') || host.includes('fb.')) return 'Facebook'
  if (host.includes('instagram')) return 'Instagram'
  if (host.includes('whatsapp') || host.includes('wa.me')) return 'WhatsApp'
  if (host.includes('tiktok')) return 'TikTok'
  if (host.includes('bing')) return 'Bing'
  if (host.includes('x.com') || host.includes('twitter')) return 'X'
  if (host.includes('linkedin')) return 'LinkedIn'
  return host.slice(0, 60)
}

/** First public address in an X-Forwarded-For chain. */
export function firstPublicIp(forwardedFor: string | null, realIp: string | null): string | null {
  const candidates = [...(forwardedFor || '').split(','), realIp || '']
    .map((value) => value.trim())
    .filter(Boolean)
  for (const candidate of candidates) {
    if (candidate === '::1' || candidate.startsWith('127.')) continue
    if (/^10\./.test(candidate)) continue
    if (/^192\.168\./.test(candidate)) continue
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(candidate)) continue
    if (candidate.startsWith('fc') || candidate.startsWith('fd')) continue
    return candidate
  }
  return null
}

/**
 * Map a provider's free-text region/city onto a real Rwandan district.
 * Anything that is not an exact administrative name is discarded rather than
 * guessed, so the dashboard never shows an invented location.
 */
export function normalizeRwandaGeo(regionName: string | null, cityName: string | null): { province: string | null; district: string | null } {
  const districts = getAllDistricts()
  const candidates = [cityName, regionName].filter((value): value is string => Boolean(value))
  for (const candidate of candidates) {
    const cleaned = candidate.trim().replace(/\s+(province|city|district)$/i, '')
    const match = districts.find((district) => district.toLowerCase() === cleaned.toLowerCase())
    if (match) return { province: DISTRICT_TO_PROVINCE_MAP[match] ?? null, district: match }
  }
  for (const candidate of candidates) {
    const value = candidate.trim().toLowerCase()
    if (value.includes('kigali')) return { province: 'Kigali City', district: null }
    if (value.includes('north')) return { province: 'Northern Province', district: null }
    if (value.includes('south')) return { province: 'Southern Province', district: null }
    if (value.includes('east')) return { province: 'Eastern Province', district: null }
    if (value.includes('west')) return { province: 'Western Province', district: null }
  }
  return { province: null, district: null }
}

interface IpProviderResponse {
  country_name?: unknown
  country?: unknown
  country_code?: unknown
  region?: unknown
  city?: unknown
  success?: unknown
  error?: unknown
}

/**
 * Read the geolocation Vercel already attaches to the request.
 *
 * This is the primary source: it costs nothing, adds no latency, and cannot be
 * rate limited. Vercel resolves country and region at the edge before the
 * function runs.
 */
export function geoFromHeaders(headers: Headers): VisitorGeo | null {
  const countryCode = headers.get('x-vercel-ip-country')
  if (!countryCode) return null
  const region = headers.get('x-vercel-ip-country-region')
  const city = headers.get('x-vercel-ip-city')
  const decodedCity = city ? decodeURIComponent(city) : null
  const { province, district } = countryCode === 'RW'
    ? normalizeRwandaGeo(region, decodedCity)
    : { province: null, district: null }
  return {
    country: countryCode === 'RW' ? 'Rwanda' : countryCode,
    countryCode,
    province,
    district,
  }
}

/**
 * Fallback lookup for environments without Vercel's edge headers.
 *
 * Uses ipwho.is. Providers that throttle on the *calling* server's address are
 * unusable here: serverless egress IPs are shared between tenants, so they
 * return 429 in production regardless of our own request volume.
 *
 * Results are cached 24h per network hash. Every failure path returns
 * EMPTY_GEO, because tracking must never break a page.
 */
export async function lookupGeo(ip: string | null, cacheKey: string | null): Promise<VisitorGeo> {
  if (!ip) return EMPTY_GEO
  const key = cacheKey || ip
  const cached = geoCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.geo

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS)
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!response.ok) {
      console.warn('Visitor geo lookup rejected:', response.status)
      return EMPTY_GEO
    }
    const payload = (await response.json()) as IpProviderResponse
    if (payload.success === false) {
      console.warn('Visitor geo lookup returned no match')
      return EMPTY_GEO
    }

    const country = typeof payload.country === 'string'
      ? payload.country
      : typeof payload.country_name === 'string' ? payload.country_name : null
    const countryCode = typeof payload.country_code === 'string' ? payload.country_code : null
    const region = typeof payload.region === 'string' ? payload.region : null
    const city = typeof payload.city === 'string' ? payload.city : null
    const { province, district } = countryCode === 'RW'
      ? normalizeRwandaGeo(region, city)
      : { province: null, district: null }

    const geo: VisitorGeo = { country, countryCode, province, district }
    geoCache.set(key, { geo, expiresAt: Date.now() + GEO_CACHE_TTL_MS })
    return geo
  } catch (error) {
    console.warn('Visitor geo lookup failed:', error instanceof Error ? error.name : 'unknown')
    return EMPTY_GEO
  } finally {
    clearTimeout(timeout)
  }
}

/** Keep only same-origin paths, without query strings. */
export function normalizeVisitorPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null
  return path.split('?')[0].split('#')[0].slice(0, 120)
}

export type VisitorRange = 'now' | 'hour' | 'today' | 'week' | 'month'

export function rangeStart(range: VisitorRange, now = new Date()): Date {
  const start = new Date(now)
  if (range === 'now') return new Date(now.getTime() - VISITOR_ONLINE_WINDOW_MS)
  if (range === 'hour') return new Date(now.getTime() - 60 * 60 * 1000)
  if (range === 'today') { start.setHours(0, 0, 0, 0); return start }
  if (range === 'week') { start.setDate(start.getDate() - 7); return start }
  start.setMonth(start.getMonth() - 1)
  return start
}

export function isRwandaProvince(value: string): value is RwandaProvince {
  return ['Kigali City', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province'].includes(value)
}
