import { describe, expect, it } from 'vitest'
import {
  expandSearchQuery,
  getSearchSuggestions,
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
})
