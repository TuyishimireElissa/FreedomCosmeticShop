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
    expect(popularRoute).toContain('rawQueriesStored: false')
    expect(popularRoute).toContain('controlledVocabularyConfigured: false')
    expect(popularRoute).toContain('data: []')
    expect(popularRoute).not.toContain('prisma.searchLog.groupBy')
  })
})
