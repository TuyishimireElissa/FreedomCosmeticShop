import { describe, expect, it } from 'vitest'
import {
  LOCAL_SEARCH_VOCABULARY,
  expandSearchQuery,
  getAlternativeSuggestions,
  getSearchSuggestions,
  jaroWinkler,
  parsePriceFromQuery,
  removePriceExpression,
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
