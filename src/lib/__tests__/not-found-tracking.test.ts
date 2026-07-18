import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  classifyUserAgent,
  dailyNetworkHash,
  normalizeNotFoundPath,
  sanitizeReferrer,
} from '@/lib/not-found-analytics'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const schema = read('prisma/schema.prisma')
const route = read('src/app/api/analytics/404/route.ts')
const page = read('src/app/not-found.tsx')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('privacy-minimized 404 tracking', () => {
  it('normalizes paths without retaining queries or fragments', () => {
    expect(normalizeNotFoundPath('/missing?phone=0780000000#part')).toBe('/missing')
    expect(normalizeNotFoundPath('//external.example/path')).toBeNull()
    expect(normalizeNotFoundPath('https://external.example/path')).toBeNull()
    expect(normalizeNotFoundPath(`/${'a'.repeat(700)}`)?.length).toBe(500)
  })

  it('stores only referrer origin and path', () => {
    expect(sanitizeReferrer('https://example.com/path?token=secret#part')).toBe('https://example.com/path')
    expect(sanitizeReferrer('javascript:alert(1)')).toBeNull()
    expect(sanitizeReferrer('not a url')).toBeNull()
  })

  it('reduces user agents to coarse device families', () => {
    expect(classifyUserAgent('Mozilla Android Chrome')).toBe('Android')
    expect(classifyUserAgent('Mozilla iPhone Safari')).toBe('iOS')
    expect(classifyUserAgent('Mozilla Windows NT')).toBe('Windows')
    expect(classifyUserAgent(null)).toBeNull()
  })

  it('uses a daily rotating keyed hash without exposing the raw address', () => {
    const first = dailyNetworkHash('192.0.2.1', 'a-secure-test-secret', new Date('2026-07-18T10:00:00Z'))
    const sameDay = dailyNetworkHash('192.0.2.1', 'a-secure-test-secret', new Date('2026-07-18T23:00:00Z'))
    const nextDay = dailyNetworkHash('192.0.2.1', 'a-secure-test-secret', new Date('2026-07-19T10:00:00Z'))
    expect(first).toBe(sameDay)
    expect(first).not.toBe(nextDay)
    expect(first).not.toContain('192.0.2.1')
    expect(first).toHaveLength(24)
  })

  it('adds only an additive indexed analytics model', () => {
    expect(schema).toContain('model NotFoundLog {')
    expect(schema).toContain('@@index([path])')
    expect(schema).toContain('@@index([createdAt])')
    expect(schema).toContain('Raw IP addresses, query strings, and full')
  })

  it('validates origin and input, rate limits writes, and avoids raw identifiers', () => {
    expect(route).toContain("origin !== requestOrigin")
    expect(route).toContain('schema.safeParse(await request.json())')
    expect(route).toContain("rateLimit(`not-found:${ipHash || 'unknown'}`")
    expect(route).toContain('dailyNetworkHash(')
    expect(route).toContain('classifyUserAgent(')
    expect(route).toContain("'Cache-Control': 'private, no-store, max-age=0'")
    expect(route).not.toContain('ipAddress:')
  })

  it('tracks without blocking navigation and renders translated suggestions', () => {
    expect(page).toContain("fetch('/api/analytics/404'")
    expect(page).toContain('keepalive: true')
    expect(page).toContain('.catch(() => {})')
    expect(page).toContain("t('pages.or_try')")
    expect(page).toContain("t('categories.skincare')")
    expect(page).toContain("t('categories.haircare')")
    expect(page).toContain("t('categories.makeup')")
    expect(page).not.toContain("language === 'rw'")
  })

  it('provides English and verified Kinyarwanda suggestion labels', () => {
    expect(english).toMatch(/or_try:/)
    expect(kinyarwanda).toMatch(/or_try:.*\/\/ verified-rw/)
  })
})
