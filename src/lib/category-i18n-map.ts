/**
 * The one map from a category slug to its i18n key.
 *
 * WHY THIS FILE EXISTS
 *
 * Three separate, inconsistent maps existed, and two of them were wrong:
 *
 *   ProductsPageClient.tsx  had `mens`, but the database slug is
 *                           `mens-grooming`, so it never matched and the
 *                           filter chip fell back to English.
 *   CategoryGrid.tsx        was missing `fragrance` and `mens-grooming`
 *                           entirely, so a Kinyarwanda shopper saw
 *                           "Fragrance" on the homepage instead of
 *                           "Imibavu" — even though the translation existed.
 *   Navbar.tsx              had correct slugs but hardcoded the whole list,
 *                           so it could never reflect the database.
 *
 * Every slug below is the exact value stored in Category.slug. A mismatch
 * here is invisible at build time and silently renders English, which is why
 * a test asserts this map covers every slug the database returns.
 *
 * RESOLUTION ORDER used by callers, best first:
 *   1. `Category.nameRw` from the database — owner-editable in admin
 *   2. this map -> the reviewed string in rw.ts
 *   3. `Category.name` — the English fallback, never blank
 */

/** Slug as stored in the database -> dotted i18n key. */
export const CATEGORY_I18N_KEYS: Readonly<Record<string, string>> = {
  // ─── Live categories ──────────────────────────────────────────────
  skincare: 'categories.skincare',
  'body-care': 'categories.body_care',
  fragrance: 'categories.fragrance',
  haircare: 'categories.haircare',
  makeup: 'categories.makeup',
  'mens-grooming': 'categories.mens',

  // The ghost duplicate of `haircare`. Deleted and inactive, but mapped so
  // that if anything ever surfaces it, it renders in Kinyarwanda rather than
  // as a raw slug.
  'hair-care': 'categories.haircare',

  // ─── Added in a later phase ───────────────────────────────────────
  // Listed now so the map is complete the moment the rows exist. A slug with
  // no row simply never gets looked up; an unmapped slug renders English,
  // which is the failure this file removes.
  soap: 'categories.soap',
  whitening: 'categories.whitening',
  'baby-kids': 'categories.baby_kids',
  'body-oil': 'categories.body_oil',
  'petroleum-jelly': 'categories.petroleum_jelly',
  'hair-growth': 'categories.hair_growth',
  'natural-organic': 'categories.natural_organic',
  'nail-care': 'categories.nail_care',
  deodorant: 'categories.deodorant',
  shampoo: 'categories.shampoo',
} as const

/** Slugs older code referenced that are not database values. Kept for safety. */
export const CATEGORY_I18N_ALIASES: Readonly<Record<string, string>> = {
  // CategoryGrid carried these two; neither is a real slug, but a stale link
  // or bookmark could still send them through.
  'bath-body': 'categories.body_care',
  mens: 'categories.mens',
  natural: 'categories.natural',
} as const

/**
 * Best display name for a category.
 *
 * `translate` is the caller's `t()`. It is passed in rather than imported so
 * this stays a plain module — the i18n context is React-only, and server
 * code needs the same resolution.
 */
export function categoryLabel(
  category: { slug: string; name: string; nameRw?: string | null },
  translate: (key: string) => string,
  language: string,
): string {
  // 1. Owner-set Kinyarwanda from the database wins, but only in Kinyarwanda.
  if (language === 'rw' && category.nameRw && category.nameRw.trim()) {
    return category.nameRw.trim()
  }
  // 2. The reviewed translation for a known slug.
  const key = CATEGORY_I18N_KEYS[category.slug] ?? CATEGORY_I18N_ALIASES[category.slug]
  if (key) {
    const translated = translate(key)
    // `t()` returns the key itself when a key is missing. Treat that as a
    // miss rather than printing "categories.soap" to a customer.
    if (translated && translated !== key) return translated
  }
  // 3. The English name. Never blank, because `name` is NOT NULL.
  return category.name
}
