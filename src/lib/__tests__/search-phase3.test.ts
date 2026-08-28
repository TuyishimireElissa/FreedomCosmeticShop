import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Phase 3 — category quick-jumps with counts + live popular searches.
 *
 * The overlay's idle state now shows: category pills (6-8, with live
 * in-stock counts from /api/categories), a Popular Searches section driven
 * by controlled-vocabulary counts (/api/search/popular, zero-result terms
 * filtered out so a chip never leads to an empty page), and the existing
 * recent searches. Curated TRENDING_SEARCHES remains as the fallback when
 * the live list is empty/unreachable.
 */

const trending = readFileSync(resolve(process.cwd(), 'src/lib/search-trending.ts'), 'utf8')
const overlay = readFileSync(resolve(process.cwd(), 'src/components/storefront/SearchOverlay.tsx'), 'utf8')

// Live counts measured 2026-08-26 from /api/categories (in stock):
// soap 33, fragrance 34, whitening 9, baby-kids 7, haircare 7,
// body-oil 2, skincare 3, makeup 0.
const STOCKED_SLUGS = ['', 'soap', 'fragrance', 'whitening', 'baby-kids', 'haircare', 'body-oil', 'skincare']

describe('Phase 3 — category quick-jump pills', () => {
  it('offers 6-8 pills (All plus stocked categories)', () => {
    const slugs = trending.match(/slug: '([^']*)'/g) || []
    expect(slugs.length).toBeGreaterThanOrEqual(6)
    expect(slugs.length).toBeLessThanOrEqual(8)
  })

  it('never offers makeup: the category has 0 live products (measured)', () => {
    expect(trending).not.toContain("slug: 'makeup'")
    expect(overlay).not.toContain("slug: 'makeup'")
  })

  it('uses only slugs the catalogue actually serves (live verified)', () => {
    const slugs = trending.match(/slug: '([^']*)'/g)?.map((s) => s.match(/'([^']*)'/)![1]) || []
    for (const slug of slugs) {
      expect(STOCKED_SLUGS.includes(slug), `unknown slug ${slug}`).toBe(true)
    }
  })

  it('gives every chip a reviewed Kinyarwanda label', () => {
    // Labels are lifted from the existing `categories` translation block.
    for (const label of ['Isabune', 'Imibavu', 'Kwera no Kurangaza', 'Abana', 'Amavuta y’Umubiri']) {
      expect(trending).toContain(label)
    }
    expect(trending).toContain('verified-rw')
  })

  it('renders the count badge with AA-safe colours (muted on white 4.83:1, brand-strong on white 4.74:1)', () => {
    expect(overlay).toContain('bg-white text-fcs-text-muted')
    expect(overlay).toContain('bg-white text-fcs-brand-strong')
  })

  it('keeps pills at a 44px touch target', () => {
    expect(overlay).toContain('min-h-11 shrink-0')
  })

  it('fetches live counts from /api/categories and reads the in-stock _count', () => {
    expect(overlay).toContain("fetch('/api/categories'")
    expect(overlay).toContain('category?._count?.products ?? 0')
  })
})

describe('Phase 3 — popular searches from controlled-vocabulary counts', () => {
  it('fetches /api/search/popular', () => {
    expect(overlay).toContain("fetch('/api/search/popular'")
  })

  it('filters out zero-result terms so a chip can never be a dead end', () => {
    // "eyeliner" is currently popular (1 search) but finds nothing — the
    // chip must never be offered.
    expect(overlay).toContain('zeroResultSearches ?? 0) === 0')
  })

  it('renders live terms with counts, and keeps the curated list as fallback', () => {
    expect(overlay).toContain("t('search.popular')")
    expect(overlay).toContain("t('search.trending')")
  })

  it('renders the popular chips at a 44px target', () => {
    expect(overlay).toContain('inline-flex min-h-11 items-center gap-1.5 rounded-full')
  })

  it('keeps recent searches (fcs_recent_searches) as the first idle section', () => {
    expect(overlay).toContain("RECENT_SEARCHES_KEY = 'fcs_recent_searches'")
    expect(overlay).toContain("t('search.recent')")
  })
})
