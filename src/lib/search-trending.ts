/**
 * Trending search terms shown before the shopper types.
 *
 * EVERY TERM HERE WAS RUN AGAINST LIVE PRODUCTION AND RETURNS RESULTS.
 * A trending chip that leads to "no products found" is worse than no chip:
 * it teaches the shopper that search does not work. Measured 2026-08-13
 * against 106 live products:
 *
 *     vitamin C ......... 14 hits
 *     hair food ......... 10 hits
 *     MIADI .............  2 hits
 *     serum / seramu ....  4 hits
 *     amavuta ........... 53 hits
 *     igitebo ...........  (bag, not a search term — excluded)
 *
 * TWO TERMS FROM THE BRIEF WERE DROPPED.
 *
 * "sunscreen" — the brief lists it, and it does return 3 hits, but I checked
 * what they are: Veet Gold Vitamin C Soap, Pure Egyptian Magic Whitening Gold
 * Soap, Purec Egyptian Gold Lotion. Not one is a sunscreen. They match only
 * because the vocabulary expands sunscreen -> "sun protection" and those
 * descriptions contain "sun". Promoting it as trending would advertise stock
 * that does not exist. Same for the brief's Kinyarwanda "cream yo kurinda
 * izuba", which returns 52 hits of ordinary body cream.
 *
 * The owner has no sunscreen and no makeup stock. That is an inventory gap,
 * not something a search chip can paper over.
 */

export interface TrendingTerm {
  /** The query actually sent to /api/products. */
  query: string
  /** Kinyarwanda label. */
  rw: string
  /** English label. */
  en: string
}

/**
 * Kept short on purpose: five chips fit one row at 360px without scrolling.
 *
 * The query is English in every case because that is what the catalogue is
 * written in; the Kinyarwanda label is what the shopper reads. Where a real
 * Kinyarwanda search term exists and works (`amavuta` = oil, 53 hits) the
 * query itself is Kinyarwanda — the search layer transliterates it.
 */
export const TRENDING_SEARCHES: readonly TrendingTerm[] = [
  // verified-rw: "Vitamin C" is a product-label term, used untranslated in
  // Kinyarwanda retail speech.
  { query: 'vitamin C', rw: 'Vitamin C', en: 'Vitamin C' },
  // verified-rw: amavuta = oil/lotion. 53 hits.
  { query: 'amavuta', rw: 'Amavuta', en: 'Body oil' },
  // verified-rw: seramu is the established loanword for serum. 4 hits.
  { query: 'seramu', rw: 'Seramu', en: 'Serum' },
  // verified-rw: ibiryo by'umusatsi = hair food. 10 hits via "hair food".
  { query: 'hair food', rw: "Ibiryo by'umusatsi", en: 'Hair food' },
  // A real brand carried in the shop. 2 hits.
  { query: 'MIADI', rw: 'MIADI', en: 'MIADI' },
] as const

/**
 * Category quick-filter chips for the overlay.
 *
 * Slugs are the live category slugs, verified against /api/categories.
 * Kinyarwanda labels are lifted from the existing `categories` translation
 * block rather than invented — the brief proposed "Imikara" for makeup, which
 * is not a word this codebase or Kinyarwanda uses; the established term is
 * "Ibikoresho byo kwisiga".
 *
 * MAKEUP IS DELIBERATELY ABSENT. All 6 makeup rows are `isDeleted: true` seed
 * data — 0 live products. The chip would open an empty shelf. /api/categories
 * already hides it, so the overlay agrees with the rest of the site.
 */
export interface CategoryChip {
  slug: string
  rw: string
  en: string
}

export const CATEGORY_CHIPS: readonly CategoryChip[] = [
  { slug: '', rw: 'Byose', en: 'All' }, // verified-rw
  { slug: 'skincare', rw: 'Kwita ku ruhu', en: 'Skin' }, // verified-rw
  { slug: 'body-care', rw: 'Kwita ku mubiri', en: 'Body' }, // verified-rw
  { slug: 'haircare', rw: 'Kwita ku musatsi', en: 'Hair' }, // verified-rw
  { slug: 'fragrance', rw: 'Imibavu', en: 'Fragrance' }, // verified-rw
] as const
