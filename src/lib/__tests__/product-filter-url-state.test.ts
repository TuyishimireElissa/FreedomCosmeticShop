import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readProductFilters, updateProductFilterParams } from '@/hooks/useProductFilters'

const mobileSource = readFileSync(resolve(process.cwd(), 'src/components/products/MobileFilters.tsx'), 'utf8')
const chipsSource = readFileSync(resolve(process.cwd(), 'src/components/products/FilterChips.tsx'), 'utf8')

describe('URL-backed product filters', () => {
  it('reads every supported filter from a shareable query string', () => {
    const filters = readProductFilters(new URLSearchParams('search=serum&category=skincare&brand=nivea&minPrice=5000&maxPrice=20000&skinType=DRY&hairType=CURLY&inStock=true&sort=rating&shade=mocha&minRating=4&page=3'))
    expect(filters).toMatchObject({ search: 'serum', category: 'skincare', brand: 'nivea', skinType: 'DRY', hairType: 'CURLY', inStock: true, shade: 'mocha', page: '3' })
  })

  it('preserves unrelated URL state and resets pagination after a filter change', () => {
    const updated = updateProductFilterParams(new URLSearchParams('search=serum&page=4&utm_source=test'), { hairType: 'COILY' })
    expect(updated.get('search')).toBe('serum')
    expect(updated.get('utm_source')).toBe('test')
    expect(updated.get('hairType')).toBe('COILY')
    expect(updated.has('page')).toBe(false)
  })

  it('removes default values instead of creating noisy URL parameters', () => {
    const updated = updateProductFilterParams(new URLSearchParams('sort=rating&inStock=true'), { sort: 'relevance', inStock: false })
    expect(updated.has('sort')).toBe(false)
    expect(updated.has('inStock')).toBe(false)
  })

  it('keeps mobile changes local until the translated Apply action', () => {
    expect(mobileSource).toContain('setLocalFilters')
    expect(mobileSource).toContain('setFilters(localFilters)')
    expect(mobileSource).toContain("t('common.apply')")
    expect(mobileSource).toContain('touchStartY')
  })

  it('provides individually removable chips and a clear-all control', () => {
    expect(chipsSource).toContain('clearFilter(chip.key)')
    expect(chipsSource).toContain('clearAllFilters')
    expect(chipsSource).toContain("t('search.remove_filter'")
  })
})
