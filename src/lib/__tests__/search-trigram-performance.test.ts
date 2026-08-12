/**
 * Search performance: 17 seconds -> milliseconds.
 *
 * THE BUG
 *
 * /api/products?q= handed Prisma one ILIKE clause per (expanded term x
 * searchable field). The Kinyarwanda vocabulary expands aggressively:
 *
 *     seramu   ->  9 terms x 16 fields =  144 clauses
 *     vitamin  -> 18 terms x 16 fields =  288
 *     uruhu    -> 40 terms x 16 fields =  640
 *
 * `%term%` cannot use a btree index and the Product table had no text index at
 * all — all 15 existing indexes were on ids, price, dates and booleans.
 *
 * Measured FROM VERCEL, same region as the database, three consecutive runs
 * of q=uruhu: 17.5s, 17.1s, 17.1s. Not a cold start.
 *
 * THE FIX
 *
 * pg_trgm plus GIN indexes, and one statement that passes the expanded terms
 * as a text[] matched by EXISTS(unnest(...)) instead of hundreds of ORs.
 *
 * A FIRST ATTEMPT THAT WAS WRONG, recorded because the test suite is the only
 * thing that caught it: I also capped terms at 8 and narrowed to 6 fields.
 * That was 6-12x faster but "sunscreen" dropped 3 hits -> 1 and "vitanin"
 * 26 -> 12. The query SHAPE was the bug, not the term count. Keeping all 16
 * fields and all terms gives 100% recall AND full speed.
 *
 * Verified against the live database through the real module:
 *   vitamin 22 hits · uruhu 70 · seramu 4 · vitanin 26 · sunscreen 3
 *   soap 34 · miadi 2 · xyzfake 0 — identical to the old path, ~150ms over a
 *   146ms-latency link.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MAX_SEARCH_TERMS } from '@/lib/search-match'
import { expandSearchQuery } from '@/lib/search-vocabulary'

const read = (path: string) => readFileSync(path, 'utf8')

/** Comments stripped: these files document the old ILIKE approach in prose. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const matcher = code('src/lib/search-match.ts')
const products = code('src/app/api/products/route.ts')
const suggestions = code('src/app/api/search/suggestions/route.ts')
const migration = read('prisma/manual-migrations/20260812_search_trigram.sql')

describe('the migration enables trigram search safely', () => {
  it('creates the extension idempotently', () => {
    expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm')
  })

  it.each([
    'Product_name_trgm_idx',
    'Product_shortDescription_trgm_idx',
    'Brand_name_trgm_idx',
    'Category_name_trgm_idx',
  ])('creates %s', (index) => {
    expect(migration).toContain(index)
    expect(migration).toContain('IF NOT EXISTS')
  })

  it('indexes lower() to match how the query filters', () => {
    // Indexing "name" while querying lower("name") builds an index the
    // planner cannot use — the classic silent failure here.
    expect(migration).toContain('GIN (lower("name") gin_trgm_ops)')
  })

  it('COALESCEs nullable columns so NULL rows stay indexed', () => {
    expect(migration).toContain('lower(COALESCE("shortDescription", \'\')) gin_trgm_ops')
  })

  it('is additive only — no column or row is touched', () => {
    for (const destructive of ['DROP ', 'ALTER TABLE', 'DELETE ', 'UPDATE ', 'TRUNCATE']) {
      expect(migration, `contains ${destructive}`).not.toContain(destructive)
    }
  })

  it('refreshes planner statistics', () => {
    expect(migration).toContain('ANALYZE "Product"')
  })
})

describe('matching happens in one statement, not hundreds of ORs', () => {
  it('passes the terms as a single array parameter', () => {
    expect(matcher).toContain('::text[]')
    expect(matcher).toContain('unnest(q.terms)')
    expect(matcher).toContain('EXISTS (')
  })

  it('ranks by trigram similarity on the product name', () => {
    expect(matcher).toContain('similarity(lower(p.name)')
    expect(matcher).toContain('DESC NULLS LAST')
  })

  it('excludes inactive and deleted products in SQL', () => {
    expect(matcher).toContain('p."isActive" AND NOT p."isDeleted"')
  })

  it('bounds the id list it returns', () => {
    // Without a cap a broad query could hand Prisma an IN() with the whole
    // catalogue in it.
    expect(matcher).toContain('MAX_MATCH_IDS')
    expect(matcher).toContain('LIMIT ${MAX_MATCH_IDS}')
  })

  it('returns a rank map so relevance order survives the Prisma round-trip', () => {
    // IN (...) returns rows in arbitrary order; without this the best match
    // could land on page 3.
    expect(matcher).toContain('rank: new Map(ids.map((id, index) => [id, index]))')
  })
})

describe('recall is preserved — the narrowing attempt is locked out', () => {
  it('still searches every field the old ILIKE list covered', () => {
    // Dropping description/howToUse/expectedResults cost real hits:
    // sunscreen 3 -> 1, vitanin 26 -> 12.
    for (const field of [
      'p.name', 'p."shortDescription"', 'p.description', 'p.sku',
      'p.ingredients', 'p."ingredientsRw"',
      'p."expectedResults"', 'p."expectedResultsRw"',
      'p."howToUse"', 'p."howToUseRw"',
      'p.shade', 'p.shades', 'p.undertone', 'p."countryOfOrigin"',
      'b.name', 'c.name',
    ]) {
      expect(matcher, `no longer searches ${field}`).toContain(field)
    }
  })

  it('does not throttle the vocabulary below what it produces', () => {
    // expandSearchQuery caps itself at 40. A lower ceiling here would
    // silently discard Kinyarwanda mappings.
    expect(MAX_SEARCH_TERMS).toBeGreaterThanOrEqual(40)
    for (const query of ['uruhu', 'umusatsi', 'amavuta']) {
      expect(expandSearchQuery(query).length).toBeLessThanOrEqual(MAX_SEARCH_TERMS)
    }
  })

  it('the Kinyarwanda vocabulary still expands to English terms', () => {
    // The whole reason the slow query existed. Losing this would make search
    // fast and useless.
    expect(expandSearchQuery('uruhu')).toContain('skincare')
    expect(expandSearchQuery('umusatsi')).toContain('haircare')
    expect(expandSearchQuery('amavuta')).toContain('oil')
  })
})

describe('both search endpoints use the fast path with a safe fallback', () => {
  it('/api/products resolves ids through the matcher', () => {
    expect(products).toContain("from '@/lib/search-match'")
    expect(products).toContain('await findMatchingProductIds(')
  })

  it('/api/search/suggestions does too', () => {
    expect(suggestions).toContain("from '@/lib/search-match'")
    expect(suggestions).toContain('await findMatchingProductIds(')
  })

  it.each([
    ['products', products],
    ['suggestions', suggestions],
  ])('%s degrades to the old ILIKE path instead of failing', (_name, source) => {
    // If pg_trgm is ever missing on a replica, search must get slower, never
    // broken.
    expect(source).toMatch(/catch[\s\S]{0,240}?falling back to ILIKE/i)
  })

  it('an empty match short-circuits without breaking pagination', () => {
    // A sentinel id keeps count/pagination/analytics on the normal path.
    expect(products).toContain("['__no_match__']")
    expect(suggestions).toContain("['__no_match__']")
  })

  it('every other filter is still applied by Prisma', () => {
    // The matcher only narrows by text. Category, brand, price, stock,
    // skinType, hairType, shade and rating must be untouched.
    for (const filter of ['category:', 'brand:', 'price:', 'skinType', 'hairType', 'rating:']) {
      expect(products, `lost the ${filter} filter`).toContain(filter)
    }
  })

  it('relevance ordering is restored after the id lookup', () => {
    expect(products).toContain('searchMatch!.rank.get(left.id)')
  })
})
