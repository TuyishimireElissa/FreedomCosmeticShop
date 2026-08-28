/**
 * An out-of-range page number returned a blank grid.
 *
 * THE BUG, reported as "product grid renders 0 products despite API returning
 * 106" and reproduced live on 2026-08-13.
 *
 * `/api/products` honoured whatever `page` it was given. Past the end of the
 * result set it returned zero rows while still reporting the true total:
 *
 *     ?pageSize=12&page=5&category=haircare
 *        ->  rows 0,  total 5,  totalPages 1
 *
 * ProductGrid then hit its `products.length === 0` branch and rendered
 * "No products match your filters" directly beneath a header reading
 * "5 products found". A blank shelf and a contradiction on the same screen.
 *
 * IT WAS NOT a data-shape mismatch, a stuck loading state, a slug bug or a
 * missing env var — the four causes the report proposed. All four were
 * checked first and ruled out: the API returns both `products` and
 * `data.products`, the component reads `result.products || result.data
 * ?.products`, `setLoading(false)` runs in `.finally()`, and every product
 * page returns 200. `/products` with no params was always correct, which is
 * why 1,659 existing tests missed this.
 *
 * HOW A SHOPPER REACHED IT. Filter state lives in the URL by design, so a
 * shared link, a bookmark or the back button can carry a deep `page` into a
 * smaller result set. The low-data toggle does it too: at pageSize 8 page 12
 * holds 8 products, but switching to pageSize 12 puts page 12 past the end of
 * 106. ProductsPageClient resets the page when `isLowData` changes mid-session
 * (lines 69-74), but that cannot help a URL opened directly at ?page=12.
 *
 * THE FIX. Clamp `page` to the last page that has rows, server-side, after
 * `total` is known. One change covers every entry point without touching the
 * component, the filter hook or the URL contract.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

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

const route = code('src/app/api/products/route.ts')

/** The exact arithmetic the route performs. */
function clamp(requestedPage: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(requestedPage, totalPages)
  return { page, totalPages, skip: (page - 1) * pageSize }
}

describe('an over-range page shows the last real page, not nothing', () => {
  it.each([
    // [requested, pageSize, total, expectedPage] — all measured live.
    [5, 12, 5, 1],     // haircare: 5 products, 1 page
    [3, 12, 4, 1],     // q=serum: 4 products, 1 page
    [12, 12, 106, 9],  // full catalogue, 9 pages
    [99, 12, 106, 9],
    [5, 12, 20, 2],    // skinType=OILY: 20 products, 2 pages
    [99, 8, 106, 14],  // low-data page size
  ])('page %i of %i-per-page over %i rows resolves to page %i', (requested, size, total, expected) => {
    expect(clamp(requested, size, total).page).toBe(expected)
  })

  it('never produces a negative skip', () => {
    // A clamp to page 0 would make skip negative and Prisma would throw.
    for (const total of [0, 1, 5, 11, 12, 13, 106]) {
      for (const requested of [1, 2, 99]) {
        expect(clamp(requested, 12, total).skip).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('leaves a genuinely empty result on page 1', () => {
    // total 0 SHOULD render the empty state. Math.ceil(0/12) is 0, which
    // would clamp the page to 0 and break the skip arithmetic — hence the
    // Math.max(1, ...) floor.
    const result = clamp(5, 12, 0)
    expect(result.page).toBe(1)
    expect(result.skip).toBe(0)
  })
})

describe('pagination that already worked is untouched', () => {
  it.each([[1, 106, 1], [2, 106, 2], [8, 106, 8], [9, 106, 9]])(
    'page %i of 106 stays page %i',
    (requested, total, expected) => {
      expect(clamp(requested, 12, total).page).toBe(expected)
    },
  )

  it('keeps every row reachable across the page range', () => {
    // Verified live after the fix: 12+12+12+12+12+12+12+12+10 = 106.
    const total = 106
    const size = 12
    let seen = 0
    for (let p = 1; p <= clamp(1, size, total).totalPages; p += 1) {
      const { skip } = clamp(p, size, total)
      seen += Math.min(size, total - skip)
    }
    expect(seen).toBe(total)
  })
})

describe('the route implements it, once, after the count', () => {
  it('clamps against the real total', () => {
    expect(route).toContain('const totalPages = Math.max(1, Math.ceil(total / pageSize))')
    expect(route).toContain('const page = Math.min(requestedPage, totalPages)')
  })

  it('validates the raw input before clamping', () => {
    // A non-integer or negative page must still be a 400, not silently
    // clamped into something valid.
    expect(route).toContain('!Number.isInteger(requestedPage) || requestedPage < 1')
    expect(route).toMatch(/status:\s*400/)
  })

  it('clamps after the count, so every slice path benefits', () => {
    // `page` feeds three separate paths: the best-selling slice, the trigram
    // relevance slice, and the plain Prisma skip. Clamping once above them
    // covers all three; clamping in one branch would leave the other two.
    const countIndex = route.indexOf('const total = await prisma.product.count')
    const clampIndex = route.indexOf('const page = Math.min(requestedPage, totalPages)')
    const firstSlice = route.indexOf('.slice((page - 1) * pageSize')
    const skipIndex = route.indexOf('skip: (page - 1) * pageSize')
    expect(countIndex, 'count not found').toBeGreaterThan(-1)
    expect(clampIndex, 'clamp not found').toBeGreaterThan(countIndex)
    expect(firstSlice, 'best-selling slice not found').toBeGreaterThan(clampIndex)
    expect(skipIndex, 'prisma skip not found').toBeGreaterThan(clampIndex)
  })

  it('reports the clamped page back to the client', () => {
    // The grid reads pagination.page to decide whether to append or replace.
    // Echoing the requested page would desync it from the rows returned.
    expect(route).toContain('const pagination = { page, pageSize, total: effectiveTotal,')
  })

  it('still reports totalPages 0 for an empty result', () => {
    // The floor of 1 is for the skip arithmetic, not for the client. A shop
    // with no matches has zero pages, and the grid should not offer page 1.
    expect(route).toContain('totalPages: effectiveTotal === 0 ? 0 : totalPages')
  })

  it('no longer trusts the raw page anywhere below the clamp', () => {
    // Slice from AFTER the clamp line, not from its start — the clamp
    // statement necessarily mentions requestedPage, so including it made this
    // assertion fail against correct code. Caught on first run.
    const anchor = 'const page = Math.min(requestedPage, totalPages)'
    const at = route.indexOf(anchor)
    expect(at, 'clamp line not found').toBeGreaterThan(-1)
    const belowClamp = route.slice(at + anchor.length)
    expect(belowClamp.length, 'slice is empty').toBeGreaterThan(400)
    expect(belowClamp, 'raw page used after clamping').not.toContain('requestedPage')
  })
})
