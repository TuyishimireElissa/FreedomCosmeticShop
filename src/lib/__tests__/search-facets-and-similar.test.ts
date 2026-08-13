/**
 * Phase 1: faceted filter counts and similar products.
 *
 * WHAT THE BRIEF ASKED FOR, AND WHAT WAS ACTUALLY MISSING
 *
 * The brief asked to "extend /api/search to support faceted filtering". There
 * is no /api/search — it returns 404 and never existed. The real endpoint is
 * /api/products, and it ALREADY accepted every facet in the brief:
 * q, category, brand, skinType, hairType, shade, minPrice, maxPrice,
 * minRating, inStock, sort, page, limit. Verified live before writing code.
 *
 * So Phase 1 reduced to the two endpoints that genuinely did not exist:
 * /api/search/facets and /api/products/similar.
 *
 * COLOUR IS DELIBERATELY ABSENT. The brief specifies a colour facet and a
 * colour term in the similarity score. The Product model has no colour column,
 * no tags column, and shadeHex is NULL on all 106 live products. A colour
 * facet would render seven swatches that each match nothing. Owner decision
 * on 2026-08-13: skip colour until the data exists. `colorsAvailable: false`
 * is returned explicitly so the client cannot confuse "no data" with "failed
 * to load".
 *
 * THE COUNTS MUST MATCH THE GRID. Facet counts are only trustworthy if they
 * are computed from the same predicate as the result list, which is why the
 * clause builder moved into src/lib/product-filters.ts and both routes call
 * it. Verified against the live database after that move: vitamin 22,
 * seramu 4, uruhu 70, vitanin 26, izuba 0, xyzfake 0, cream+skincare+price 10
 * — identical to production before the refactor.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  SKIN_TYPES,
  HAIR_TYPES,
  buildFilterClauses,
  buildTextSearchClause,
  numericParam,
  parseProductFilters,
} from '@/lib/product-filters'
import { scoreSimilarity } from '@/lib/product-similarity'

const read = (path: string) => {
  const raw = readFileSync(path, 'utf8')
  expect(raw.length, `${path} is empty`).toBeGreaterThan(200)
  return raw
}
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const facetsRoute = code('src/app/api/search/facets/route.ts')
const similarRoute = code('src/app/api/products/similar/route.ts')
/** Scoring moved to lib: Next.js rejects non-handler exports from a route. */
const similarLib = code('src/lib/product-similarity.ts')
const similarPipeline = `${similarRoute}\n${similarLib}`
const productsRoute = code('src/app/api/products/route.ts')
const filtersLib = code('src/lib/product-filters.ts')

const params = (qs: string) => new URLSearchParams(qs)

describe('filter parsing is shared, so facet counts cannot drift from results', () => {
  it('both endpoints build their predicate from the same module', () => {
    expect(productsRoute).toContain("from '@/lib/product-filters'")
    expect(facetsRoute).toContain("from '@/lib/product-filters'")
    expect(productsRoute).toContain('buildFilterClauses(')
    expect(facetsRoute).toContain('buildFilterClauses(')
  })

  it('accepts every facet the brief listed', () => {
    const parsed = parseProductFilters(params(
      'q=cream&category=skincare&brand=nivea&skinType=OILY&minPrice=1000&maxPrice=20000&inStock=true&sort=price_asc',
    ))
    expect(parsed.ok).toBe(true)
    const filters = parsed.filters!
    expect(filters.category).toBe('skincare')
    expect(filters.brand).toBe('nivea')
    expect(filters.skinType).toBe('OILY')
    expect(filters.minPrice).toBe(1000)
    expect(filters.maxPrice).toBe(20000)
    expect(filters.inStock).toBe(true)
    expect(filters.sort).toBe('price_asc')
  })

  it('treats q and search as the same parameter', () => {
    expect(parseProductFilters(params('q=serum')).filters!.search).toBe('serum')
    expect(parseProductFilters(params('search=serum')).filters!.search).toBe('serum')
  })

  it('rejects a bad skin type rather than silently ignoring it', () => {
    const parsed = parseProductFilters(params('skinType=PURPLE'))
    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/skin type/i)
  })

  it('rejects an inverted price range', () => {
    const parsed = parseProductFilters(params('minPrice=9000&maxPrice=1000'))
    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/exceed/i)
  })

  it('rejects a non-numeric price', () => {
    expect(parseProductFilters(params('minPrice=abc')).ok).toBe(false)
    expect(numericParam('abc')).toBeNull()
    expect(numericParam('-5')).toBeNull()
    expect(numericParam('')).toBeUndefined()
    expect(numericParam('12')).toBe(12)
  })

  it('always excludes inactive and deleted products', () => {
    const and = buildFilterClauses(parseProductFilters(params('')).filters!)
    expect(and[0]).toEqual({ isActive: true, isDeleted: false })
  })

  it('treats category=all as no filter', () => {
    const withAll = buildFilterClauses(parseProductFilters(params('category=all')).filters!)
    const withNone = buildFilterClauses(parseProductFilters(params('')).filters!)
    expect(withAll.length).toBe(withNone.length)
  })

  it('expands Kinyarwanda before filtering', () => {
    // The transliteration the brief lists must survive the refactor.
    expect(parseProductFilters(params('q=seramu')).filters!.expandedTerms).toContain('serum')
    expect(parseProductFilters(params('q=amavuta')).filters!.expandedTerms).toContain('oil')
  })

  it('keeps the ILIKE fallback searching every text field', () => {
    const clause = buildTextSearchClause(['serum'])
    const fields = (clause.OR as Array<Record<string, unknown>>).map((entry) => Object.keys(entry)[0])
    for (const field of ['name', 'shortDescription', 'description', 'ingredients', 'brand', 'category']) {
      expect(fields, `fallback lost ${field}`).toContain(field)
    }
  })
})

