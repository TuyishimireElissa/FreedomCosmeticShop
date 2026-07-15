import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/components/products/FilterSidebar.tsx'), 'utf8')

describe('desktop URL filter sidebar', () => {
  it('uses the shared URL-backed filter hook for real-time updates', () => {
    expect(source).toContain('useProductFilters()')
    expect(source).toContain("setFilter('category'")
    expect(source).toContain("setFilter('inStock'")
  })

  it('updates both price boundaries atomically for predefined ranges', () => {
    expect(source).toContain('setFilters({ minPrice:')
    expect(source).toContain('maxPrice:')
  })

  it('includes category, brand, skin, hair, shade, rating, price, and stock filters', () => {
    for (const term of ['availableCategories', 'availableBrands', 'SKIN_TYPES', 'HAIR_TYPES', "setFilter('shade'", "setFilter('minRating'", 'priceRanges']) {
      expect(source).toContain(term)
    }
  })

  it('uses translated labels and is visible from the desktop breakpoint', () => {
    expect(source).toContain("t('search.filters')")
    expect(source).toContain("t('product.hair_type')")
    expect(source).toContain("t('search.clear_all_filters')")
    expect(source).toContain('md:block')
  })
})
