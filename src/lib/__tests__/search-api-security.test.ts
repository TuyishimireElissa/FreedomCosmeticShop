import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const productsRoute = read('src/app/api/products/route.ts')
const suggestionsRoute = read('src/app/api/search/suggestions/route.ts')
const trackingRoute = read('src/app/api/search/track-zero-result/route.ts')
const popularRoute = read('src/app/api/search/popular/route.ts')
const analyticsService = read('src/server/services/search-analytics.ts')
const schema = read('prisma/schema.prisma')

describe('search API data and analytics security', () => {
  it('stores real result counts in an indexed SearchLog model', () => {
    expect(schema).toContain('model SearchLog {')
    expect(schema).toContain('resultCount Int')
    expect(schema).toContain('@@index([hasResults])')
    expect(productsRoute).toContain('recordSearch({')
  })

  it('stores no raw query or direct user identity in search analytics', () => {
    expect(analyticsService).toContain("query: hashSearchValue(normalizedQuery, 'query')")
    expect(analyticsService).toContain('userId: null')
    expect(analyticsService).toContain("session ? hashSearchValue(session, 'session') : null")
    expect(productsRoute).not.toContain("params.get('userId')")
    expect(trackingRoute).not.toContain('userId: parsed.data')
  })

  it('rate-limits and validates public zero-result tracking', () => {
    expect(trackingRoute).toContain('BodySchema.safeParse')
    expect(trackingRoute).toContain('maxActions: 30')
    expect(trackingRoute).toContain("resultCount: 0")
  })

  it('returns at most six real in-stock product suggestions with resized images', () => {
    expect(suggestionsRoute).toContain('stock: { gt: 0 }')
    expect(suggestionsRoute).toContain('take: 6')
    expect(suggestionsRoute).toContain("getCloudinaryUrl(structured.publicId, 'THUMBNAIL')")
    expect(suggestionsRoute).not.toContain('costPrice')
    expect(suggestionsRoute).not.toContain('supplierId')
  })

  it('does not expose hashed identifiers as readable popular searches', () => {
    // Updated when the controlled vocabulary shipped. This used to assert the
    // endpoint returned `data: []` — i.e. that it reported nothing at all. That
    // was a description of a missing feature, not of a security property, and
    // it would have blocked the safe implementation.
    //
    // The guarantee that actually matters is unchanged and is asserted below:
    // no hashed identifier and no customer text ever reaches the response. The
    // endpoint reads one column — a term from our own fixed vocabulary.
    expect(popularRoute).toContain('rawQueriesStored: false')

    // No hash may be selected, returned, or reversed here.
    expect(popularRoute).not.toContain('hashSearchValue')
    expect(popularRoute).not.toContain('sha256')

    // The only SearchLog column read is the controlled term.
    expect(popularRoute).toContain(`"filters"->>'term'`)
    expect(popularRoute).not.toMatch(/SELECT[\s\S]*?"query"/)
    expect(popularRoute).not.toMatch(/SELECT[\s\S]*?"sessionId"/)

    // And nothing outside the published vocabulary can be emitted.
    expect(popularRoute).toContain('known.has(row.term)')
  })

  it('still refuses to store raw query text', () => {
    // The privacy model itself, asserted at the write side.
    expect(analyticsService).toContain("hashSearchValue(normalizedQuery, 'query')")
    expect(analyticsService).not.toMatch(/query:\s*normalizedQuery\b/)
    expect(analyticsService).not.toMatch(/term:\s*normalizedQuery\b/)
  })
})