describe('each facet omits its own dimension', () => {
  // Alibaba behaviour: after picking Skincare you must still be able to see
  // and switch to Fragrance. If the category counts were computed WITH the
  // category filter applied, the list would collapse to the one you picked.
  const filters = parseProductFilters(params('category=skincare&brand=nivea&skinType=OILY&minPrice=1000&maxPrice=5000')).filters!

  const hasKey = (clauses: ReturnType<typeof buildFilterClauses>, key: string) =>
    clauses.some((clause) => Object.prototype.hasOwnProperty.call(clause, key))

  it('the category facet drops the category filter but keeps the others', () => {
    const clauses = buildFilterClauses(filters, 'category')
    expect(hasKey(clauses, 'category')).toBe(false)
    expect(hasKey(clauses, 'brand')).toBe(true)
    expect(hasKey(clauses, 'price')).toBe(true)
  })

  it('the brand facet drops only brand', () => {
    const clauses = buildFilterClauses(filters, 'brand')
    expect(hasKey(clauses, 'brand')).toBe(false)
    expect(hasKey(clauses, 'category')).toBe(true)
  })

  it('the price facet drops only price, so the range never collapses', () => {
    const clauses = buildFilterClauses(filters, 'price')
    expect(hasKey(clauses, 'price')).toBe(false)
    expect(hasKey(clauses, 'category')).toBe(true)
  })

  it('omitting nothing keeps every filter', () => {
    const clauses = buildFilterClauses(filters)
    expect(hasKey(clauses, 'category')).toBe(true)
    expect(hasKey(clauses, 'brand')).toBe(true)
    expect(hasKey(clauses, 'price')).toBe(true)
  })
})

describe('the facets endpoint is honest about missing data', () => {
  it('never invents a colour facet', () => {
    // No colour column, no tags column, shadeHex NULL on all 106 products.
    expect(facetsRoute).toContain('colorsAvailable: false')
    expect(facetsRoute).toContain('colors: []')
  })

  it('counts with groupBy rather than one query per value', () => {
    // Six categories would otherwise be six round trips to Frankfurt.
    expect(facetsRoute).toContain('groupBy')
    expect(facetsRoute).toContain('Promise.all')
  })

  it('hides categories the catalogue has switched off', () => {
    expect(facetsRoute).toContain('isActive: true')
  })

  it('returns a price range for the slider', () => {
    expect(facetsRoute).toContain('_min: { price: true }')
    expect(facetsRoute).toContain('_max: { price: true }')
  })

  it('wires each facet to its own omission', () => {
    // Mutation testing caught this gap: nothing asserted that the ROUTE
    // actually passes the omit argument. Swapping
    // buildFilterClauses(filters, 'category') for buildFilterClauses(filters)
    // silently collapsed the category list to the selected category, and
    // every test still passed.
    expect(facetsRoute).toContain("buildFilterClauses(filters, 'category')")
    expect(facetsRoute).toContain("buildFilterClauses(filters, 'brand')")
    expect(facetsRoute).toContain("buildFilterClauses(filters, 'skinType')")
    expect(facetsRoute).toContain("buildFilterClauses(filters, 'price')")
    // And the exact-match count, used for the "Apply (N results)" button,
    // must omit nothing.
    expect(facetsRoute).toMatch(/const exactWhere = withSearch\(buildFilterClauses\(filters\)\)/)
  })

  it('validates its input the same way the product list does', () => {
    expect(facetsRoute).toContain('parseProductFilters(')
    expect(facetsRoute).toMatch(/status:\s*400/)
  })
})

