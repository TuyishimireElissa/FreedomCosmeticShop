import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Phase 5 — what a shopper sees when a category has nothing on the shelf.
 *
 * Before this, tapping Isabune from the menu rendered "No products match your
 * filters / Try removing a filter or using a broader search." The shopper had
 * applied no filter. It read as though they had made a mistake.
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const rawPanel = read('src/components/products/CategoryComingSoon.tsx')
// The file documents its own reasoning; comments must not satisfy code checks.
const panel = rawPanel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const grid = read('src/components/products/ProductGrid.tsx')
const client = read('src/components/products/ProductsPageClient.tsx')
const api = read('src/app/api/categories/route.ts')

describe('an empty category is not treated as a failed filter', () => {
  it('renders the panel before the generic empty state', () => {
    const gridEmpty = grid.slice(grid.indexOf('if (products.length === 0) {'))
    const comingSoonAt = gridEmpty.indexOf('<CategoryComingSoon')
    const genericAt = gridEmpty.indexOf("t('search.no_filter_results')")
    expect(comingSoonAt).toBeGreaterThan(-1)
    expect(genericAt).toBeGreaterThan(-1)
    expect(comingSoonAt, 'Coming Soon must be checked first').toBeLessThan(genericAt)
  })

  it('keeps the generic empty state for real filter misses', () => {
    expect(grid).toContain("t('search.no_filter_results')")
    expect(grid).toContain('DidYouMean')
  })
})

describe('the panel only appears when the shopper did nothing wrong', () => {
  const condition = client.slice(
    client.indexOf('const comingSoonCategory = (() => {'),
    client.indexOf('const breadcrumbItems'),
  )

  it('found the condition block', () => {
    expect(condition.length).toBeGreaterThan(200)
  })

  it('requires a recognised category', () => {
    expect(condition).toContain('if (!filters.category || !selectedCategory) return null')
  })

  it('bails out when a search term is present', () => {
    expect(condition).toContain('if (filters.search) return null')
  })

  it('bails out when another filter is narrowing the list', () => {
    // The category itself counts as one active filter, so >1 means extra ones.
    expect(condition).toContain('if (activeFilterCount > 1) return null')
  })

  it('bails out when the category actually has stock', () => {
    expect(condition).toContain("(selectedCategory._count?.products ?? 0) > 0")
  })
})

describe('sold out and never stocked are different messages', () => {
  it('the API reports a stock-independent total', () => {
    expect(api).toContain('totalProducts')
    expect(api).toContain('groupBy')
  })

  it('keeps the stock filter on _count so the Vuba badge stays honest', () => {
    // Counted, not sampled: the parent row and the children row each carry a
    // _count, so asserting one filtered occurrence let a mutation unfilter the
    // other. An unfiltered _count would make a sold-out category look stocked.
    const filtered = api.match(/_count: \{ select: \{ products: \{ where: liveProducts \} \} \}/g) || []
    expect(filtered.length, 'both parent and children counts stay stock-filtered').toBe(2)
    expect(api).not.toMatch(/_count: \{ select: \{ products: true \} \}/)
  })

  it('the caller derives soldOut from that total', () => {
    expect(client).toContain('totalProducts')
    expect(client).toContain('soldOut: everStocked > 0')
  })

  it('the panel says different things for each case', () => {
    expect(panel).toContain('soldOut')
    // Kinyarwanda reuses the phrase this shop already ships for sold out.
    expect(rawPanel).toContain('Byashize')
    expect(rawPanel).toContain('Biraza vuba')
    expect(panel).toContain('Out of stock right now')
    expect(panel).toContain('Coming soon')
  })

  it('never claims a launch date', () => {
    // Comment-stripped: the file records the date the counts were measured,
    // which no customer ever sees. Only shipped strings are checked.
    expect(panel).not.toMatch(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/)
    expect(panel).not.toMatch(/\b20\d{2}\b/)
    expect(panel).not.toMatch(/next (week|month)|kwezi gutaha|icyumweru gitaha/i)
  })

  it('offers no notification sign-up while SMS and email are off', () => {
    expect(panel).not.toMatch(/notify|Notify|subscribe|Subscribe|email/i)
  })
})

describe('the panel is bilingual and reachable', () => {
  it('marks every Kinyarwanda string as reviewed', () => {
    // Counted, not sampled: there are four markers, so a >= 3 floor let a
    // mutation strip one and still pass. Every one must be present.
    const rwMarkers = rawPanel.match(/\/\/ verified-rw/g) || []
    expect(rwMarkers.length, 'all four verified-rw markers').toBe(4)
    // Each Kinyarwanda string must be in the SHIPPED code, not merely quoted
    // in a comment explaining it — `panel` is comment-stripped. Asserting on
    // rawPanel let a mutation delete the real string while its comment kept
    // the test green.
    for (const phrase of ['Biraza vuba', 'Byashize', 'Duhamagare tuvuge iki cyiciro', 'Reba ibicuruzwa byose']) {
      expect(panel, `"${phrase}" must ship in code, not just a comment`).toContain(phrase)
    }
  })

  it('switches on the active language rather than hard-coding English', () => {
    expect(panel).toContain('useLanguage')
    expect(panel).toContain("language === 'rw'")
  })

  it('offers WhatsApp with the category name in the message', () => {
    expect(panel).toContain('getWhatsAppLink')
    expect(panel).toContain('${categoryName}')
    expect(rawPanel).toContain('Duhamagare tuvuge iki cyiciro')
  })

  it('hides the WhatsApp button rather than rendering a dead link', () => {
    // getWhatsAppLink returns '#owner-must-add-whatsapp-before-launch' when unset.
    expect(panel).toContain("waHref.startsWith('https://')")
    expect(panel).toContain('waConfigured ?')
    // The guard must actually depend on the URL. `true ||` short-circuits it
    // to always-render, which the two checks above happily allowed.
    expect(panel).toMatch(/const waConfigured = waHref\.startsWith\('https:\/\/'\)/)
    expect(panel).not.toMatch(/waConfigured\s*=\s*(true|false)\b/)
  })

  it('always offers a way back to the full catalogue', () => {
    expect(panel).toContain('href="/products"')
  })
})

describe('the panel obeys the design rules', () => {
  it('uses fcs tokens and no raw hex', () => {
    expect(panel).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(panel).toContain('fcs-')
  })

  it('never uses the rejected brand colour', () => {
    expect(rawPanel).not.toContain('C77B85')
  })

  it('keeps tap targets at 44px and up', () => {
    const targets = panel.match(/min-h-11/g) || []
    expect(targets.length, 'both CTAs need a 44px minimum').toBeGreaterThanOrEqual(2)
  })

  it('stacks the buttons on a narrow screen', () => {
    expect(panel).toContain('flex-col')
    expect(panel).toContain('sm:flex-row')
  })
})
