/**
 * Safe readers for the legacy product JSON-string columns.
 *
 * `Product.images`, `Product.skinType`, `Product.shades`, and
 * `Product.ingredients` are stored as JSON *strings* for backward
 * compatibility (see prisma/schema.prisma). Nothing at the database level
 * enforces that shape, so a direct SQL write or an import script can leave a
 * plain sentence in one of those columns.
 *
 * A bare `JSON.parse()` on such a row throws, and because admin list routes
 * serialize inside a single `.map()`, one malformed row used to abort the whole
 * page and return HTTP 500 — the admin product list rendered "No products"
 * while 108 products sat healthy in the database (2026-08-23 incident:
 * "Movit Blow Out Creme Hair Relaxer (150g)" had the sentence
 * "Refer to the product packaging for the complete INCI ingredient list."
 * stored in `ingredients`).
 *
 * The storefront never broke because `src/lib/public-product.ts` already
 * parsed defensively. These helpers give the admin routes the same guarantee
 * from one shared source of truth: a bad row degrades to an empty list for
 * that single field instead of taking down every other product beside it.
 */

/**
 * Parse a legacy JSON-array column.
 *
 * - empty / null / undefined  -> `null`   (field genuinely not set)
 * - valid JSON array          -> the array
 * - valid JSON, but not array -> `[]`     (wrong shape, treated as empty)
 * - malformed JSON            -> `[]`     (never throws)
 */
export function parseProductJsonArray(value: string | null | undefined): unknown[] | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Same as {@link parseProductJsonArray}, but never returns `null`.
 * Used for `images`, which is non-nullable and defaults to `"[]"`.
 */
export function parseProductStringArray(value: string | null | undefined): string[] {
  const parsed = parseProductJsonArray(value)
  if (!parsed) return []
  return parsed.filter((item): item is string => typeof item === 'string')
}

/**
 * Serialize the four legacy JSON columns of a product row for admin responses.
 *
 * Returns a new object; the input row is not mutated. Guaranteed not to throw
 * on malformed column data.
 */
export function serializeProductJsonColumns<
  T extends {
    images: string
    skinType: string | null
    shades: string | null
    ingredients: string | null
  },
>(product: T) {
  return {
    ...product,
    images: parseProductStringArray(product.images),
    skinType: parseProductJsonArray(product.skinType),
    shades: parseProductJsonArray(product.shades),
    ingredients: parseProductJsonArray(product.ingredients),
  }
}
