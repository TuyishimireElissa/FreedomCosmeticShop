import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/app/products/page.tsx'), 'utf8')

describe('products search and filter integration', () => {
  it('assembles smart search, chips, mobile filters, and desktop sidebar', () => {
    expect(source).toContain('<SearchWithSuggestions variant="page" />')
    expect(source).toContain('<FilterChips />')
    expect(source).toContain('<MobileFilters')
    expect(source).toContain('<FilterSidebar')
  })

  it('uses URL filters as the sole filter source of truth', () => {
    expect(source).toContain('useProductFilters()')
    expect(source).toContain('buildApiQuery()')
    expect(source).not.toContain('useState<ProductFilterState>')
    expect(source).not.toContain('router.replace')
  })

  it('aborts stale product and filter-option requests', () => {
    expect(source.match(/new AbortController\(\)/g)?.length).toBeGreaterThanOrEqual(2)
    expect(source).toContain("signal: controller.signal")
    expect(source).toContain('return () => controller.abort()')
  })

  it('keeps progressive pagination and sorting in URL state', () => {
    expect(source).toContain("setFilter('sort'")
    expect(source).toContain("setFilter('page'")
    expect(source).toContain("params.set('pageSize', String(pageSize))")
    expect(source).toContain('LOW_DATA_PAGE_SIZE = 8')
    expect(source).toContain('NORMAL_PAGE_SIZE = 20')
  })
})
