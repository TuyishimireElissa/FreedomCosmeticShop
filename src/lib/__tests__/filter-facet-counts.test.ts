/**
 * Phase 3: filter counts, and hiding filters that cannot lead anywhere.
 *
 * WHAT THE BRIEF ASKED FOR VS WHAT WAS ACTUALLY WRONG
 *
 * The brief's Phase 3 asks to "create <SearchFilters />" with a bottom sheet,
 * accordions, URL params and shareable filtered URLs. All of that already
 * existed and was deployed: MobileFilters is a Sheet at max-h-[90vh] with a
 * drag handle, FilterSidebar is the desktop column, FilterChips shows the
 * active set, and useProductFilters syncs every filter to the URL with
 * back-button support. Owner decision on 2026-08-13: leave it alone.
 *
 * TWO REAL DEFECTS WERE FOUND INSTEAD, both measured live:
 *
 * 1. /api/search/facets — built in Phase 1 — was consumed by NOTHING. Every
 *    filter listed values with no counts, so a shopper could not tell
 *    "Skincare (23)" from an option that would empty the page.
 *
 * 2. TWENTY CONTROLS WERE DEAD ENDS. Probed against live production:
 *
 *        hairType=NATURAL/RELAXED/WAVY/CURLY/COILY/ALL_HAIR  ->  0 each
 *        minRating=2 / 3 / 4                                 ->  0 each
 *        shade=Deep / Medium                                 ->  0
 *
 *    Ten controls on the sidebar and the same ten in the mobile sheet. Every
 *    one returned zero products because the backing columns are empty across
 *    all 106 live products. A filter that always empties the page is not a
 *    filter, it is a trap — the shopper concludes the shop has no stock.
 *
 * Controls that DO work were confirmed at the same time, so this is not a
 * blanket claim: skinType OILY 20, DRY 21, COMBINATION 21, SENSITIVE 20,
 * ALL 19; categories body-care 44, fragrance 33, skincare 23, haircare 5,
 * mens-grooming 1.
 *
 * NOTHING IS HARDCODED OFF. Visibility is derived from counts the API
 * reports, so the day the owner adds a review the rating filter returns by
 * itself.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isFacetDiscriminating, isFacetUsable } from '@/hooks/use-facets'

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

const hook = code('src/hooks/use-facets.ts')
const sidebar = code('src/components/products/FilterSidebar.tsx')
const sheet = code('src/components/products/MobileFilters.tsx')
const chips = code('src/components/products/FilterChips.tsx')
const facetsRoute = code('src/app/api/search/facets/route.ts')

describe('the facets endpoint is actually consumed now', () => {
  it('the hook calls it', () => {
    expect(hook).toContain('/api/search/facets')
  })

  it.each([
    ['desktop sidebar', 'src/components/products/FilterSidebar.tsx'],
    ['mobile sheet', 'src/components/products/MobileFilters.tsx'],
    ['active filter chips', 'src/components/products/FilterChips.tsx'],
  ])('%s reads live counts', (_label, path) => {
    expect(code(path)).toContain('useFacets()')
  })

  it('counts follow the active query, not a fixed list', () => {
    expect(hook).toContain('buildApiQuery()')
    expect(hook).toContain('`/api/search/facets?${query}`')
  })

  it('aborts the previous request when filters change', () => {
    expect(hook).toContain('AbortController')
    expect(hook).toContain('abortRef.current?.abort()')
  })

  it('keeps the filters working when the count request fails', () => {
    // Counts are an enhancement. A failed fetch must not blank the sidebar.
    expect(hook).toContain('setData(EMPTY)')
    expect(hook).toMatch(/catch\(\(error\)/)
  })
})

describe('a filter that cannot lead anywhere is not rendered', () => {
  it('needs at least one non-zero option to be usable', () => {
    expect(isFacetUsable([])).toBe(false)
    expect(isFacetUsable([{ name: 'CURLY', count: 0 }])).toBe(false)
    expect(isFacetUsable([{ name: 'CURLY', count: 0 }, { name: 'COILY', count: 3 }])).toBe(true)
  })

  it('needs at least two options to be worth showing', () => {
    // One option cannot narrow anything: picking it is the same as picking
    // "everything you can already see".
    expect(isFacetDiscriminating([{ name: 'Freedom Glow', count: 2 }])).toBe(false)
    expect(isFacetDiscriminating([{ name: 'A', count: 2 }, { name: 'B', count: 5 }])).toBe(true)
    expect(isFacetDiscriminating([{ name: 'A', count: 2 }, { name: 'B', count: 0 }])).toBe(false)
  })

  it.each([
    ['hair type', 'showHairType'],
    ['rating', 'showRating'],
    ['shade', 'showShade'],
    ['brand', 'showBrand'],
  ])('%s visibility is derived from live data, never hardcoded', (_label, flag) => {
    // The whole point: `showRating: false` would be a lie that never
    // self-corrects. It must read a count.
    expect(hook).not.toMatch(new RegExp(`${flag}:\\s*(false|true)\\s*,`))
    expect(hook).toMatch(new RegExp(`${flag}:\\s*!loading &&`))
  })

  it.each([
    ['desktop sidebar', 'src/components/products/FilterSidebar.tsx'],
    ['mobile sheet', 'src/components/products/MobileFilters.tsx'],
  ])('%s gates all four filters', (_label, path) => {
    const source = code(path)
    for (const flag of ['showHairType', 'showRating', 'showShade', 'showBrand']) {
      expect(source, `${path} does not gate ${flag}`).toContain(`{${flag} &&`)
    }
  })

  it('waits for the first response before showing anything', () => {
    // Without !loading the controls would flash in then vanish.
    const flags = hook.match(/show(Rating|HairType|Shade|Brand): !loading/g) || []
    expect(flags.length).toBe(4)
  })
})

describe('the endpoint reports the data those gates need', () => {
  it('returns hair types, rated count and shaded count', () => {
    for (const field of ['hairTypes', 'ratedCount', 'shadedCount']) {
      expect(facetsRoute, `facets missing ${field}`).toContain(field)
    }
  })

  it('derives ratedCount from a real query, not a literal', () => {
    // Mutation testing caught this: asserting the WORD "ratedCount" appears
    // still passed when the value was replaced with a hardcoded 99, because
    // the key survives in the payload. Assert the query that produces it.
    expect(facetsRoute).toMatch(/reviewsCount:\s*\{\s*gt:\s*0\s*\}/)
    expect(facetsRoute).not.toMatch(/ratedCount:\s*\d+/)
  })

  it('does not count an empty JSON array as a real shade', () => {
    // `shades` stores the STRING "[]" on 105 products. A plain
    // `{ not: null }` reported shadedCount 105 and would have rendered a
    // shade box that returns nothing for every input. My first version did
    // exactly that.
    //
    // BOTH occurrences must be guarded — `shade` and `shades`. Asserting a
    // single toContain passed when only one of the two was mutated, which
    // mutation testing exposed.
    const guards = facetsRoute.match(/notIn: \['', '\[\]'\]/g) || []
    expect(guards.length, 'shade and shades must both exclude empty arrays').toBe(2)
  })

  it('gates the shade box on more than a single tagged product', () => {
    // The one product that qualifies is a fragrance mist whose "shade" reads
    // "Pink packaging / fragrance mist" — not a makeup shade.
    expect(hook).toContain('data.shadedCount >= 2')
  })

  it('counts only products that pass the other active filters', () => {
    expect(facetsRoute).toContain('buildFilterClauses(filters)')
  })

  it('counts skin types the same way the filter selects them', () => {
    // THE COUNT MUST MIRROR THE FILTER. buildFilterClauses matches
    // `skinType CONTAINS X OR CONTAINS 'ALL'`, because a product tagged ALL
    // suits every skin type. Counting each JSON value in isolation reported
    // OILY = 1 while /api/products?skinType=OILY returned 20.
    //
    // I caught this by diffing facet counts against grid totals before
    // shipping — every category matched, every skin type did not. Verified
    // after the fix: OILY 20/20, DRY 21/21, COMBINATION 21/21,
    // SENSITIVE 20/20, NORMAL 21/21, ALL 19/19.
    expect(facetsRoute).toContain("tags.has(ALL_SKIN)")
    expect(facetsRoute).toContain('for (const type of specificTypes)')
    // And the filter side must still be the OR it is being mirrored against.
    expect(code('src/lib/product-filters.ts')).toMatch(
      /and\.push\(\{\s*OR:\s*\[\{\s*skinType:[\s\S]{0,120}?contains:\s*'ALL'/,
    )
  })
})

describe('counts are shown next to the options', () => {
  it.each([
    ['desktop sidebar', 'src/components/products/FilterSidebar.tsx'],
    ['mobile sheet', 'src/components/products/MobileFilters.tsx'],
  ])('%s passes a count to category and skin type', (_label, path) => {
    const source = code(path)
    expect(source).toContain('countFor.category(')
    expect(source).toContain('countFor.skinType(')
  })

  it('renders a zero option disabled rather than removing it', () => {
    // An option disappearing mid-interaction is more disorienting than a
    // greyed-out one.
    //
    // Counted, not merely present: the sidebar has two option components
    // (FilterButton) and the sheet has four (ChoiceRow + Pill, each with a
    // disabled and an aria-disabled). A single toContain passed when one of
    // them was reverted, because a sibling still matched.
    const sidebarGuards = sidebar.match(/disabled=\{empty && !selected\}/g) || []
    expect(sidebarGuards.length, 'FilterButton lost its disabled guard').toBe(2)
    const sheetGuards = sheet.match(/disabled=\{empty && !selected\}/g) || []
    expect(sheetGuards.length, 'ChoiceRow or Pill lost its disabled guard').toBe(4)
  })

  it('distinguishes "no results" from "not loaded yet"', () => {
    // undefined must not render as 0.
    expect(sidebar).toContain('const empty = count === 0')
    expect(sidebar).toContain('count !== undefined &&')
    expect(sheet).toContain('count !== undefined &&')
  })

  it('keeps a selected option clickable so it can be cleared', () => {
    // Disabling the active filter would strand the shopper on an empty page.
    expect(sidebar).toContain('empty && !selected')
    expect(sheet).toContain('empty && !selected')
  })
})

describe('the mobile Apply button tells the truth', () => {
  it('previews the count for the PENDING selection, not the applied one', () => {
    // The sheet edits a local copy. facets.total still describes the previous
    // query, so labelling the button "Apply (44)" while the pending selection
    // yields 3 would be worse than showing nothing.
    expect(sheet).toContain('previewCount')
    expect(sheet).toContain('localFilters')
    expect(sheet).toContain("params.set('limit', '1')")
  })

  it('debounces and aborts the preview probe', () => {
    expect(sheet).toContain('previewAbort')
    expect(sheet).toMatch(/setTimeout\([\s\S]{0,600}?\}, 250\)/)
  })

  it('refuses to apply a selection that would empty the page', () => {
    expect(sheet).toContain('disabled={previewCount === 0}')
    expect(sheet).toContain("t('search.no_filter_results')")
  })

  it('omits the number rather than guessing when the probe fails', () => {
    expect(sheet).toContain('previewCount !== null ?')
  })
})

describe('active filter chips read like language', () => {
  it('shows the display name, not the URL slug', () => {
    // Chips said "Category: body-care". They now say "Category: Body Care".
    expect(chips).toContain('displayName(facets.categories, filters.category)')
    expect(chips).toContain('displayName(facets.brands, filters.brand)')
  })

  it('falls back to the slug rather than rendering blank', () => {
    expect(chips).toMatch(/\?\.name \|\| slug/)
  })
})

describe('nothing from earlier phases regressed', () => {
  it('the URL is still the source of truth', () => {
    const filterHook = code('src/hooks/useProductFilters.ts')
    expect(filterHook).toContain('useSearchParams')
    expect(filterHook).toContain('updateProductFilterParams')
  })

  it('the mobile sheet is still a bottom sheet with a drag handle', () => {
    expect(sheet).toContain('side="bottom"')
    expect(sheet).toContain('onTouchEnd')
  })

  it('still offers no colour filter', () => {
    for (const source of [sidebar, sheet, hook]) {
      expect(source).not.toMatch(/\bcolou?r(Id|s)?\s*[:=]/i)
    }
  })

  it('adds no raw hex to the filter surfaces', () => {
    // The sidebar predates the token system and still carries #EEEEEE, so
    // this only guards what Phase 3 touched.
    expect(hook).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })
})