describe('similar products rank without inventing data', () => {
  const seed = { categoryId: 'cat-skin', brandId: 'brand-a', price: 10000, skinType: '["OILY"]' }
  const base = { categoryId: 'cat-skin', brandId: null as string | null, price: 10000, stock: 5, skinType: null as string | null }

  it('scores the same category far above a different one', () => {
    const same = scoreSimilarity({ ...base }, seed)
    const other = scoreSimilarity({ ...base, categoryId: 'cat-hair' }, seed)
    expect(same).toBeGreaterThan(other)
    expect(same - other).toBeGreaterThanOrEqual(100)
  })

  it('rewards a shared skin type', () => {
    const shared = scoreSimilarity({ ...base, skinType: '["OILY"]' }, seed)
    const unshared = scoreSimilarity({ ...base, skinType: '["DRY"]' }, seed)
    expect(shared).toBeGreaterThan(unshared)
  })

  it('scores a specific skin match above a generic ALL match', () => {
    const specific = scoreSimilarity({ ...base, skinType: '["OILY"]' }, seed)
    const generic = scoreSimilarity({ ...base, skinType: '["ALL"]' }, { ...seed, skinType: '["OILY","ALL"]' })
    expect(specific).toBeGreaterThanOrEqual(generic)
  })

  it('does not crash on malformed skinType JSON', () => {
    // 84 of 106 products have no skinType at all, and the column is free text.
    expect(() => scoreSimilarity({ ...base, skinType: 'not json' }, seed)).not.toThrow()
    expect(() => scoreSimilarity({ ...base, skinType: '{}' }, seed)).not.toThrow()
    expect(() => scoreSimilarity({ ...base, skinType: null }, seed)).not.toThrow()
  })

  it('prefers a closer price', () => {
    const near = scoreSimilarity({ ...base, price: 10500 }, seed)
    const far = scoreSimilarity({ ...base, price: 13000 }, seed)
    expect(near).toBeGreaterThan(far)
  })

  it('gives no price bonus beyond 30 percent away', () => {
    const inBand = scoreSimilarity({ ...base, price: 12000 }, seed)
    const outOfBand = scoreSimilarity({ ...base, price: 20000 }, seed)
    expect(inBand).toBeGreaterThan(outOfBand)
  })

  it('prefers something the shopper can actually buy', () => {
    expect(scoreSimilarity({ ...base, stock: 3 }, seed)).toBeGreaterThan(scoreSimilarity({ ...base, stock: 0 }, seed))
  })

  it('penalises the same brand, so the rail is a discovery surface', () => {
    const sameBrand = scoreSimilarity({ ...base, brandId: 'brand-a' }, seed)
    const otherBrand = scoreSimilarity({ ...base, brandId: 'brand-b' }, seed)
    expect(otherBrand).toBeGreaterThan(sameBrand)
  })

  it('never divides by a zero seed price', () => {
    expect(() => scoreSimilarity({ ...base }, { ...seed, price: 0 })).not.toThrow()
    expect(Number.isFinite(scoreSimilarity({ ...base }, { ...seed, price: 0 }))).toBe(true)
  })

  it('excludes the product itself and hidden products', () => {
    expect(similarRoute).toContain('id: { not: seed.id }')
    expect(similarRoute).toContain('isActive: true, isDeleted: false')
  })

  it('returns an empty list rather than 404 for an unknown product', () => {
    // The rail hides itself; a 404 would surface a console error on a page
    // that is otherwise fine.
    expect(similarRoute).toMatch(/if \(!seed\) return NextResponse\.json\(\{ success: true/)
  })

  it('caps how many rows it will rank', () => {
    expect(similarRoute).toMatch(/take: 60/)
  })

  it('never scores on colour, because colour does not exist', () => {
    expect(similarPipeline).not.toMatch(/\bcolor(Id)?\b\s*[:=]/)
    expect(similarPipeline).not.toContain('shadeHex')
  })
})

describe('validation constants stay in step with the schema', () => {
  it('lists exactly the skin types the Product model documents', () => {
    expect([...SKIN_TYPES].sort()).toEqual(['ALL', 'COMBINATION', 'DRY', 'NORMAL', 'OILY', 'SENSITIVE'])
  })

  it('lists exactly the HairType enum values', () => {
    expect([...HAIR_TYPES].sort()).toEqual(['ALL_HAIR', 'COILY', 'CURLY', 'NATURAL', 'RELAXED', 'WAVY'])
  })

  it('the shared module still owns the trigram path', () => {
    expect(filtersLib).toContain('findMatchingProductIds')
    expect(filtersLib).toContain('__no_match__')
  })
})
