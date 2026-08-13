/**
 * Phase 5: "More like this", "Did you mean", and the two items that were
 * already built or would have been duplicates.
 *
 * WHAT WAS ACTUALLY MISSING
 *
 *   5.1 Find Similar — /api/products/similar was built in Phase 1 and then
 *       consumed by NOTHING. The detail page had a rail, but it was fed by
 *       /api/products/[slug]'s `related`, which is just "same category,
 *       featured first". Now wired to the scored endpoint.
 *
 *   5.2 Did You Mean — existed inside the search overlay only. /products
 *       showed "no products match your filters" with no correction at all.
 *
 *   5.3 Customers Also Viewed — NOT BUILT, deliberately. The brief defines it
 *       as "same category + price within +/-30%", which is exactly what
 *       scoreSimilarity already computes (+100 category, up to +20 for price
 *       within 30%). A second rail on the same page, fed by the same inputs,
 *       would list the same four products twice. There is no view-tracking
 *       data to make it genuinely different — SearchLog records queries, not
 *       product views.
 *
 *   5.4 SearchLog — already existed with HMAC-hashed queries. No work.
 *
 * THE CORRECTION HELPER NEVER GUESSES. Measured live before building it:
 * `sunscrin` already returns 3 products, `moisturiser` 49, `vitanin` 26 —
 * the vocabulary resolves all three upstream, so there is nothing to correct
 * and no suggestion is offered. Only a query that genuinely finds nothing
 * (`shampo`, 0 hits) gets one.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CORRECTION_THRESHOLD, isKnownTerm, suggestCorrection } from '@/lib/search-correction'
import { jaroWinkler } from '@/lib/search-vocabulary'

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

const detail = code('src/components/products/ProductDetailClient.tsx')
const grid = code('src/components/products/ProductGrid.tsx')
const didYouMean = code('src/components/products/DidYouMean.tsx')
const pageClient = code('src/components/products/ProductsPageClient.tsx')

describe('the detail page uses scored similarity, not just category order', () => {
  it('calls the similarity endpoint', () => {
    expect(detail).toContain('/api/products/similar?id=')
  })

  it('keeps the server list as a fallback so the rail is never blank', () => {
    // If the request fails or returns nothing, the shopper still sees the
    // `related` products that arrived with the page.
    expect(detail).toContain('similar.length > 0 ? similar : (related || [])')
  })

  it('calls its hooks before the early returns', () => {
    // I first placed useState/useEffect after `if (loading) return`, which
    // changes the hook count between renders. eslint's
    // react-hooks/rules-of-hooks caught it — a real bug, not lint noise.
    const hookIndex = detail.indexOf('const [similar, setSimilar]')
    const earlyReturn = detail.indexOf('if (loading) return <DetailSkeleton />')
    expect(hookIndex, 'similar state not found').toBeGreaterThan(-1)
    expect(earlyReturn, 'early return not found').toBeGreaterThan(-1)
    expect(hookIndex).toBeLessThan(earlyReturn)
  })

  it('aborts in flight when the product changes', () => {
    expect(detail).toContain('controller.abort()')
    expect(detail).toContain('setSimilar([])')
  })

  it('does not add a second, duplicate rail', () => {
    // "Customers also viewed" as specified is same-category + similar price,
    // which is what the similarity rail already shows.
    expect(detail).not.toMatch(/also_viewed|alsoViewed|AlsoViewed/)
    const rails = detail.match(/<RoutineRail/g) || []
    expect(rails.length).toBe(1)
  })
})

describe('the correction helper stays quiet unless it can help', () => {
  it('corrects a real typo', () => {
    expect(suggestCorrection('shampo')).toBe('shampoo')
    expect(suggestCorrection('serrum')).toBe('serum')
    expect(suggestCorrection('lipstik')).toBe('lipstick')
  })

  it('translates a Kinyarwanda term to what the catalogue is written in', () => {
    expect(suggestCorrection('seramu')).toBe('serum')
    expect(suggestCorrection('kuremu')).toBe('cream')
  })

  it('says nothing about a correctly spelled word', () => {
    // MY FIRST VERSION FAILED THIS. It returned the first differing expansion,
    // which produced `vitamin -> brightening` and `serum -> treatment`.
    // Those are synonyms, not corrections, and offering them looks broken.
    for (const term of ['vitamin', 'serum', 'cream', 'shampoo', 'lotion']) {
      expect(suggestCorrection(term), `invented a correction for ${term}`).toBeNull()
    }
  })

  it('says nothing about a word the vocabulary already handles', () => {
    // sunscrin/moisturiser/vitanin are keys or near-keys that already return
    // products live (3, 49 and 26 hits). Correcting them would be noise.
    expect(isKnownTerm('sunscrin')).toBe(true)
    expect(isKnownTerm('moisturiser')).toBe(true)
    expect(suggestCorrection('sunscrin')).toBeNull()
    expect(suggestCorrection('moisturiser')).toBeNull()
  })

  it('says nothing about gibberish', () => {
    for (const term of ['xyzfake', 'zzzzzz', 'qqqqqqq']) {
      expect(suggestCorrection(term), `guessed at ${term}`).toBeNull()
    }
  })

  it('ignores tokens too short to judge', () => {
    for (const term of ['ab', 'abc', '']) {
      expect(suggestCorrection(term)).toBeNull()
    }
    // Those three are null either way, so they do not prove the guard works.
    // Mutation testing exposed that: dropping MIN_LENGTH still passed.
    // "gel" is the case that discriminates — at 3 characters it scores 0.867
    // against "gentle", above the threshold, so without the minimum length a
    // shopper typing "gel" would be told they meant "gentle".
    expect(jaroWinkler('gel', 'gentle')).toBeGreaterThan(CORRECTION_THRESHOLD)
    expect(suggestCorrection('gel'), 'short token slipped past MIN_LENGTH').toBeNull()
    expect(jaroWinkler('soa', 'soap')).toBeGreaterThan(CORRECTION_THRESHOLD)
    expect(suggestCorrection('soa')).toBeNull()
  })

  it('reaches canonical terms, not only vocabulary keys', () => {
    // "perfum" scores 0.822 against its best KEY (serum) — below threshold —
    // but 0.971 against the canonical term "perfume", which is a value in the
    // map rather than a key. Without searching canonical terms this returns
    // null. Mutation testing found nothing else covering that branch.
    expect(suggestCorrection('perfum')).toBe('perfume')
  })

  it('uses a threshold that sits in a real gap, not on a knife edge', () => {
    // Measured against the actual vocabulary:
    //   shampo  -> shampoo   0.971  accept
    //   serrum  -> serum     0.961  accept
    //   vitanin -> whitening 0.757  reject
    //   xyzfake -> noxzema   0.631  reject
    expect(jaroWinkler('shampo', 'shampoo')).toBeGreaterThan(CORRECTION_THRESHOLD)
    expect(jaroWinkler('serrum', 'serum')).toBeGreaterThan(CORRECTION_THRESHOLD)
    expect(jaroWinkler('vitanin', 'whitening')).toBeLessThan(CORRECTION_THRESHOLD)
    expect(jaroWinkler('xyzfake', 'noxzema')).toBeLessThan(CORRECTION_THRESHOLD)
    expect(CORRECTION_THRESHOLD).toBeGreaterThan(0.8)
    expect(CORRECTION_THRESHOLD).toBeLessThan(0.95)
  })

  it('never returns the word it was given', () => {
    for (const term of ['shampo', 'serrum', 'seramu', 'kuremu']) {
      expect(suggestCorrection(term)).not.toBe(term)
    }
  })
})

describe('the suggestion is verified before it is shown', () => {
  it('probes the corrected term for real results', () => {
    // suggestCorrection knows the vocabulary, not the stock level. Offering
    // "sunscreen" to a shop that carries none is a second empty page.
    expect(didYouMean).toContain('/api/products?q=')
    expect(didYouMean).toContain("limit=1")
    expect(didYouMean).toContain('count > 0')
  })

  it('renders nothing at all while probing', () => {
    expect(didYouMean).toContain('if (!suggestion) return null')
  })

  it('shows the real count beside the suggestion', () => {
    expect(didYouMean).toContain('{suggestion.count}')
  })

  it('aborts and resets when the query changes', () => {
    expect(didYouMean).toContain('setSuggestion(null)')
    expect(didYouMean).toContain('controller.abort()')
  })

  it('only appears on an empty result set', () => {
    const emptyBlock = grid.slice(grid.indexOf('products.length === 0'))
    expect(emptyBlock.length, 'empty-state block not found').toBeGreaterThan(200)
    expect(emptyBlock).toContain('<DidYouMean')
  })

  it('is skipped entirely when there is no search term', () => {
    // A shopper who only used filters was not misspelling anything.
    expect(grid).toContain('{searchQuery && onSearchCorrection && <DidYouMean')
  })

  it('is wired from the products page to the search filter', () => {
    expect(pageClient).toContain('searchQuery={filters.search}')
    expect(pageClient).toContain("onSearchCorrection={(term) => setFilter('search', term)}")
  })

  it('meets the 44px tap target', () => {
    expect(didYouMean).toContain('min-h-11')
  })

  it('uses fcs tokens, no raw hex', () => {
    const hex = didYouMean.match(/#[0-9a-fA-F]{6}\b/g) || []
    expect(hex, `raw hex: ${hex.join(', ')}`).toEqual([])
    expect(didYouMean).toContain('fcs-')
  })
})
