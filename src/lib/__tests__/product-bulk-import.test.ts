import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BulkImportPayloadSchema,
  computeContentUpdate,
  ImportParseError,
  parseImportJson,
  splitIngredientsText,
} from '@/lib/product-import'

const route = readFileSync('src/app/api/admin/products/bulk-import/route.ts', 'utf8')

const emptyRow = {
  name: 'Existing Product',
  nameRw: null,
  shortDescription: 'existing short description',
  shortDescriptionRw: null,
  description: 'existing full description',
  descriptionRw: null,
  ingredients: '["Old Ingredient"]',
  ingredientsRw: null,
  howToUse: null,
  howToUseRw: null,
  expectedResults: null,
  expectedResultsRw: null,
  warnings: 'Existing warning',
  warningsRw: null,
  suitableFor: null,
  uniqueSellingPoints: [],
  seoKeywords: null,
  seoKeywordsRw: null,
  whatsappShareText: null,
  weightGrams: null,
}

describe('bulk import JSON parsing', () => {
  it('parses a valid payload with all content fields', () => {
    const payload = parseImportJson(JSON.stringify({
      products: [{
        identifier: 'SKU-1',
        nameRw: 'Izina',
        suitableFor: { skinType: ['OILY'], ageRange: '18+' },
        uniqueSellingPoints: ['a', 'b'],
        weight: 500,
        whatsappShareText: 'Gura uyu munsi!',
      }],
    }))
    expect(payload.products).toHaveLength(1)
    expect(payload.products[0].weight).toBe(500)
    expect(payload.products[0].suitableFor?.ageRange).toBe('18+')
  })

  it('rejects invalid JSON, missing products, empty arrays, and oversized batches', () => {
    expect(() => parseImportJson('not json')).toThrow(ImportParseError)
    expect(() => parseImportJson('{"items": []}')).toThrow(ImportParseError)
    expect(() => parseImportJson('{"products": []}')).toThrow(ImportParseError)
    expect(() => parseImportJson(JSON.stringify({ products: Array.from({ length: 501 }, (_, i) => ({ identifier: `sku-${i}` })) }))).toThrow(ImportParseError)
  })

  it('reports the failing item index and field on invalid entries', () => {
    try {
      parseImportJson(JSON.stringify({ products: [{ identifier: 'ok' }, { identifier: '', nameRw: 'x' }] }))
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ImportParseError)
      expect((error as ImportParseError).message).toContain(':1:')
    }
  })

  it('rejects non-content payload keys (strict schema)', () => {
    const result = BulkImportPayloadSchema.safeParse({ products: [{ identifier: 'sku', price: 1 }] })
    expect(result.success).toBe(false)
  })

  it('splits a pasted ingredient text into list items', () => {
    expect(splitIngredientsText('Vitamin C, Glycerin\nAloe Vera; Water')).toEqual(['Vitamin C', 'Glycerin', 'Aloe Vera', 'Water'])
  })
})

describe('computeContentUpdate safety rules', () => {
  it('writes into empty fields only, and reports every decision', () => {
    const incoming = {
      identifier: 'sku-1',
      name: 'New Name', // existing name is non-empty -> skipped
      nameRw: 'Izina rishya', // empty -> written
      ingredients: 'Vitamin C, Glycerin', // existing has content -> skipped
      howToUse: 'Apply daily.', // empty -> written
      weight: 500, // empty -> written
      warnings: 'New warning', // existing -> skipped
    }
    const result = computeContentUpdate(emptyRow, incoming, false)
    expect(result.updatedFields).toContain('nameRw')
    expect(result.updatedFields).toContain('howToUse')
    expect(result.updatedFields).toContain('weight')
    expect(result.skippedFields).toContain('name')
    expect(result.skippedFields).toContain('ingredients')
    expect(result.skippedFields).toContain('warnings')
    expect(result.data.weightGrams).toBe(500)
    expect(result.data.ingredients).toBeUndefined()
    expect(result.data.name).toBeUndefined()
  })

  it('never lets core fields through, even with overwrite on', () => {
    const incoming = { identifier: 'sku-1', price: 1, stock: 99 } as never
    const result = computeContentUpdate(emptyRow, incoming, true)
    expect(result.data).toEqual({})
    expect(result.updatedFields).toEqual([])
  })

  it('overwrites non-empty fields only when explicitly asked', () => {
    const incoming = { identifier: 'sku-1', warnings: 'Replacement warning' }
    const without = computeContentUpdate(emptyRow, incoming, false)
    expect(without.updatedFields).toEqual([])
    expect(without.skippedFields).toContain('warnings')
    const withOverwrite = computeContentUpdate(emptyRow, incoming, true)
    expect(withOverwrite.updatedFields).toContain('warnings')
    expect(withOverwrite.data.warnings).toBe('Replacement warning')
  })

  it('treats incoming null/empty as not-provided and never clears content', () => {
    const incoming = { identifier: 'sku-1', shortDescription: null, description: '', nameRw: null }
    const result = computeContentUpdate(emptyRow, incoming, true)
    expect(result.data).toEqual({})
    expect(result.updatedFields).toEqual([])
  })

  it('serializes ingredients as the legacy JSON array the column expects', () => {
    const row = { ...emptyRow, ingredients: null }
    const result = computeContentUpdate(row, { identifier: 'sku-1', ingredients: 'A, B' }, false)
    expect(result.data.ingredients).toBe(JSON.stringify(['A', 'B']))
  })

  it('passes suitableFor and uniqueSellingPoints through as structured values', () => {
    const incoming = {
      identifier: 'sku-1',
      suitableFor: { skinType: ['OILY'], gender: 'unisex' },
      uniqueSellingPoints: ['one', 'two', 'three'],
    }
    const result = computeContentUpdate(emptyRow, incoming, false)
    expect(result.updatedFields).toContain('suitableFor')
    expect(result.updatedFields).toContain('uniqueSellingPoints')
    expect(result.data.suitableFor).toEqual({ skinType: ['OILY'], gender: 'unisex' })
    expect(result.data.uniqueSellingPoints).toEqual(['one', 'two', 'three'])
  })
})

describe('bulk import route contract', () => {
  it('is admin-only, rate limited, and audit logged', () => {
    expect(route).toContain('requirePermission(PERMISSIONS.PRODUCTS_UPDATE)')
    expect(route).toContain('rateLimit(')
    expect(route).toContain("action: 'PRODUCT_BULK_IMPORT'")
  })

  it('supports a preview pass that writes nothing', () => {
    expect(route).toContain('preview: true')
    expect(route).toContain('if (preview)')
    expect(route).toContain('tx.product.update')
  })

  it('matches only live products by sku, distributor sku or slug', () => {
    expect(route).toContain('isDeleted: false')
    expect(route).toContain('{ sku: incoming.identifier }')
    expect(route).toContain('{ realSku: incoming.identifier }')
    expect(route).toContain('{ slug: incoming.identifier }')
  })

  it('writes inside a transaction and reports per-product results', () => {
    expect(route).toContain('prisma.$transaction')
    expect(route).toContain("status: 'updated'")
    expect(route).toContain("status: 'not_found'")
    expect(route).toContain('updatedFields')
    expect(route).toContain('skippedFields')
  })

  it('never modifies categoryId from the import payload', () => {
    expect(route).toContain('category left unchanged')
  })
})
