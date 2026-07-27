import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/components/storefront/SearchWithSuggestions.tsx'), 'utf8')

describe('smart search performance and navigation', () => {
  it('debounces suggestions for exactly 300ms and aborts stale requests', () => {
    expect(source).toContain('}, 300)')
    expect(source).toContain('abortRef.current?.abort()')
    expect(source).toContain("signal: controller.signal")
  })

  it('caches suggestions, real popular searches, and recent searches in sessionStorage', () => {
    expect(source).toContain("CACHE_PREFIX = 'fcs_suggestions_'")
    expect(source).toContain('sessionStorage.setItem(cacheKey')
    expect(source).toContain("RECENT_SEARCHES_KEY = 'fcs_recent_searches'")
    expect(source).toContain("fetch('/api/search/popular'")
    expect(source).toContain('POPULAR_SEARCH_CACHE_KEY')
    expect(source).not.toContain('POPULAR_LOCAL_SEARCHES.map')
    expect(source).not.toContain('localStorage.')
  })

  it('limits rendered product suggestions to six real API results', () => {
    expect(source).toContain('.slice(0, 6)')
    expect(source).toContain('6 - products.length - categories.length')
    expect(source).toContain("formatRWF(product.price)")
    expect(source).toContain('<Image')
  })

  it('preserves existing product URL filters when submitting a search', () => {
    expect(source).toContain("window.location.pathname === '/products'")
    expect(source).toContain("new URLSearchParams(onProductsPage ? window.location.search : '')")
    expect(source).toContain("params.set('search', normalized)")
    expect(source).toContain("params.delete('page')")
  })
})
