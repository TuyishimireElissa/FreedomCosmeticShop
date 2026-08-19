import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  computeContentStatus,
  computeFieldTable,
  CONTENT_FIELD_DEFS,
  csvCell,
  firstLegacyImage,
  RW_CONTENT_FIELDS,
} from '@/lib/product-content'

const route = readFileSync('src/app/api/admin/products/content-stats/route.ts', 'utf8')
const component = readFileSync('src/components/admin/ContentStatusDashboard.tsx', 'utf8')
const en = readFileSync('src/lib/i18n/translations/en.ts', 'utf8')
const rw = readFileSync('src/lib/i18n/translations/rw.ts', 'utf8')

const completeRow: Record<string, unknown> = {
  name: 'A', nameRw: 'A', brandId: 'b', categoryId: 'c',
  shortDescription: 's', shortDescriptionRw: 's',
  description: 'd', descriptionRw: 'd',
  ingredients: '["x"]', ingredientsRw: 'i',
  howToUse: 'h', howToUseRw: 'h',
  expectedResults: 'e', expectedResultsRw: 'e',
  warnings: 'w', warningsRw: 'w',
  suitableFor: { skinType: ['OILY'] },
  uniqueSellingPoints: ['u'],
  seoKeywords: 'k', seoKeywordsRw: 'k',
  whatsappShareText: 'wt',
  sku: 'S-1', weightGrams: 500,
  price: 5000,
}

const emptyRow: Record<string, unknown> = {
  name: '', nameRw: null, brandId: null, categoryId: null,
  shortDescription: null, shortDescriptionRw: null,
  description: '', descriptionRw: null,
  ingredients: '[]', ingredientsRw: null,
  howToUse: null, howToUseRw: null,
  expectedResults: null, expectedResultsRw: null,
  warnings: null, warningsRw: null,
  suitableFor: null, skinType: '[]', hairType: null,
  uniqueSellingPoints: [],
  seoKeywords: null, seoKeywordsRw: null,
  whatsappShareText: null,
  sku: null, weightGrams: null,
  price: undefined,
}

describe('23-field completeness model', () => {
  it('defines exactly 23 content fields', () => {
    expect(CONTENT_FIELD_DEFS).toHaveLength(23)
    const keys = CONTENT_FIELD_DEFS.map((def) => def.key)
    expect(new Set(keys).size).toBe(23)
    expect(keys).toContain('name')
    expect(keys).toContain('whatsappShareText')
    expect(keys).toContain('weight')
    expect(keys).toContain('uniqueSellingPoints')
  })

  it('declares exactly 8 Kinyarwanda fields', () => {
    expect(RW_CONTENT_FIELDS).toHaveLength(8)
  })

  it('marks a fully-populated row complete (23/23)', () => {
    const status = computeContentStatus(completeRow)
    expect(status.isComplete).toBe(true)
    expect(status.presentCount).toBe(23)
    expect(status.missingCount).toBe(0)
    expect(status.missing).toEqual([])
    expect(status.criticalMissing).toEqual([])
    expect(status.rwMissing).toEqual([])
  })

  it('marks an empty row as 0/23 with critical and RW gaps', () => {
    const status = computeContentStatus(emptyRow)
    expect(status.isComplete).toBe(false)
    expect(status.presentCount).toBe(0)
    expect(status.missing).toHaveLength(23)
    expect(status.criticalMissing).toEqual(expect.arrayContaining(['name', 'description', 'price']))
    expect(status.rwMissing).toHaveLength(8)
  })

  it('counts suitableFor as present via the legacy skinType/hairType channels', () => {
    const row = { ...emptyRow, skinType: '["OILY"]' }
    const status = computeContentStatus(row)
    expect(status.present).toContain('suitableFor')
    expect(status.missing).not.toContain('suitableFor')
  })

  it('counts weight as present only above zero and ingredients only with items', () => {
    const zeroWeight = computeContentStatus({ ...completeRow, weightGrams: 0 })
    expect(zeroWeight.missing).toContain('weight')
    const noIngredients = computeContentStatus({ ...completeRow, ingredients: '[]' })
    expect(noIngredients.missing).toContain('ingredients')
    const someIngredients = computeContentStatus({ ...completeRow, ingredients: '["A"]' })
    expect(someIngredients.present).toContain('ingredients')
  })

  it('computes the field table percentages across rows', () => {
    const table = computeFieldTable([completeRow, emptyRow])
    expect(table).toHaveLength(23)
    const nameRow = table.find((row) => row.field === 'name')
    expect(nameRow).toEqual({ field: 'name', complete: 1, missing: 1, pct: 50 })
    const empty = computeFieldTable([])
    expect(empty.every((row) => row.pct === 0)).toBe(true)
  })

  it('reads the first legacy image URL and escapes CSV cells', () => {
    expect(firstLegacyImage('["https://a.png","https://b.png"]')).toBe('https://a.png')
    expect(firstLegacyImage('not json')).toBe(null)
    expect(firstLegacyImage(null)).toBe(null)
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('has, comma')).toBe('"has, comma"')
    expect(csvCell('has "quote"')).toBe('"has ""quote"""')
    expect(csvCell(null)).toBe('')
  })
})

describe('content stats route contract', () => {
  it('is admin-only and never cached', () => {
    expect(route).toContain('requirePermission(PERMISSIONS.PRODUCTS_READ)')
    expect(route).toContain("'Cache-Control', 'no-store'")
  })

  it('uses non-cancelled orders as the demand proxy', () => {
    expect(route).toContain('status: { not:')
    expect(route).toContain('CANCELLED')
  })

  it('exports a CSV attachment with the missing-fields report', () => {
    expect(route).toContain("format === 'csv'")
    expect(route).toContain('text/csv; charset=utf-8')
    expect(route).toContain('Content-Disposition')
    expect(route).toContain('missing_fields')
    expect(route).toContain('present_fields')
  })

  it('returns totals, field table, products and priorities', () => {
    expect(route).toContain('totals')
    expect(route).toContain('fields')
    expect(route).toContain('priorities')
    expect(route).toContain('bestSellersIncomplete')
    expect(route).toContain('missingKinyarwanda')
    expect(route).toContain('computeFieldTable(products)')
  })
})

describe('content status dashboard UI', () => {
  it('loads live stats, filters and sorts client-side', () => {
    expect(component).toContain("fetch('/api/admin/products/content-stats'")
    expect(component).toContain('categoryFilter')
    expect(component).toContain('fieldFilter')
    expect(component).toContain("setSortMode('missing')")
    expect(component).toContain("setSortMode('units')")
  })

  it('offers the CSV export and per-product edit links', () => {
    expect(component).toContain('/api/admin/products/content-stats?format=csv')
    expect(component).toContain('href="/admin/products"')
  })

  it('renders empty fields gracefully with aria-live feedback', () => {
    expect(component).toContain('aria-live="polite"')
    expect(component).toContain('empty_state')
    expect(component).toContain('loading="lazy"')
  })
})

describe('content dashboard i18n', () => {
  it('defines the admin_content namespace in both languages', () => {
    expect(en).toContain('admin_content: {')
    expect(rw).toContain('admin_content: {')
    expect(en).toContain("title: 'Product Content Status'")
    expect(rw).toContain('priority_rw')
  })
})
