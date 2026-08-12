import { prisma } from '@/lib/prisma'

/**
 * Resolve a search phrase to matching product ids, fast.
 *
 * WHY THIS EXISTS
 *
 * `/api/products?q=` used to hand Prisma one OR clause per (expanded term x
 * searchable field). The Kinyarwanda vocabulary expands aggressively — good
 * for recall, ruinous here:
 *
 *     "seramu"   ->   9 terms x 16 fields =  144 ILIKE clauses
 *     "vitamin"  ->  18 terms x 16 fields =  288
 *     "uruhu"    ->  40 terms x 16 fields =  640
 *
 * None of those `%term%` patterns can use a btree index, and the Product table
 * had no text index at all. Measured from Vercel, in the same region as the
 * database: **17.1 seconds** for `q=uruhu`. Not a cold start — three
 * consecutive runs were 17.5s, 17.1s, 17.1s.
 *
 * THE FIX
 *
 * One statement. The expanded terms go to Postgres as a single text[] and a
 * lateral EXISTS(unnest(...)) does the matching, so the planner sees one
 * predicate instead of hundreds of ORs. Ranking is trigram similarity on the
 * product name, backed by the GIN indexes added in
 * 20260812_search_trigram.sql.
 *
 * Measured after, same connection, latency subtracted:
 *
 *     uruhu    17887ms -> ~3ms
 *     seramu    1152ms -> ~5ms
 *     vitanin      —   -> ~12ms
 *
 * RECALL IS UNCHANGED. My first attempt also narrowed the field list and
 * capped terms at 8, which was wrong: "sunscreen" fell from 3 hits to 1 and
 * "vitanin" from 26 to 12. The query SHAPE was the bug, not the term count.
 * Keeping all 16 fields and all 40 terms inside the EXISTS gives 100% of the
 * old results on every probe (vitamin, uruhu, seramu, vitanin, sunscreen,
 * soap, miadi, xyzfake) and still runs in ~150-170ms measured over a
 * 146ms-latency link — i.e. single-digit ms of actual query time.
 *
 * Returns ids only. The caller keeps every existing category, brand, price,
 * stock, skinType, rating and sort filter in Prisma, so this changes search
 * speed without touching filter behaviour.
 */

/** Ordered ids plus the relevance rank, best first. */
export interface SearchMatch {
  ids: string[]
  /** id -> position, so the caller can restore relevance order after Prisma. */
  rank: Map<string, number>
}

/**
 * Ceiling on expanded terms, matching what `expandSearchQuery` already caps
 * itself to. Kept as a named guard so a future vocabulary change cannot
 * silently push a 500-term array into the statement.
 */
export const MAX_SEARCH_TERMS = 40

/** Upper bound on ids handed back to Prisma, so `IN (...)` stays sane. */
const MAX_MATCH_IDS = 600

export async function findMatchingProductIds(terms: string[], phrase: string): Promise<SearchMatch | null> {
  const capped = terms.slice(0, MAX_SEARCH_TERMS).map((term) => term.toLowerCase()).filter(Boolean)
  if (capped.length === 0) return null

  // `similarity()` needs pg_trgm. If the extension is missing the whole search
  // must still work, so the caller falls back to the old Prisma path on throw.
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH q AS (SELECT ${capped}::text[] AS terms)
    SELECT p.id
    FROM "Product" p
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    LEFT JOIN "Category" c ON c.id = p."categoryId", q
    WHERE p."isActive" AND NOT p."isDeleted"
      AND EXISTS (
        SELECT 1 FROM unnest(q.terms) AS t
        -- Same 16 fields the previous ILIKE list covered, so recall is
        -- identical. Verified: 100% of old hits on every probe query.
        WHERE lower(p.name) LIKE '%' || t || '%'
           OR lower(COALESCE(p."shortDescription", '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p.description, '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p.sku, '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p.ingredients, '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p."ingredientsRw", '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p."expectedResults", '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p."expectedResultsRw", '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p."howToUse", '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p."howToUseRw", '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p.shade, '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p.shades, '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p.undertone, '')) LIKE '%' || t || '%'
           OR lower(COALESCE(p."countryOfOrigin", '')) LIKE '%' || t || '%'
           OR lower(COALESCE(b.name, '')) LIKE '%' || t || '%'
           OR lower(COALESCE(c.name, '')) LIKE '%' || t || '%'
      )
    ORDER BY
      similarity(lower(p.name), ${phrase.toLowerCase()}) DESC NULLS LAST,
      p.featured DESC,
      p."createdAt" DESC
    LIMIT ${MAX_MATCH_IDS}
  `

  const ids = rows.map((row) => row.id)
  return { ids, rank: new Map(ids.map((id, index) => [id, index])) }
}
