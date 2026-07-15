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

  it('preserves the existing vocabulary while expanding to 189 entries', () => {
    expect(Object.keys(LOCAL_SEARCH_VOCABULARY)).toHaveLength(189)
    expect(LOCAL_SEARCH_VOCABULARY.uruhu).toContain('skincare')
    expect(LOCAL_SEARCH_VOCABULARY.mosturizer).toContain('moisturizer')
    expect(LOCAL_SEARCH_VOCABULARY['umusatsi ugwa']).toContain('alopecia')
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
