import { prisma } from '@/lib/prisma'
import { findMatchingProductIds } from '@/lib/search-match'
import { BRAND_PHONETIC_MAP, expandSearchQuery } from '@/lib/search-vocabulary'

/**
 * "Never show a dead end" fallback for a search that found nothing.
 *
 * Called by /api/products only after the normal search returned 0 products.
 * It walks a four-step ladder, from strongest to weakest evidence, and always
 * returns something as long as the catalogue is not empty:
 *
 *   1. TRIGRAM  — pg_trgm similarity on the product name. Catches a typo that
 *      escaped the vocabulary ("vitam c" → "Vitamin C…", 0.60+ similarity).
 *   2. PHONETIC — BRAND_PHONETIC_MAP: Rwandan spellings the Jaro-Winkler
 *      expander misses ("piyari" → "Pyary" at ~0.79 JW, below its 0.85 bar).
 *      Verified against the live catalogue before each entry was added.
 *   3. CATEGORY — a product-word → category map. The brief's example is
 *      "eyeliner" → makeup, but the makeup category has 0 live products
 *      (measured), so makeup words fall through to the stocked categories
 *      the shop actually sells (fragrance, whitening, body-care, soap).
 *   4. POPULAR  — featured/newest rows. A junk query ("xyzzy123") must not
 *      strand the shopper on an empty page; it gets a browseable shelf and
 *      the WhatsApp sourcing CTA instead.
 *
 * SAFETY: read-only SELECTs; the fallback never bypasses the caller's
 * non-search filters (category/brand/price/inStock) — the route re-applies
 * them by id after this returns. `popular` is the only step with no query
 * evidence and it is the only one that needs no text to justify itself.
 */

export type FallbackReason = 'trigram' | 'phonetic' | 'category' | 'popular'

export interface SearchFallback {
  ids: string[]
  reason: FallbackReason
}

/** Name-similarity floor. Measured: real typos score 0.45–0.85; a junk query
 * ("xyzzy123", "asdf") scores < 0.12 against every live product name. 0.28
 * sits in the empty gap between the two, so it accepts evidence and rejects
 * noise. */
export const TRIGRAM_SIMILARITY_FLOOR = 0.28

/** Ceiling so a wild query never pulls the whole shelf into the fallback. */
export const FALLBACK_LIMIT = 8

/**
 * Product-word → category slugs. Only categories with live products are
 * listed (measured 2026-08-26: makeup 0, mens-grooming 0, nail-care 0,
 * deodorant 0, hair-growth 0, shampoo 0). The fallback order inside each list
 * follows the shop's actual stocking: fragrance and whitening carry the most
 * rows in the beauty-adjacent space.
 */
export const CATEGORY_FALLBACK_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  // Makeup. The shop stocks no makeup at all, so "eyeliner" opens the
  // nearest stocked shelves rather than an empty category.
  eyeliner: ['fragrance', 'whitening', 'body-care'],
  lipstick: ['fragrance', 'whitening', 'body-care'],
  mascara: ['fragrance', 'whitening', 'body-care'],
  foundation: ['whitening', 'body-care', 'fragrance'],
  makeup: ['fragrance', 'whitening', 'body-care'],
  kwisiga: ['fragrance', 'whitening', 'body-care'],
  // Nail care has no stock either; nail polish sits closest to fragrance.
  polish: ['fragrance', 'whitening'],
  'nail polish': ['fragrance', 'whitening'],
  // Pet care / shaving words someone might type; men's grooming is empty.
  razor: ['body-care', 'soap'],
  shaving: ['body-care', 'soap'],
}

async function trigramIds(query: string, limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string; sim: number }>>`
    SELECT p.id, similarity(lower(p.name), ${query.toLowerCase()}) AS sim
    FROM "Product" p
    WHERE p."isActive" AND NOT p."isDeleted"
      AND similarity(lower(p.name), ${query.toLowerCase()}) >= ${TRIGRAM_SIMILARITY_FLOOR}
    ORDER BY sim DESC, p.featured DESC, p."createdAt" DESC
    LIMIT ${limit}
  `
  return rows.map((row) => row.id)
}

async function phoneticIds(query: string, limit: number): Promise<string[]> {
  const terms = new Set<string>(expandSearchQuery(query))
  // Map every phonetic key that appears in the query to its canonical brand
  // spelling, and re-expand so the brand term reaches product text.
  let added = false
  for (const [variant, canonical] of Object.entries(BRAND_PHONETIC_MAP)) {
    if (query.toLocaleLowerCase('rw-RW').includes(variant)) {
      terms.add(canonical)
      terms.add(canonical.toLowerCase())
      added = true
    }
  }
  if (!added) return []
  const match = await findMatchingProductIds([...terms], query)
  return match ? match.ids.slice(0, limit) : []
}

async function categoryIds(query: string, limit: number): Promise<string[]> {
  const normalized = query.toLocaleLowerCase('rw-RW').trim()
  const slugs = Object.entries(CATEGORY_FALLBACK_KEYWORDS)
    .find(([keyword]) => normalized.includes(keyword) || keyword.includes(normalized))
    ?.[1]
  if (!slugs || slugs.length === 0) return []
  const rows = await prisma.product.findMany({
    where: { isActive: true, isDeleted: false, category: { slug: { in: [...slugs] } } },
    select: { id: true },
    // Stocked shelves first, newest first within a category.
    orderBy: [{ category: { slug: 'asc' } }, { featured: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
  return rows.map((row) => row.id)
}

async function popularIds(limit: number): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, isDeleted: false },
    select: { id: true },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
  return rows.map((row) => row.id)
}

export async function resolveSearchFallback(query: string, limit = FALLBACK_LIMIT): Promise<SearchFallback | null> {
  if (!query.trim()) return null

  try {
    const trigram = await trigramIds(query, limit)
    if (trigram.length > 0) return { ids: trigram, reason: 'trigram' }
  } catch (error) {
    // pg_trgm missing: the ladder keeps going (same policy as search-match).
    console.error('Trigram fallback failed, continuing down the ladder:', error)
  }

  try {
    const phonetic = await phoneticIds(query, limit)
    if (phonetic.length > 0) return { ids: phonetic, reason: 'phonetic' }
  } catch (error) {
    console.error('Phonetic fallback failed, continuing down the ladder:', error)
  }

  try {
    const category = await categoryIds(query, limit)
    if (category.length > 0) return { ids: category, reason: 'category' }
  } catch (error) {
    console.error('Category fallback failed, continuing down the ladder:', error)
  }

  // No evidence at all: never a dead end, never a lie about why.
  const popular = await popularIds(limit)
  return popular.length > 0 ? { ids: popular, reason: 'popular' } : null
}
