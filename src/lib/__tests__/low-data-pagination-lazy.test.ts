import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const productsPage = read('src/components/products/ProductsPageClient.tsx')
const lazySection = read('src/components/ui/LazySection.tsx')
const homepage = read('src/app/page.tsx')
const smartImage = read('src/components/ui/SmartImage.tsx')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('low-data pagination and deferred sections', () => {
  it('uses 8-product low-data pages and 20-product normal pages', () => {
    expect(productsPage).toContain('const LOW_DATA_PAGE_SIZE = 8')
    expect(productsPage).toContain('const NORMAL_PAGE_SIZE = 20')
    expect(productsPage).toContain('const pageSize = isLowData ? LOW_DATA_PAGE_SIZE : NORMAL_PAGE_SIZE')
    expect(productsPage).toContain("params.set('pageSize', String(pageSize))")
  })

  it('appends deduplicated product pages behind an explicit load-more action', () => {
    expect(productsPage).toContain('const canAppend = page > 1')
    expect(productsPage).toContain('new Set(current.map((product) => product.id))')
    expect(productsPage).toContain("setFilter('page', String(page + 1))")
    expect(productsPage).toContain("t('search.load_more_products')")
    expect(productsPage).toContain('aria-controls="product-results"')
    expect(productsPage).toContain('aria-live="polite"')
  })

  it('defers child mounting until detection settles or the user requests the section', () => {
    expect(lazySection).toContain('const { isLowData } = useLowData()')
    expect(lazySection).toContain('window.setTimeout(() => setDetectionSettled(true), 0)')
    expect(lazySection).toContain('if (detectionSettled && !isLowData) load()')
    expect(lazySection).toContain('if (requested) return <>{children}</>')
    expect(lazySection).toContain("t('low_data.load_section', { section: label })")
    expect(lazySection).toContain('min-h-12')
  })

  it('gates heavy homepage reviews and personalized recommendations', () => {
    expect(homepage).toContain("<LazySection label={t('home.section_reviews')}")
    expect(homepage).toContain("<LazySection label={t('personalized_recommendations.section_label')}")
  })

  it('continues to lazy-load non-priority responsive images', () => {
    expect(smartImage).toContain("loading={priority ? undefined : 'lazy'}")
  })

  it('provides English and verified Kinyarwanda interaction labels', () => {
    for (const key of ['deferred_section', 'load_section', 'load_more_products', 'loading_more_products', 'showing_products', 'beauty_guides']) {
      expect(english).toMatch(new RegExp(`${key}:`))
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
