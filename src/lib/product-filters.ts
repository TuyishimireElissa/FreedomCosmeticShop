import { HairType, type Prisma } from '@prisma/client'
import { expandSearchQuery, parsePriceFromQuery, removePriceExpression } from '@/lib/search-vocabulary'
import { findMatchingProductIds, type SearchMatch } from '@/lib/search-match'

/**
 * Shared filter parsing for /api/products and /api/search/facets.
 *
 * WHY THIS EXISTS
 *
 * Facet counts are only trustworthy if they are computed from *exactly* the
 * same predicate as the result list. If the two endpoints each build their own
 * `where` clause they will drift — the sidebar would promise "Skincare (12)"
 * and the grid would then show 9. Alibaba's facet counts update against the
 * active query; that only works if there is one definition of "active query".
 *
 * So the clause builder lives here and both routes call it. /api/products
 * keeps its existing behaviour byte for byte; this is a move, not a rewrite.
 */

export const SKIN_TYPES = new Set(['ALL', 'OILY', 'DRY', 'COMBINATION', 'SENSITIVE', 'NORMAL'])
export const HAIR_TYPES = new Set(['NATURAL', 'RELAXED', 'WAVY', 'CURLY', 'COILY', 'ALL_HAIR'])

/** Every text field the fallback ILIKE path searches. Order is not significant. */
export const SEARCHABLE_TEXT_FIELDS = [
  'name', 'shortDescription', 'description', 'sku', 'ingredients', 'ingredientsRw',
  'expectedResults', 'expectedResultsRw', 'howToUse', 'howToUseRw', 'shade', 'shades',
  'undertone', 'countryOfOrigin',
] as const

export function numericParam(value: string | null) {
  if (value === null || value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export interface ParsedProductFilters {
  search: string
  searchableText: string
  expandedTerms: string[]
  category?: string
  brand?: string
  skinType?: string
  hairType?: string
  shade?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStock: boolean
  featured: boolean
  sort: string
}

export interface FilterParseResult {
  ok: boolean
  /** Present when ok is false. */
  error?: string
  /** Present when ok is true. */
  filters?: ParsedProductFilters
}

/**
 * Parse and validate query params. Returns a structured error instead of
 * throwing so each route can decide its own status code.
 */
export function parseProductFilters(params: URLSearchParams): FilterParseResult {
  const search = (params.get('search') || params.get('q') || '').trim().slice(0, 200)
  const category = params.get('category')?.trim() || undefined
  const brand = params.get('brand')?.trim() || undefined
  const skinType = params.get('skinType')?.trim().toUpperCase() || undefined
  const hairType = params.get('hairType')?.trim().toUpperCase() || undefined
  const shade = params.get('shade')?.trim() || undefined

  const minPriceParam = numericParam(params.get('minPrice'))
  const maxPriceParam = numericParam(params.get('maxPrice'))
  const minRatingParam = numericParam(params.get('minRating'))
  if (minPriceParam === null || maxPriceParam === null || minRatingParam === null) {
    return { ok: false, error: 'Invalid numeric filter' }
  }
  if (skinType && !SKIN_TYPES.has(skinType)) return { ok: false, error: 'Invalid skin type' }
  if (hairType && !HAIR_TYPES.has(hairType)) return { ok: false, error: 'Invalid hair type' }

  const priceSearch = parsePriceFromQuery(search)
  const searchableText = removePriceExpression(search, priceSearch)
  const expandedTerms = expandSearchQuery(searchableText)
  const minPrice = minPriceParam ?? priceSearch?.minPrice
  const maxPrice = maxPriceParam ?? priceSearch?.maxPrice
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { ok: false, error: 'Minimum price cannot exceed maximum price' }
  }

  return {
    ok: true,
    filters: {
      search,
      searchableText,
      expandedTerms,
      category,
      brand,
      skinType,
      hairType,
      shade,
      minPrice,
      maxPrice,
      minRating: minRatingParam,
      inStock: params.get('inStock') === 'true',
      featured: params.get('featured') === 'true',
      sort: params.get('sort') || (search ? 'relevance' : 'newest'),
    },
  }
}

/**
 * Non-search filter clauses. Split out from the search clause so the facets
 * endpoint can drop ONE dimension at a time — the Alibaba behaviour where the
 * category list still shows sibling categories after you pick one.
 */
export function buildFilterClauses(
  filters: ParsedProductFilters,
  omit?: 'category' | 'brand' | 'skinType' | 'price',
): Prisma.ProductWhereInput[] {
  const and: Prisma.ProductWhereInput[] = [{ isActive: true, isDeleted: false }]
  const { category, brand, skinType, hairType, shade, minPrice, maxPrice, minRating } = filters

  if (omit !== 'category' && category && category !== 'all') {
    and.push({ category: { OR: [{ slug: category }, { name: { contains: category, mode: 'insensitive' } }] } })
  }
  if (omit !== 'brand' && brand && brand !== 'all') {
    and.push({ brand: { OR: [{ slug: brand }, { name: { contains: brand, mode: 'insensitive' } }] } })
  }
  if (filters.featured) and.push({ featured: true })
  if (filters.inStock) and.push({ stock: { gt: 0 } })
  if (omit !== 'skinType' && skinType) {
    and.push({ OR: [{ skinType: { contains: skinType } }, { skinType: { contains: 'ALL' } }] })
  }
  if (hairType) and.push({ OR: [{ hairType: hairType as HairType }, { hairType: 'ALL_HAIR' }] })
  if (shade) and.push({ OR: [{ shade: { contains: shade, mode: 'insensitive' } }, { shades: { contains: shade, mode: 'insensitive' } }] })
  if (minRating !== undefined) and.push({ rating: { gte: Math.min(5, minRating) } })
  if (omit !== 'price' && (minPrice !== undefined || maxPrice !== undefined)) {
    and.push({
      price: {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      },
    })
  }
  return and
}

/** The ILIKE fallback used when pg_trgm is unavailable. */
export function buildTextSearchClause(expandedTerms: string[]): Prisma.ProductWhereInput {
  return {
    OR: expandedTerms.flatMap((term) => [
      ...SEARCHABLE_TEXT_FIELDS.map((field) => ({ [field]: { contains: term, mode: 'insensitive' as const } })),
      { brand: { name: { contains: term, mode: 'insensitive' as const } } },
      { category: { name: { contains: term, mode: 'insensitive' as const } } },
    ]) as Prisma.ProductWhereInput[],
  }
}

/**
 * Resolve the search term to a clause, using the trigram index when it is
 * available and degrading to ILIKE when it is not. Speed degrades; recall
 * does not.
 */
export async function resolveSearchClause(expandedTerms: string[], rawSearch: string): Promise<{
  clause: Prisma.ProductWhereInput | null
  match: SearchMatch | null
}> {
  if (expandedTerms.length === 0) return { clause: null, match: null }

  let match: SearchMatch | null = null
  try {
    match = await findMatchingProductIds(expandedTerms, rawSearch)
  } catch (error) {
    console.error('Trigram search failed, falling back to ILIKE:', error)
    match = null
  }

  if (match) {
    // No matches: an impossible id keeps count/pagination/analytics running
    // through the normal path instead of special-casing empty results.
    return { clause: { id: { in: match.ids.length > 0 ? match.ids : ['__no_match__'] } }, match }
  }
  return { clause: buildTextSearchClause(expandedTerms), match: null }
}
