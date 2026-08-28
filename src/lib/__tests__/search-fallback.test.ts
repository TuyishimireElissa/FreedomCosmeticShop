import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Phase 4 — smart similar-products fallback.
 *
 * Source-reading tests (same style as the rest of this suite; the fallback
 * logic is also exercised live against the real catalogue each audit, so the
 * DB-backed ladder is proven twice — here we freeze the contract: evidence
 * order, thresholds, brand map, filter safety and the UI wiring).
 */

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const fallback = read('src/lib/search-fallback.ts')
const route = read('src/app/api/products/route.ts')
const overlay = read('src/components/storefront/SearchOverlay.tsx')
const grid = read('src/components/products/ProductGrid.tsx')
const notice = read('src/components/products/SearchFallbackNotice.tsx')
const vocab = read('src/lib/search-vocabulary.ts')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

import { BRAND_PHONETIC_MAP } from '@/lib/search-vocabulary'
import { CATEGORY_FALLBACK_KEYWORDS, FALLBACK_LIMIT, TRIGRAM_SIMILARITY_FLOOR } from '@/lib/search-fallback'

describe('fallback ladder — evidence order and thresholds', () => {
  it('walks trigram → phonetic → category → popular, strongest evidence first', () => {
    const trigram = fallback.indexOf('await trigramIds(query, limit)')
    const phonetic = fallback.indexOf('await phoneticIds(query, limit)')
    const category = fallback.indexOf('await categoryIds(query, limit)')
    const popular = fallback.indexOf('await popularIds(limit)')
    expect(trigram, 'trigram step missing').toBeGreaterThan(-1)
    expect(phonetic, 'phonetic step missing').toBeGreaterThan(trigram)
    expect(category, 'category step missing').toBeGreaterThan(phonetic)
    expect(popular, 'popular step missing').toBeGreaterThan(category)
  })

  it('returns null only when no evidence AND the catalogue is empty — never for a valid query', () => {
    expect(fallback).toContain('popular.length > 0 ? { ids: popular, reason: \'popular\' } : null')
  })

  it('uses a name-similarity floor tuned between real typos (0.45–0.85) and junk (<0.12)', () => {
    expect(TRIGRAM_SIMILARITY_FLOOR).toBe(0.28)
  })

  it('caps every step at 8, so a fallback is a shelf, not the whole catalogue', () => {
    expect(FALLBACK_LIMIT).toBe(8)
    expect(fallback).toContain('LIMIT ${limit}')
  })
})

describe('fuzzy and junk queries', () => {
  it('a fuzzy typo matches by trigram similarity on the product name', () => {
    expect(fallback).toContain('similarity(lower(p.name), ${query.toLowerCase()}) AS sim')
    expect(fallback).toContain(`similarity(lower(p.name), ${'${query.toLowerCase()}'}) >= ${'${TRIGRAM_SIMILARITY_FLOOR}'}`)
  })

  it('a non-existent query (xyzzy123) still returns the 8 closest products via the popular step', () => {
    expect(fallback).toContain("orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }]")
    expect(fallback).toContain('take: limit')
    // The route only triggers the fallback after the normal search returned 0.
    expect(route).toContain('if (search && total === 0)')
    expect(route).toContain('resolveSearchFallback(searchableText || search)')
  })
})

describe('Kinyarwanda phonetic input', () => {
  it('maps piyari/pyari → Pyary, vaserine/vazeline → Vaseline, dovo → Dove', () => {
    expect(BRAND_PHONETIC_MAP['piyari']).toBe('Pyary')
    expect(BRAND_PHONETIC_MAP['pyari']).toBe('Pyary')
    expect(BRAND_PHONETIC_MAP['vaserine']).toBe('Vaseline')
    expect(BRAND_PHONETIC_MAP['vazeline']).toBe('Vaseline')
    expect(BRAND_PHONETIC_MAP['dovo']).toBe('Dove')
  })

  it('maps variant → canonical spelling and searches the stock catalogue', () => {
    expect(fallback).toContain('Object.entries(BRAND_PHONETIC_MAP)')
    expect(fallback).toContain('if (query.toLocaleLowerCase(\'rw-RW\').includes(variant))')
    expect(fallback).toContain("terms.add(canonical)")
  })

  it('exposes the map in search-vocabulary.ts (a named export, not buried in the object)', () => {
    expect(vocab).toContain('export const BRAND_PHONETIC_MAP')
  })
})

describe('category expansion — never an empty shelf', () => {
  it('maps makeup words to the stocked shelves (makeup has 0 live products)', () => {
    for (const cats of Object.values(CATEGORY_FALLBACK_KEYWORDS)) {
      expect(cats).not.toContain('makeup')
    }
    expect(CATEGORY_FALLBACK_KEYWORDS['eyeliner']).toContain('fragrance')
    expect(CATEGORY_FALLBACK_KEYWORDS['eyeliner']).toContain('whitening')
  })

  it('only lists categories that exist by slug (checked against /api/categories)', () => {
    const known = new Set(['fragrance', 'whitening', 'body-care', 'soap'])
    for (const cats of Object.values(CATEGORY_FALLBACK_KEYWORDS)) {
      for (const slug of cats) expect(known.has(slug), `unknown ${slug}`).toBe(true)
    }
  })
})

describe('API contract and filter safety', () => {
  it('reports the fallback with a reason via data.fallback', () => {
    expect(route).toContain('fallback: fallbackReason ? { applied: true, reason: fallbackReason } : null')
  })

  it('applies the fallback over the BASE filters — never inheriting the empty search clause', () => {
    // REGRESSION (caught live 2026-08-26): the fallback reused `and`, which
    // still contained the empty search clause `id in ['__no_match__']`; the
    // intersection was always empty, so the fallback silently never fired.
    expect(route).toContain('AND: [...baseAnd, { id: { in: fallback.ids } }]')
    expect(route).toContain("const and = searchClause ? [...baseAnd, searchClause] : baseAnd")
  })

  it('reports hasResults true once the fallback supplies a shelf', () => {
    expect(route).toContain('hasResults: effectiveTotal > 0')
  })
})

describe('UI — friendly notice + WhatsApp CTA, bilingual', () => {
  it('renders the notice above fallback results in the grid and the overlay', () => {
    expect(grid).toContain('fallbackReason && products.length > 0')
    expect(grid).toContain('<SearchFallbackNotice />')
    expect(overlay).toContain('fallbackReason &&')
    expect(overlay).toContain('<SearchFallbackNotice />')
  })

  it('uses the AA-safe WhatsApp pill (4.55:1), never fcs-whatsapp (1.98:1)', () => {
    expect(notice).toContain('bg-fcs-whatsapp-pill')
    expect(notice).not.toContain('bg-fcs-whatsapp ')
  })

  it('defines the notice + CTA keys in both languages and marks rw as reviewed', () => {
    for (const key of ['fallback_notice', 'fallback_cta']) {
      expect(en).toContain(`${key}:`)
      expect(rw).toContain(`${key}:`)
    }
    expect(rw).toMatch(/fallback_notice: .*\/\/ verified-rw/)
    expect(rw).toMatch(/fallback_cta: .*\/\/ verified-rw/)
  })
})

describe('empty state still shows trending + categories (regression guard for Phase 3)', () => {
  it('idle state renders category pills and (live or curated) popular searches', () => {
    expect(overlay).toContain('CATEGORY_CHIPS.map')
    expect(overlay).toContain('categoryCounts[chip.slug]')
    expect(overlay).toContain("t('search.popular')")
    expect(overlay).toContain("t('search.trending')")
    expect(overlay).toContain("t('search.recent')")
  })
})
