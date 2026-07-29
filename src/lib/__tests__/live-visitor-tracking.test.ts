import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  classifyReferrer,
  detectBrowser,
  detectDevice,
  firstPublicIp,
  geoFromHeaders,
  normalizeRwandaGeo,
  normalizeVisitorPath,
  rangeStart,
  visitorSessionHash,
} from '@/lib/visitor-tracking'
import { getCellsForSector, getVillagesForCell, isValidRwandaLocation } from '@/lib/rwanda-locations'

const read = (path: string) => readFileSync(path, 'utf8')
const schema = read('prisma/schema.prisma')
const heartbeat = read('src/app/api/visitors/heartbeat/route.ts')
const visitorLib = read('src/lib/visitor-tracking.ts')
const locationRoute = read('src/app/api/visitors/location/route.ts')
const adminRoute = read('src/app/api/admin/visitors/route.ts')
const exportRoute = read('src/app/api/admin/visitors/export/route.ts')
const tracker = read('src/components/visitors/VisitorTracker.tsx')
const form = read('src/components/visitors/VisitorLocationForm.tsx')
const dashboard = read('src/components/admin/AdminLiveVisitors.tsx')
const migration = read('prisma/manual-migrations/20260729_visitor_tracking.sql')

describe('live visitor tracking', () => {
  it('adds only the two new tables and never alters an existing one', () => {
    expect(schema).toContain('model VisitorSession {')
    expect(schema).toContain('model VisitorLocation {')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "VisitorSession"')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "VisitorLocation"')
    expect(migration).not.toMatch(/ALTER TABLE "(Product|Order|User|Payment|Banner)"/)
    expect(migration).not.toMatch(/DROP\s+TABLE/i)
  })

  it('never stores a raw IP address', () => {
    // The address is used in-memory for the geo lookup and then discarded.
    expect(schema).not.toMatch(/model VisitorSession[\s\S]*?ipAddress/)
    expect(heartbeat).toContain('visitorSessionHash(parsed.data.sessionId, secret)')
    expect(heartbeat).toContain('dailyNetworkHash(')
    expect(migration).not.toContain('"ipAddress"')
    // Session identity is an HMAC, never the client value itself.
    const first = visitorSessionHash('session-abc', 'secret-one')
    expect(first).not.toContain('session-abc')
    expect(first).toHaveLength(40)
    expect(visitorSessionHash('session-abc', 'secret-one')).toBe(first)
    expect(visitorSessionHash('session-abc', 'secret-two')).not.toBe(first)
  })

  it('keeps every admin surface behind the existing permission helper', () => {
    expect(adminRoute).toContain('requirePermission(PERMISSIONS.ANALYTICS_READ)')
    expect(exportRoute).toContain('requirePermission(PERMISSIONS.ANALYTICS_READ)')
  })

  it('rate limits and origin checks the public endpoints', () => {
    for (const route of [heartbeat, locationRoute]) {
      expect(route).toContain("origin !== requestOrigin")
      expect(route).toContain('rateLimit(')
    }
  })

  it('accepts only real Rwandan administrative names', () => {
    expect(locationRoute).toContain('isValidRwandaLocation(')
    expect(isValidRwandaLocation('Kigali City', 'Gasabo')).toBe(true)
    expect(isValidRwandaLocation('Kigali City', 'Musanze')).toBe(false)
    expect(isValidRwandaLocation('Kigali City', 'Gasabo', 'Nowhere Sector')).toBe(false)
  })

  it('resolves the full hierarchy down to village from the vendored dataset', () => {
    const cells = getCellsForSector('Gasabo', 'Remera')
    expect(cells.length).toBeGreaterThan(0)
    const villages = getVillagesForCell('Gasabo', 'Remera', cells[0])
    expect(villages.length).toBeGreaterThan(0)
    expect(isValidRwandaLocation('Kigali City', 'Gasabo', 'Remera', cells[0], villages[0])).toBe(true)
  })

  it('treats IP location as an estimate and never invents a district', () => {
    expect(normalizeRwandaGeo('Kigali', 'Gasabo')).toEqual({ province: 'Kigali City', district: 'Gasabo' })
    // A province-level hit must not be promoted to a district.
    expect(normalizeRwandaGeo('Kigali City', null)).toEqual({ province: 'Kigali City', district: null })
    // Unknown places are discarded rather than guessed.
    expect(normalizeRwandaGeo('Somewhere', 'Nowhere')).toEqual({ province: null, district: null })
    expect(dashboard).toContain('estimate')
    expect(dashboard).toContain('stated')
  })

  it('prefers Vercel edge geo headers over an outbound lookup', () => {
    // ipapi.co throttles on the calling server's IP, and serverless egress
    // addresses are shared, so it 429s in production. Edge headers cannot.
    expect(heartbeat).toContain('geoFromHeaders(request.headers)')
    expect(visitorLib).not.toContain('ipapi.co')
    expect(visitorLib).toContain('ipwho.is')

    const rwanda = geoFromHeaders(new Headers({
      'x-vercel-ip-country': 'RW',
      'x-vercel-ip-country-region': 'Kigali',
      'x-vercel-ip-city': 'Gasabo',
    }))
    expect(rwanda).toEqual({ country: 'Rwanda', countryCode: 'RW', province: 'Kigali City', district: 'Gasabo' })

    // Non-Rwandan traffic records the country but never a Rwandan district.
    const abroad = geoFromHeaders(new Headers({ 'x-vercel-ip-country': 'KE' }))
    expect(abroad?.countryCode).toBe('KE')
    expect(abroad?.district).toBeNull()

    // Absent headers fall through to the lookup rather than inventing a value.
    expect(geoFromHeaders(new Headers())).toBeNull()
  })

  it('classifies device, browser and referrer without identifying anyone', () => {
    expect(detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')).toBe('mobile')
    expect(detectDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet')
    expect(detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop')
    expect(detectBrowser('Mozilla/5.0 Chrome/120 Safari/537')).toBe('Chrome')
    expect(classifyReferrer('https://www.google.com/search?q=secret+query')).toBe('Google')
    expect(classifyReferrer(null)).toBe('Direct')
    // The raw referrer URL, including its query string, is never retained.
    expect(classifyReferrer('https://www.google.com/search?q=secret+query')).not.toContain('secret')
  })

  it('discards private addresses and off-site paths', () => {
    expect(firstPublicIp('10.0.0.1, 41.186.1.2', null)).toBe('41.186.1.2')
    expect(firstPublicIp('192.168.1.1', null)).toBeNull()
    expect(firstPublicIp(null, '127.0.0.1')).toBeNull()
    expect(normalizeVisitorPath('/products?q=serum')).toBe('/products')
    expect(normalizeVisitorPath('https://evil.example.com')).toBeNull()
    expect(normalizeVisitorPath('//evil.example.com')).toBeNull()
  })

  it('computes live presence from lastSeenAt so it survives serverless restarts', () => {
    expect(adminRoute).toContain('VISITOR_ONLINE_WINDOW_MS')
    expect(adminRoute).toContain('lastSeenAt: { gte: onlineSince }')
    const now = new Date('2026-07-29T12:00:00.000Z')
    expect(rangeStart('now', now).getTime()).toBe(now.getTime() - 60_000)
    expect(rangeStart('hour', now).getTime()).toBe(now.getTime() - 3_600_000)
  })

  it('is opt-in, off the main thread, and absent from admin pages', () => {
    expect(tracker).toContain('ANALYTICS_CONSENT_KEY')
    expect(tracker).toContain("if (!hasConsent()) return")
    expect(tracker).toContain("pathname?.startsWith('/admin')")
    expect(tracker).toContain('navigator.sendBeacon')
    // The 362 KB dataset is fetched per level, never bundled into the storefront.
    expect(form).toContain("fetch('/api/visitors/rwanda-locations')")
    expect(form).not.toContain("from '@/data/rwanda-administrative.json'")
    expect(form).toContain('optional')
    expect(form).toContain('We collect anonymous location data to improve our service')
  })

  it('exports CSV that is labelled and safe to open in a spreadsheet', () => {
    expect(exportRoute).toContain('Not provided')
    expect(exportRoute).toContain('Visitor provided')
    expect(exportRoute).toContain('IP estimate')
    // Formula injection guard.
    expect(exportRoute).toContain('/^[=+\\-@\\t\\r]/')
    expect(exportRoute).toContain('text/csv; charset=utf-8')
  })
})
