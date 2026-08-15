import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Phase 1 — turn a zero-result search into a WhatsApp sourcing request.
 *
 * 73 of 231 logged searches returned nothing. Each one showed "No products
 * match your filters / Try removing a filter", to a shopper who had applied no
 * filter and simply typed a product this shop does not stock yet.
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const rawRfq = read('src/components/products/SearchRfq.tsx')
// The component documents its own reasoning; strip comments so prose can never
// satisfy an assertion about shipped code.
const rfq = rawRfq.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const grid = read('src/components/products/ProductGrid.tsx')
const client = read('src/components/products/ProductsPageClient.tsx')
const rw = read('src/lib/i18n/translations/rw.ts')
const en = read('src/lib/i18n/translations/en.ts')

describe('a failed search offers to source the product', () => {
  it('renders before the generic filter empty state', () => {
    const emptyBranch = grid.slice(grid.indexOf('if (products.length === 0) {'))
    const rfqAt = emptyBranch.indexOf('<SearchRfq')
    const genericAt = emptyBranch.indexOf("t('search.no_filter_results')")
    expect(rfqAt).toBeGreaterThan(-1)
    expect(genericAt).toBeGreaterThan(-1)
    expect(rfqAt, 'RFQ must be checked before the generic message').toBeLessThan(genericAt)
  })

  it('keeps the generic empty state for real filter misses', () => {
    expect(grid).toContain("t('search.no_filter_results')")
    expect(grid).toContain('DidYouMean')
  })

  it('does not fire when a filter caused the empty result', () => {
    // Source-gated: the caller knows whether a filter is also active.
    expect(client).toContain('filters.search && activeFilterCount === 0')
    expect(client).toContain('rfqQuery={rfqQuery}')
  })

  it('does not fire when there is no search term at all', () => {
    expect(client).toMatch(/const rfqQuery = filters\.search && activeFilterCount === 0 \? filters\.search\.trim\(\) : null/)
  })
})

describe('the WhatsApp message tells the owner what to source', () => {
  it('uses the existing helper rather than a hand-built URL', () => {
    expect(rfq).toContain('getWhatsAppLink')
    expect(rfq).not.toContain('wa.me/')
    expect(rfq).not.toContain('250790215965')
  })

  it('includes the exact phrase the shopper typed', () => {
    expect(rfq).toContain('I searched for')
    expect(rfq).toContain('${trimmed}')
    expect(rfq).toContain('Do you stock this product? I would like to order.')
  })

  it('hides the button rather than rendering a dead link', () => {
    expect(rfq).toMatch(/const waConfigured = waHref\.startsWith\('https:\/\/'\)/)
    expect(rfq).not.toMatch(/waConfigured\s*=\s*(true|false)\b/)
    expect(rfq).toContain('waConfigured ?')
  })

  it('always offers a way back to the catalogue', () => {
    expect(rfq).toContain('href="/products"')
  })
})

describe('bilingual through the existing i18n system', () => {
  it('renders no hard-coded customer-facing English', () => {
    expect(rfq).toContain('useLanguage')
    for (const key of ['rfq_title', 'rfq_body', 'rfq_whatsapp', 'rfq_browse']) {
      expect(rfq, `must render ${key} through t()`).toContain(`t('search.${key}'`)
    }
  })

  it('defines all four keys in both languages', () => {
    for (const key of ['rfq_title', 'rfq_body', 'rfq_whatsapp', 'rfq_browse']) {
      expect(rw, `rw.ts missing ${key}`).toContain(`${key}:`)
      expect(en, `en.ts missing ${key}`).toContain(`${key}:`)
    }
  })

  it('marks every new Kinyarwanda string as reviewed', () => {
    // Per line, not per block: a fixed +120 slice ran past rfq_browse into the
    // next key and counted its marker too, so the assertion was measuring the
    // wrong thing. Each key is now checked on its own line.
    for (const key of ['rfq_title', 'rfq_body', 'rfq_whatsapp', 'rfq_browse']) {
      const line = rw.split('\n').find((l) => l.trim().startsWith(`${key}:`))
      expect(line, `${key} must exist in rw.ts`).toBeDefined()
      expect(line, `${key} must carry // verified-rw`).toContain('// verified-rw')
    }
  })

  it('ships the owner-specified wording', () => {
    expect(rw).toContain('Ntabwo dubikeye ubu — ariko dushobora gufasha!')
    expect(en).toContain('We do not stock this yet — but we can help!')
  })

  it('shows the query back to the shopper via interpolation', () => {
    expect(rfq).toContain("t('search.rfq_body', { query: trimmed })")
    expect(rw).toContain('{query}')
    expect(en).toContain('{query}')
  })
})

describe('design rules', () => {
  it('uses no raw hex', () => {
    expect(rfq).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('never uses the rejected brand colour', () => {
    expect(rawRfq).not.toContain('C77B85')
  })

  it('uses the AA-passing WhatsApp token, not the 1.98:1 one', () => {
    // bg-fcs-whatsapp      #25D366 -> white 1.98:1  FAIL
    // bg-fcs-whatsapp-pill #1E874A -> white 4.55:1  PASS
    expect(rfq).toContain('bg-fcs-whatsapp-pill')
    expect(rfq).not.toMatch(/bg-fcs-whatsapp(?![-]pill)/)
  })

  it('stays readable while it is being pressed', () => {
    // The obvious hover partner, --fcs-whatsapp-hover #128C7E, is 4.14:1
    // against white: the label fails AA at the exact moment of interaction.
    // --fcs-whatsapp-pill-hover #17703D is 6.14:1 and visibly darker.
    expect(rfq).toContain('hover:bg-fcs-whatsapp-pill-hover')
    expect(rfq).not.toContain('hover:bg-fcs-whatsapp-hover')
  })

  it('keeps both tap targets at 44px', () => {
    const targets = rfq.match(/min-h-11/g) || []
    expect(targets.length).toBeGreaterThanOrEqual(2)
  })

  it('stacks the buttons on a 360px screen', () => {
    expect(rfq).toContain('flex-col')
    expect(rfq).toContain('sm:flex-row')
  })

  it('adds no animation that ignores reduced motion', () => {
    const animations = rfq.match(/animate-/g) || []
    const optOuts = rfq.match(/motion-reduce:|motion-safe:/g) || []
    expect(animations.length).toBe(optOuts.length)
  })
})

describe('it does not disturb the existing search system', () => {
  it('adds no second analytics write', () => {
    // /api/products already records every search including zero-result ones,
    // and SearchWithSuggestions tracks the overlay path. A third writer would
    // inflate the counts this feature is measured by.
    expect(rfq).not.toContain('track-zero-result')
    expect(rfq).not.toContain('trackZeroResultSearch')
    expect(rfq).not.toContain('recordSearch')
  })

  it('leaves the protected search modules untouched', () => {
    // Phase 1 must not edit these. Their content is asserted elsewhere; here we
    // only prove the RFQ component does not reach into them.
    expect(rfq).not.toContain('search-match')
    expect(rfq).not.toContain('product-filters')
  })
})
