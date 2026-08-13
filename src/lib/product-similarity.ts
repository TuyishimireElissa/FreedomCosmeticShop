/**
 * Similarity scoring for the "More Like This" rail.
 *
 * Lives in lib rather than in the route because Next.js refuses any export
 * from a route file other than a handler — the build fails with
 * `"scoreSimilarity" is not a valid Route export field`. It is pure logic with
 * no request context, so lib is the right home regardless.
 *
 * SCORING, and why it is not the brief's version.
 *
 * The brief asks for "same category, same color, same skinType (in that
 * priority)". Colour does not exist on this model — no colour column, no tags
 * column, `shadeHex` NULL on all 106 live products — so a colour term would
 * contribute exactly zero to every score. It is omitted rather than left in as
 * dead weight. Owner decision, 2026-08-13.
 *
 * skinType is present on only 22 of 106 products, so it cannot carry the
 * ranking either. It is a bonus, never a filter: requiring a skinType match
 * would return nothing for the 84 products that have none.
 *
 * What actually discriminates in this catalogue is category and price band:
 *
 *     same category          +100   (also the hard filter)
 *     shared skin type    up to +30  (specific match worth more than "ALL")
 *     price within +/-30%  up to +20 (sliding by closeness)
 *     in stock                +10
 *     same brand              -15   (penalty)
 *
 * SAME-BRAND PENALTY. "More like this" is a discovery surface, and four more
 * bottles from the brand already on screen is the least useful answer. The
 * penalty is small enough that a same-brand product still wins when it is
 * otherwise a much better match. With 2 of 106 products carrying a brand this
 * is almost always a no-op today, but it encodes the intent for when brands
 * are filled in.
 */

export interface SimilarityCandidate {
  categoryId: string
  brandId: string | null
  price: number
  stock: number
  skinType: string | null
}

export interface SimilaritySeed {
  categoryId: string
  brandId: string | null
  price: number
  skinType: string | null
}

/** Parse the JSON-array skinType column into a set of upper-case values. */
export function parseSkinTypes(value: string | null): Set<string> {
  if (!value) return new Set()
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().toUpperCase())
        .filter(Boolean),
    )
  } catch {
    // The column is free text and NULL on 84 of 106 rows. A malformed value
    // must never take down the product page.
    return new Set()
  }
}

export function scoreSimilarity(candidate: SimilarityCandidate, seed: SimilaritySeed) {
  let score = 0
  if (candidate.categoryId === seed.categoryId) score += 100

  const seedSkin = parseSkinTypes(seed.skinType)
  const candidateSkin = parseSkinTypes(candidate.skinType)
  if (seedSkin.size > 0 && candidateSkin.size > 0) {
    // "ALL" matches everything, so it is worth less than a specific match.
    let shared = 0
    for (const value of candidateSkin) if (seedSkin.has(value)) shared += value === 'ALL' ? 1 : 2
    score += Math.min(30, shared * 10)
  }

  if (seed.price > 0) {
    const delta = Math.abs(candidate.price - seed.price) / seed.price
    if (delta <= 0.3) score += Math.round(20 * (1 - delta / 0.3))
  }

  if (candidate.stock > 0) score += 10
  if (candidate.brandId && seed.brandId && candidate.brandId === seed.brandId) score -= 15

  return score
}
