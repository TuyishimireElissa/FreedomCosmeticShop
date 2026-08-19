import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CreateProductSchema } from '@/lib/admin-product-schema'

const read = (path: string) => readFileSync(path, 'utf8')
const schemaFile = read('prisma/schema.prisma')
const createRoute = read('src/app/api/admin/products/route.ts')
const updateRoute = read('src/app/api/admin/products/[id]/route.ts')
const publicSelects = read('src/lib/public-product.ts')
const typesFile = read('src/lib/types.ts')

/**
 * The 23 target fields and where they live after Phase 1.
 * 15 pre-existed; 8 were added in 20260817_product_23_fields.sql.
 * `weight` maps to the pre-existing `weightGrams`; `suitableFor` merges
 * with the pre-existing `skinType` / `hairType` columns at display time.
 */
const targetFields = [
  'name', 'nameRw', 'brandId', 'categoryId',
  'shortDescription', 'shortDescriptionRw', 'description', 'descriptionRw',
  'ingredients', 'ingredientsRw', 'howToUse', 'howToUseRw',
  'expectedResults', 'expectedResultsRw', 'warnings', 'warningsRw',
  'suitableFor', 'uniqueSellingPoints',
  'seoKeywords', 'seoKeywordsRw', 'whatsappShareText',
  'sku', 'weightGrams',
] as const

const fullContent = {
  nameRw: 'Serumu ya Vitamini C',
  shortDescriptionRw: 'Serumu 15% ya Vitamini C yo kuruhu rumurika.',
  descriptionRw: 'Ibisobanuro birambuye byo mu Kinyarwanda.',
  suitableFor: {
    skinType: ['OILY', 'DRY'],
    hairType: ['CURLY'],
    ageRange: '18+',
    gender: 'unisex',
  },
  uniqueSellingPoints: ['Made in Rwanda', 'Paraben-free', 'Visible results in 14 days'],
  seoKeywords: 'vitamin c serum, brightening, kigali',
  seoKeywordsRw: 'serumu ya vitamini c, kuruhu',
  whatsappShareText: 'Gura Serumu ya Vitamini C kuri FreedomCosmeticShop — 8,500 RWF. Igerageze uyu munsi!',
}

const minimumValid = { name: 'Body Lotion', price: 5000, categoryId: 'category-1' }

describe('product content infrastructure (23 fields)', () => {
  it('declares every one of the 23 target fields on the Product model', () => {
    for (const field of targetFields) {
      expect(schemaFile, `schema missing ${field}`).toContain(field)
    }
  })

  it('accepts a payload carrying all content fields through the create schema', () => {
    const result = CreateProductSchema.safeParse({ ...minimumValid, ...fullContent })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nameRw).toBe('Serumu ya Vitamini C')
      expect(result.data.suitableFor?.gender).toBe('unisex')
      expect(result.data.uniqueSellingPoints).toHaveLength(3)
      expect(result.data.whatsappShareText).toContain('FreedomCosmeticShop')
    }
  })

  it('keeps every content field optional for existing clients', () => {
    expect(CreateProductSchema.safeParse(minimumValid).success).toBe(true)
  })

  it('rejects malformed content shapes instead of storing them', () => {
    expect(CreateProductSchema.safeParse({ ...minimumValid, uniqueSellingPoints: Array.from({ length: 11 }, (_, i) => `point ${i}`) }).success).toBe(false)
    expect(CreateProductSchema.safeParse({ ...minimumValid, uniqueSellingPoints: ['x'.repeat(201)] }).success).toBe(false)
    expect(CreateProductSchema.safeParse({ ...minimumValid, suitableFor: { gender: 42 } }).success).toBe(false)
    expect(CreateProductSchema.safeParse({ ...minimumValid, whatsappShareText: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('update route validates all new fields and strictly rejects unknown keys', () => {
    for (const field of ['nameRw', 'shortDescriptionRw', 'descriptionRw', 'suitableFor', 'uniqueSellingPoints', 'seoKeywords', 'seoKeywordsRw', 'whatsappShareText']) {
      expect(updateRoute, `update schema missing ${field}`).toContain(field)
    }
    // Unknown keys used to be silently dropped; strict turns that into a 400.
    expect(updateRoute).toContain('}).strict()')
  })

  it('create route persists all new fields', () => {
    for (const field of ['nameRw: data.nameRw', 'shortDescriptionRw: data.shortDescriptionRw', 'descriptionRw: data.descriptionRw', 'suitableFor: data.suitableFor', 'uniqueSellingPoints: data.uniqueSellingPoints', 'seoKeywords: data.seoKeywords', 'seoKeywordsRw: data.seoKeywordsRw', 'whatsappShareText: data.whatsappShareText']) {
      expect(createRoute, `POST mapping missing ${field}`).toContain(field)
    }
  })

  it('exposes all new fields through the public detail allow-list', () => {
    for (const field of ['nameRw: true', 'shortDescriptionRw: true', 'descriptionRw: true', 'suitableFor: true', 'uniqueSellingPoints: true', 'seoKeywords: true', 'seoKeywordsRw: true', 'whatsappShareText: true']) {
      expect(publicSelects, `public select missing ${field}`).toContain(field)
    }
  })

  it('exposes only the bilingual display fields on the lean card allow-list', () => {
    const cardBlock = publicSelects.slice(
      publicSelects.indexOf('PUBLIC_PRODUCT_CARD_SELECT'),
      publicSelects.indexOf('serializePublicProduct'),
    )
    expect(cardBlock).toContain('nameRw: true')
    expect(cardBlock).toContain('shortDescriptionRw: true')
    // Heavy content fields stay off the card payload.
    expect(cardBlock).not.toContain('descriptionRw: true')
    expect(cardBlock).not.toContain('whatsappShareText: true')
  })

  it('declares the new fields on the storefront Product type', () => {
    for (const field of ['nameRw?', 'shortDescriptionRw?', 'descriptionRw?', 'suitableFor?', 'uniqueSellingPoints?', 'seoKeywords?', 'seoKeywordsRw?', 'whatsappShareText?']) {
      expect(typesFile, `types.ts missing ${field}`).toContain(field)
    }
  })
})
