import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Phase 4 — "People also searched for" chips.
 *
 * The hard part is not rendering chips, it is refusing to render them. The
 * analytics table currently holds 13 terms and most of those counts are my own
 * verification traffic from building the endpoint. Showing them would present
 * test noise to customers as real behaviour.
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const rawComponent = read('src/components/products/RelatedSearches.tsx')
// The file documents its own reasoning; strip comments so prose can never
// satisfy an assertion about shipped code.
const component = rawComponent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const client = read('src/components/products/ProductsPageClient.tsx')
const rw = read('src/lib/i18n/translations/rw.ts')
const en = read('src/lib/i18n/translations/en.ts')

function threshold(name: string): number {
  // Read from source: importing a .tsx into a .ts test runs it through Vite's
  // JSX transform and fails to parse.
  const found = component.match(new RegExp(`${name} = (\\d+)`))
  expect(found, `${name} must be declared`).not.toBeNull()
  return Number(found![1])
}

describe('it refuses to show test noise as customer behaviour', () => {
  it('requires real repeat traffic before a term appears', () => {
    expect(threshold('MIN_SEARCHES')).toBeGreaterThanOrEqual(3)
    expect(component).toContain('row.searches >= MIN_SEARCHES')
  })

  it('hides the whole section below a useful number of chips', () => {
    expect(threshold('MIN_TERMS')).toBeGreaterThanOrEqual(3)
    expect(component).toContain('terms.length < MIN_TERMS')
    expect(component).toContain('return null')
  })

  it('never suggests a search that leads to an empty grid', () => {
    // A dead-end suggestion wastes a tap on a 3G connection.
    expect(component).toContain('row.searches > row.zeroResultSearches')
  })

  it('never suggests the search already on screen', () => {
    expect(component).toContain('row.term.toLowerCase() !== normalisedQuery')
  })

  it('caps the list so it cannot run past two rows at 360px', () => {
    expect(threshold('MAX_TERMS')).toBeLessThanOrEqual(8)
    expect(component).toContain('slice(0, MAX_TERMS)')
  })
})

describe('the live endpoint supports these rules', () => {
  // Rule 21: assert on the real HTTP response, not a mock. A mocked fetch
  // would prove only that the component calls it.
  const ENDPOINT = 'https://freedomcosmeticshop.com/api/search/popular'

  it('returns rows carrying the fields the filters depend on', async () => {
    const response = await fetch(ENDPOINT, { cache: 'no-store' })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body.data)).toBe(true)
    for (const row of body.data) {
      expect(typeof row.term).toBe('string')
      expect(typeof row.searches).toBe('number')
      expect(typeof row.zeroResultSearches).toBe('number')
    }
  }, 20000)

  it('still stores no raw query text', async () => {
    // The privacy model must survive this feature: chips come from a
    // controlled vocabulary, never from what a customer typed.
    const response = await fetch(ENDPOINT, { cache: 'no-store' })
    const body = await response.json()
    expect(body.methodology?.rawQueriesStored).toBe(false)
    expect(body.methodology?.controlledVocabularyConfigured).toBe(true)
  }, 20000)
})

describe('it is wired in without disturbing the page', () => {
  it('renders only under a search that produced results', () => {
    expect(client).toContain('{filters.search && products.length > 0 && (')
    expect(client).toContain('<RelatedSearches')
  })

  it('runs a new search when a chip is tapped', () => {
    expect(client).toContain("onSelect={(term) => setFilter('search', term)}")
  })

  it('aborts its request when the query changes', () => {
    // Otherwise a fast typist stacks responses and the last one to land wins.
    expect(component).toContain('AbortController')
    expect(component).toContain('controller.abort()')
  })

  it('fails silently rather than breaking the results page', () => {
    expect(component).toContain('catch')
    expect(component).not.toContain('throw')
  })
})

describe('bilingual and accessible', () => {
  it('defines the heading in both languages', () => {
    expect(rw).toContain('related_title:')
    expect(en).toContain('related_title:')
    expect(en).toContain('People also searched for:')
    expect(rw).toContain('Kandi bashakisha:')
  })

  it('marks the Kinyarwanda string as reviewed', () => {
    const line = rw.split('\n').find((l) => l.trim().startsWith('related_title:'))
    expect(line).toBeDefined()
    expect(line).toContain('// verified-rw')
  })

  it('renders no hard-coded customer-facing English', () => {
    expect(component).toContain("t('search.related_title')")
  })

  it('labels the section for screen readers', () => {
    expect(component).toContain('aria-labelledby="related-searches-heading"')
    expect(component).toContain('<section')
  })

  it('keeps a 44px tap target', () => {
    expect(component).toContain('min-h-11')
  })
})

describe('design tokens', () => {
  it('uses no raw hex', () => {
    expect(component).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('never uses the rejected brand colour', () => {
    expect(rawComponent).not.toContain('C77B85')
  })

  it('uses AA-passing text and border tokens', () => {
    // fcs-brand-text is 5.49:1 on white; fcs-brand-strong hover is 4.74:1.
    expect(component).toContain('text-fcs-brand-text')
    expect(component).toContain('border-fcs-brand-text')
    expect(component).toContain('hover:bg-fcs-brand-strong')
    // fcs-brand is decorative only (3.80:1) and must never carry text.
    // `\b` treats a hyphen as a word boundary, so /text-fcs-brand\b/ also
    // matched the legitimate `text-fcs-brand-text`. Exclude a following
    // hyphen explicitly instead.
    expect(component).not.toMatch(/text-fcs-brand(?!-)/)
  })
})
