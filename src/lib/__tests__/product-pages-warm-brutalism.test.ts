/**
 * Warm Brutalism — Phase 3 product list and detail.
 *
 * Most of the brief was already implemented to a higher standard than the
 * spec described, so this phase is deliberately small: two real gaps closed,
 * and tests pinning the four capabilities the brief would have had me rebuild.
 *
 * The important assertion here is the negative one: infinite scroll must NOT
 * be introduced. Auto-loading on scroll would silently spend a shopper's data
 * bundle and directly contradicts low-data mode, which drops the page size to
 * 8 and is covered by six existing test files.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

const chips = read('src/components/products/FilterChips.tsx')
const rail = read('src/components/products/RoutineRail.tsx')
const detail = read('src/components/products/ProductDetailClient.tsx')
const gallery = read('src/components/products/ProductImageGallery.tsx')
const listing = read('src/components/products/ProductsPageClient.tsx')
const tabs = read('src/components/products/ProductTabs.tsx')

describe('filter chips stay visible while scrolling results', () => {
  it('is sticky beneath the header at both breakpoints', () => {
    // Header is h-14 on phones, h-16 from md.
    expect(chips).toContain('sticky top-14')
    expect(chips).toContain('md:top-16')
  })

  it('sits below the header in the stacking order', () => {
    // Header is z-50; chips must not cover it.
    expect(chips).toContain('z-30')
  })

  it('scrolls horizontally rather than wrapping the grid down the page', () => {
    expect(chips).toContain('overflow-x-auto')
    expect(chips).toContain('flex-none snap-start')
  })

  it('uses tokens rather than the old rose literals', () => {
    expect(chips).toContain('fcs-surface-muted')
    expect(chips).not.toContain('bg-rose-50')
  })

  it('still renders nothing when no filter is active', () => {
    expect(chips).toContain('if (activeFilterCount === 0) return null')
  })
})

describe('related products rail', () => {
  it('replaced the stacked grid on the detail page', () => {
    expect(detail).toContain('<RoutineRail products={related || []} />')
    expect(detail).not.toContain('<ProductGrid products={related')
  })

  it('bleeds to the viewport edge so the next card is visibly clipped', () => {
    expect(rail).toContain('-mx-4')
    expect(rail).toContain('snap-x snap-mandatory')
  })

  it('becomes a normal grid on desktop', () => {
    expect(rail).toContain('md:grid md:grid-cols-3')
    expect(rail).toContain('md:overflow-visible')
  })

  it('claims relation, not a curated regimen', () => {
    // brandId is set on 2 of 101 products and howToUse on 0, so the system
    // cannot know what is used together or in what order.
    expect(rail).toContain("t('product.related')")
    expect(rail).not.toMatch(/step 1|Step 1|morning|evening/i)
  })

  it('hides when there is nothing related', () => {
    expect(rail).toContain('products.length === 0) return null')
  })

  it('reuses ProductCard instead of forking cart behaviour', () => {
    expect(rail).toContain("from '@/components/storefront/ProductCard'")
  })
})

describe('capabilities the brief would have rebuilt already exist', () => {
  it('gallery supports touch swipe', () => {
    expect(gallery).toContain('onTouchStart')
    expect(gallery).toContain('onTouchEnd')
    // A 50px threshold so a tap-to-zoom is not read as a swipe.
    expect(gallery).toContain('Math.abs(difference) > 50')
  })

  it('detail page has a mobile sticky buy bar with a quantity stepper', () => {
    expect(detail).toContain('showStickyBuy')
    expect(detail).toContain('env(safe-area-inset-bottom)')
    expect(detail).toContain('increase_quantity')
    expect(detail).toContain('decrease_quantity')
  })

  it('add-to-cart confirms in place', () => {
    const card = read('src/components/storefront/ProductCard.tsx')
    expect(card).toContain('setAdded(true)')
    expect(card).toContain("t('product.added')")
  })

  it('detail sections hide themselves when the field is empty', () => {
    // howToUse is 0/101 and ingredients 1/101, so most products would
    // otherwise render empty accordions.
    expect(tabs).toContain('available.push')
    expect(tabs).toContain('hasText(howToUse)')
    expect(tabs).toContain('ingredients.length')
  })
})

describe('listing keeps explicit load-more, not infinite scroll', () => {
  it('never auto-loads pages on scroll', () => {
    // Auto-loading spends a data bundle the shopper did not agree to spend.
    expect(listing).not.toContain('IntersectionObserver')
    expect(listing).toContain("setFilter('page', String(page + 1))")
  })

  it('honours low-data page sizes', () => {
    expect(listing).toContain('const LOW_DATA_PAGE_SIZE = 8')
    expect(listing).toContain('const pageSize = isLowData ? LOW_DATA_PAGE_SIZE : NORMAL_PAGE_SIZE')
  })

  it('is 2-up on phones and 4-up on large screens', () => {
    const grid = read('src/components/products/ProductGrid.tsx')
    expect(grid).toContain('grid-cols-2')
    expect(grid).toContain('lg:grid-cols-4')
  })
})
