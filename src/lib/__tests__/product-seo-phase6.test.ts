import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getProductSchema } from '@/lib/structured-data'
import { getPageMetadata } from '@/lib/seo-config'

const page = readFileSync('src/app/products/[slug]/page.tsx', 'utf8')

const base = {
  id: 'p1',
  name: 'Test Product',
  slug: 'test-product',
  price: 2000,
  images: ['/a.jpg'],
  stockQuantity: 5,
}

describe('product schema — 23-field additions (Phase 6)', () => {
  it('emits category, weight, keywords and audience when the data exists', () => {
    const schema = getProductSchema({
      ...base,
      description: 'Full paragraph description.',
      category: 'Soap',
      weightGrams: 125,
      keywords: 'papaya soap, brightening, kigali',
      suitableFor: { gender: 'unisex', ageRange: '18+' },
    })
    expect(schema.description).toBe('Full paragraph description.')
    expect(schema.category).toBe('Soap')
    expect(schema.weight).toEqual({ '@type': 'QuantitativeValue', value: 125, unitCode: 'GRM' })
    expect(schema.keywords).toBe('papaya soap, brightening, kigali')
    const audience = schema.audience as Record<string, unknown>
    expect(audience['@type']).toBe('PeopleAudience')
    expect(audience.suggestedAge).toEqual({ '@type': 'QuantitativeValue', minValue: 18 })
  })

  it('omits every new field when the catalogue has no data', () => {
    const schema = getProductSchema({ ...base })
    expect(schema).not.toHaveProperty('category')
    expect(schema).not.toHaveProperty('weight')
    expect(schema).not.toHaveProperty('keywords')
    expect(schema).not.toHaveProperty('audience')
    expect(schema).not.toHaveProperty('description') // base has none
  })

  it('never emits a zero or negative weight', () => {
    expect(getProductSchema({ ...base, weightGrams: 0 })).not.toHaveProperty('weight')
    expect(getProductSchema({ ...base, weightGrams: -5 })).not.toHaveProperty('weight')
    expect(getProductSchema({ ...base, weightGrams: Number.NaN })).not.toHaveProperty('weight')
  })

  it('limits gender to schema.org Male/Female and parses age ranges defensively', () => {
    const male = getProductSchema({ ...base, suitableFor: { gender: 'Male' } }).audience as Record<string, unknown>
    expect(male.suggestedGender).toBe('https://schema.org/Male')
    const female = getProductSchema({ ...base, suitableFor: { gender: 'female' } }).audience as Record<string, unknown>
    expect(female.suggestedGender).toBe('https://schema.org/Female')
    // Unisex has no schema.org gender: omitted rather than invented.
    const unisex = getProductSchema({ ...base, suitableFor: { gender: 'unisex' } })
    expect(unisex).not.toHaveProperty('audience')
    // Only "18+" and "18-45" forms are understood.
    const range = getProductSchema({ ...base, suitableFor: { ageRange: '18-45' } }).audience as Record<string, unknown>
    expect(range.suggestedAge).toEqual({ '@type': 'QuantitativeValue', minValue: 18, maxValue: 45 })
    const nonsense = getProductSchema({ ...base, suitableFor: { ageRange: 'adults only' } })
    expect(nonsense).not.toHaveProperty('audience')
    // Tolerates Prisma JsonValue shapes without crashing.
    const tolerant = getProductSchema({ ...base, suitableFor: { gender: 42, ageRange: null } })
    expect(tolerant).not.toHaveProperty('audience')
  })
})

describe('per-product metadata (Phase 6)', () => {
  it('selects and forwards the new columns to the product schema', () => {
    expect(page).toMatch(/select:[\s\S]*?\bnameRw: true,/)
    expect(page).toContain('descriptionRw: true')
    expect(page).toContain('shortDescriptionRw: true')
    expect(page).toContain('weightGrams: true')
    expect(page).toContain('suitableFor: true')
    expect(page).toContain('seoKeywords: true')
    expect(page).toContain('seoKeywordsRw: true')
    expect(page).toContain('category: product.category.name')
    expect(page).toContain('weightGrams: product.weightGrams ? Number(product.weightGrams) : null')
    expect(page).toContain('keywords: product.seoKeywords')
  })

  it('uses the full description in JSON-LD with the short one as fallback', () => {
    expect(page).toContain('description: product.description || product.shortDescription')
  })

  it('leads the title with the brand when the catalogue knows it', () => {
    expect(page).toContain('const brandPrefix = product.brand?.name ? `${product.brand.name} ` : \'\'')
    expect(page).toContain('en: `${brandPrefix}${product.name} | Buy Online in Rwanda`')
  })

  it('uses nameRw and shortDescriptionRw for the Kinyarwanda metadata with fallbacks', () => {
    expect(page).toContain('product.nameRw?.trim() || product.name')
    expect(page).toContain('const rwShort = product.shortDescriptionRw?.trim()')
    expect(page).toContain('rwShort.slice(0, 160)')
  })

  it('splits the keyword columns into per-language meta keywords', () => {
    expect(page).toContain('splitKeywords(product.seoKeywords)')
    expect(page).toContain('splitKeywords(product.seoKeywordsRw)')
    expect(page).toContain('keywords.en = enKeywords')
    expect(page).toContain('keywords.rw = rwKeywords')
  })
})

describe('getPageMetadata keyword overrides (Phase 6)', () => {
  it('falls back to the global keywords when no override is given', () => {
    const meta = getPageMetadata({ path: '/', language: 'en' })
    expect(meta.keywords).toContain('beauty products Rwanda')
    const metaRw = getPageMetadata({ path: '/' })
    expect(metaRw.keywords).toContain('ibicuruzwa by’ubwiza mu Rwanda')
  })

  it('replaces keywords per language when an override is provided', () => {
    const meta = getPageMetadata({
      path: '/products/x',
      language: 'rw',
      keywords: { rw: ['isabune yumye', 'kwera'] },
    })
    expect(meta.keywords).toEqual(['isabune yumye', 'kwera'])
  })

  it('ignores an empty override array', () => {
    const meta = getPageMetadata({ path: '/', language: 'en', keywords: { en: [] } })
    expect(meta.keywords).toContain('beauty products Rwanda')
  })
})
