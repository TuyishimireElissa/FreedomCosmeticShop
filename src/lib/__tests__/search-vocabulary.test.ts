import { describe, expect, it } from 'vitest'
import {
  LOCAL_SEARCH_VOCABULARY,
  expandSearchQuery,
  getAlternativeSuggestions,
  getSearchSuggestions,
  jaroWinkler,
  parsePriceFromQuery,
  removePriceExpression,
  matchControlledTerm,
} from '@/lib/search-vocabulary'

describe('Rwanda local search vocabulary', () => {
  it.each([
    ['uruhu', 'skincare'],
    ['umusatsi', 'haircare'],
    ['amavuta', 'lotion'],
    ['isabune', 'cleanser'],
  ])('expands %s into %s-related search terms', (query, expected) => {
    expect(expandSearchQuery(query)).toContain(expected)
  })

  it('keeps the original normalized search term', () => {
    expect(expandSearchQuery('  Hair   Oil ')).toContain('hair oil')
  })

  it('supports common spelling variants', () => {
    expect(expandSearchQuery('mosturizer')).toContain('moisturizer')
  })

  it.each([
    ['under 10000 RWF', 10000],
    ['below 10,000 rwf', 10000],
    ['munsi ya 10000 RWF', 10000],
    ['kutarenza 10.000 frw', 10000],
  ])('parses maximum-price query: %s', (query, maxPrice) => {
    expect(parsePriceFromQuery(query)?.maxPrice).toBe(maxPrice)
  })

  it.each([
    ['between 5000 and 15000 RWF', 5000, 15000],
    ['hagati ya 5,000 na 15,000 RWF', 5000, 15000],
    ['5000-15000 RWF', 5000, 15000],
  ])('parses price range: %s', (query, minPrice, maxPrice) => {
    expect(parsePriceFromQuery(query)).toMatchObject({ minPrice, maxPrice })
  })

  it('separates product words from a price expression', () => {
    const query = 'amavuta munsi ya 10000 RWF'
    expect(removePriceExpression(query, parsePriceFromQuery(query))).toBe('amavuta')
  })

  it('suggests matching local terms', () => {
    expect(getSearchSuggestions('umu')).toContain('umusatsi')
  })

  it('returns no expansions for blank input', () => {
    expect(expandSearchQuery('   ')).toEqual([])
  })

  it('preserves the existing vocabulary and only ever grows', () => {
    // Was pinned at exactly 189. A hard count fails on every legitimate
    // addition while proving nothing about the entries that matter, so it
    // asserts a floor plus the specific keys worth protecting.
    expect(Object.keys(LOCAL_SEARCH_VOCABULARY).length).toBeGreaterThanOrEqual(189)
    expect(LOCAL_SEARCH_VOCABULARY.uruhu).toContain('skincare')
    expect(LOCAL_SEARCH_VOCABULARY.mosturizer).toContain('moisturizer')
    expect(LOCAL_SEARCH_VOCABULARY['umusatsi ugwa']).toContain('alopecia')
  })

  it('makes every stocked category name searchable in Kinyarwanda', () => {
    // A shopper who types the label printed on our own menu tile must find
    // the products behind it. Each of these returned zero before: `kwera`
    // (9 whitening products), `deodorante` (3), `ifarasi` (nail care).
    expect(expandSearchQuery('kwera')).toContain('whitening')
    expect(expandSearchQuery('deodorante')).toContain('deodorant')
    expect(expandSearchQuery('ifarasi')).toContain('nail care')
    expect(expandSearchQuery('isabune')).toContain('soap')
    expect(expandSearchQuery('imibavu')).toContain('fragrance')
  })

  describe('bare ingredient names reach the products that contain them', () => {
    // `shea butter` and `coconut oil` were mapped; `shea` and `coconut` alone
    // were not, so the shorter word a shopper actually types found nothing.
    // Measured live: coconut 9 products, glycerin 9, argan 4, shea 5.
    it('expands the short form to the full ingredient', () => {
      expect(expandSearchQuery('shea')).toContain('shea butter')
      expect(expandSearchQuery('coconut')).toContain('coconut oil')
      expect(expandSearchQuery('argan')).toContain('argan oil')
      expect(expandSearchQuery('glycerin')).toContain('glycerine')
    })

    it('holds each as its own key, not via a longer sibling', () => {
      for (const key of ['shea', 'coconut', 'argan', 'glycerin', 'rosehip']) {
        expect(
          Object.prototype.hasOwnProperty.call(LOCAL_SEARCH_VOCABULARY, key),
          `"${key}" must be its own vocabulary key`,
        ).toBe(true)
      }
    })
  })

  describe('makeup terms reach the sourcing panel', () => {
    // The shop stocks NO makeup. These exist so a shopper's word lands on the
    // WhatsApp sourcing panel instead of a bare "no results", and so the
    // demand becomes visible in popular-search analytics.
    it('expands the English makeup words', () => {
      expect(expandSearchQuery('lipstick')).toContain('lip color')
      expect(expandSearchQuery('mascara')).toContain('eyelash')
      expect(expandSearchQuery('foundation')).toContain('base makeup')
      expect(expandSearchQuery('concealer')).toContain('corrector')
      expect(expandSearchQuery('eyeshadow')).toContain('eye shadow')
    })

    it('expands the Kinyarwanda and East African words', () => {
      expect(expandSearchQuery('ikaramu')).toContain('lipstick')
      expect(expandSearchQuery('mchakauzi')).toContain('eyeliner')
      expect(expandSearchQuery('kohl')).toContain('eyeliner')
      expect(expandSearchQuery('mikaro')).toContain('makeup')
    })

    it('ties every makeup term back to the makeup concept', () => {
      // So a future makeup category is reachable from any of these words
      // without further vocabulary work.
      for (const term of ['lipstick', 'mascara', 'foundation', 'eyeshadow', 'concealer', 'eyeliner']) {
        expect(expandSearchQuery(term), `${term} should reach "makeup"`).toContain('makeup')
      }
    })

    it('holds each makeup term as its own key, not via a sibling', () => {
      // Pre-existing Kinyarwanda keys already map TO some of these English
      // words — `lipisitiki -> lipstick`, `masikara -> mascara` — and the
      // reverse-match rule means expandSearchQuery('lipstick') still resolves
      // even with the lipstick key deleted. Three mutations survived on
      // exactly that. Assert the keys themselves so a deletion cannot hide
      // behind a neighbour.
      for (const key of ['lipstick', 'mascara', 'foundation', 'eyeshadow', 'concealer', 'eyeliner', 'ikaramu', 'kohl', 'mchakauzi', 'mikaro']) {
        expect(
          Object.prototype.hasOwnProperty.call(LOCAL_SEARCH_VOCABULARY, key),
          `"${key}" must be its own vocabulary key`,
        ).toBe(true)
      }
    })

    it('routes each makeup key through the makeup concept in its own mapping', () => {
      // Not just reachable via expansion — the entry itself must say "makeup",
      // otherwise dropping it from one mapping goes unnoticed.
      for (const key of ['lipstick', 'mascara', 'foundation', 'eyeshadow', 'concealer', 'eyeliner', 'ikaramu', 'kohl', 'mchakauzi', 'mikaro']) {
        const mapped = LOCAL_SEARCH_VOCABULARY[key as keyof typeof LOCAL_SEARCH_VOCABULARY] as readonly string[]
        expect(mapped, `${key} mapping missing`).toBeDefined()
        expect(mapped.join(' '), `${key} should mention makeup or a makeup word`).toMatch(/makeup|lipstick|eyeliner|cosmetics/)
      }
    })
  })

  describe('the analytics vocabulary counts the new demand', () => {
    // CONTROLLED_SEARCH_VOCABULARY drives /api/search/popular. It is a
    // DIFFERENT list from LOCAL_SEARCH_VOCABULARY, which drives recall — a
    // term added to only one of them is half-wired.
    it('counts makeup searches so unmet demand becomes visible', () => {
      for (const term of ['lipstick', 'mascara', 'foundation', 'eyeshadow', 'ikaramu', 'kohl']) {
        expect(matchControlledTerm(term), `${term} must be countable`).toBe(term)
      }
    })

    it('counts the bare ingredient names', () => {
      for (const term of ['shea', 'coconut', 'argan', 'glycerin']) {
        expect(matchControlledTerm(term)).toBe(term)
      }
    })

    it('still prefers the longest match over a bare ingredient', () => {
      // Adding `shea` and `coconut` must not shadow the existing longer
      // entries, or "coconut oil" would be reported as plain "coconut".
      expect(matchControlledTerm('coconut oil')).toBe('coconut oil')
      expect(matchControlledTerm('shea butter')).toBe('shea butter')
      expect(matchControlledTerm('argan oil')).toBe('argan oil')
    })

    it('still records nothing for text that is not catalogue vocabulary', () => {
      expect(matchControlledTerm('Mukamana 0788123456')).toBeNull()
      expect(matchControlledTerm('xyzfake')).toBeNull()
    })
  })

  it('holds each category term as its own entry, not via a sibling', () => {
    // `kwera` alone once passed only because the longer `kwera no kurangaza`
    // key matched by substring — deleting the real entry left the test green.
    // Assert the keys themselves so a removal cannot hide behind a neighbour.
    for (const key of ['kwera', 'deodorante', 'ifarasi', 'abana']) {
      expect(
        Object.prototype.hasOwnProperty.call(LOCAL_SEARCH_VOCABULARY, key),
        `"${key}" must be its own vocabulary key`,
      ).toBe(true)
    }
  })

  it('does not confuse children with men', () => {
    // `abana` (children) scores 0.8533 against `abagabo` (men), over the 0.85
    // typo threshold, so a baby-product search used to return men's deodorant.
    const abana = expandSearchQuery('abana')
    expect(abana).toContain('baby')
    expect(abana).not.toContain('men')
    expect(abana).not.toContain('abagabo')
    // The men's term must keep working on its own.
    expect(expandSearchQuery('abagabo')).toContain('men')
  })

  it('still tolerates genuine misspellings of unknown words', () => {
    // Fuzzy matching is now skipped for exact vocabulary keys. It must still
    // run for everything else, or typo recall regresses.
    expect(expandSearchQuery('vitanin').length).toBeGreaterThan(1)
    expect(expandSearchQuery('skincaer')).toContain('skincare')
    expect(expandSearchQuery('perfme')).toContain('perfume')
  })

  it('expands new concern, ingredient, shade, and occasion vocabulary', () => {
    expect(expandSearchQuery('ibiheri')).toContain('breakouts')
    expect(expandSearchQuery('niacinamide')).toContain('vitamin b3')
    expect(expandSearchQuery('irangi ry’ubutaka')).toContain('mocha')
    expect(expandSearchQuery('umuganura')).toContain('bridal beauty')
  })

  it('uses Jaro-Winkler typo tolerance at the high threshold', () => {
    expect(jaroWinkler('maybeline', 'maybelline')).toBeGreaterThanOrEqual(0.85)
    expect(expandSearchQuery('maybeline')).toContain('maybelline')
    expect(expandSearchQuery('zzzz')).toEqual(['zzzz'])
  })

  it.each([
    ['5k', { maxPrice: 5000 }],
    ['around 10000 RWF', { minPrice: 8000, maxPrice: 12000 }],
    ['hafi ya 10000 RWF', { minPrice: 8000, maxPrice: 12000 }],
    ['amafaranga make', { maxPrice: 10000 }],
    ['amafaranga menshi', { minPrice: 30000 }],
  ])('parses expanded price phrase: %s', (query, expected) => {
    expect(parsePriceFromQuery(query)).toMatchObject(expected)
  })

  it('returns language-aware alternatives without duplicates', () => {
    expect(getAlternativeSuggestions('amavuta y’umusatsi', 'rw')).toContain("Ubuvura bw'umusatsi")
    expect(getAlternativeSuggestions('hair treatment', 'en')).toContain('hair products')
    expect(getAlternativeSuggestions('unknown term', 'en')).toEqual(['Skincare', 'Haircare', 'Body lotion'])
  })
})
