import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getArticleSchema,
  getBreadcrumbSchema,
  getFAQSchema,
  getItemListSchema,
  getLocalBusinessSchema,
  getOrganizationSchema,
  getProductSchema,
  getWebsiteSchema,
} from '@/lib/structured-data'
import { SEO_CONFIG } from '@/lib/seo-config'

const component = readFileSync(resolve(process.cwd(), 'src/components/seo/StructuredData.tsx'), 'utf8')

describe('honest Rwanda structured data', () => {
  it('omits unconfigured organization contact, legal, and social values', () => {
    const schema = getOrganizationSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Organization')
    expect(schema).not.toHaveProperty('legalName')
    expect(schema).not.toHaveProperty('telephone')
    expect(schema).not.toHaveProperty('email')
    expect(schema).not.toHaveProperty('sameAs')
    expect(JSON.stringify(schema)).not.toContain('OWNER_MUST_ADD_THIS_BEFORE_LAUNCH')
  })

  it('describes the Kigali store without invented geo, hours, or price range', () => {
    const schema = getLocalBusinessSchema()
    const address = schema.address as Record<string, unknown>
    expect(schema['@type']).toBe('Store')
    expect(address.addressLocality).toBe('Kigali')
    expect(address.addressCountry).toBe('RW')
    expect(schema.currenciesAccepted).toBe('RWF')
    expect(schema).not.toHaveProperty('geo')
    expect(schema).not.toHaveProperty('openingHoursSpecification')
    expect(schema).not.toHaveProperty('priceRange')
  })

  it('points SearchAction to the real product-search query', () => {
    const schema = getWebsiteSchema()
    const action = schema.potentialAction as Record<string, unknown>
    const target = action.target as Record<string, unknown>
    expect(target.urlTemplate).toBe(`${SEO_CONFIG.siteUrl}/products?search={search_term_string}`)
    expect(action['query-input']).toBe('required name=search_term_string')
  })

  it('never emits aggregateRating without real database review evidence', () => {
    const base = {
      id: 'product-1', name: 'Test Product', slug: 'test-product', price: 5000,
      images: ['/logo.svg'], stockQuantity: 2,
    }
    expect(getProductSchema(base)).not.toHaveProperty('aggregateRating')
    expect(getProductSchema({ ...base, aggregateRating: { average: 5, count: 0, source: 'database' as const } })).not.toHaveProperty('aggregateRating')
    expect(getProductSchema({ ...base, aggregateRating: { average: 8, count: 2, source: 'database' as const } })).not.toHaveProperty('aggregateRating')
  })

  it('emits RWF offers and ratings only for valid real values', () => {
    const schema = getProductSchema({
      id: 'product-1', name: 'Test Product', slug: 'test-product', price: 5000,
      images: ['/logo.svg'], stockQuantity: 2, brand: { name: 'Test Brand' },
      aggregateRating: { average: 4.25, count: 3, source: 'database' },
      gtin: { type: 'gtin13', value: '1234567890123' },
    })
    const offer = schema.offers as Record<string, unknown>
    const rating = schema.aggregateRating as Record<string, unknown>
    expect(offer.priceCurrency).toBe('RWF')
    expect(offer.price).toBe(5000)
    expect(rating.ratingValue).toBe(4.3)
    expect(rating.reviewCount).toBe(3)
    expect(schema.gtin13).toBe('1234567890123')
  })

  it('omits invalid prices and unknown barcode lengths rather than inventing values', () => {
    const schema = getProductSchema({
      id: 'product-1', name: 'Test Product', slug: 'test-product', price: Number.NaN,
      images: [], stockQuantity: 0, gtin: { type: 'gtin13', value: '1234' },
    })
    expect(schema).not.toHaveProperty('offers')
    expect(schema).not.toHaveProperty('gtin13')
    expect(JSON.stringify(schema)).not.toContain('priceValidUntil')
  })

  it('builds ordered breadcrumb, FAQ, article, and RWF item-list schemas', () => {
    const breadcrumb = getBreadcrumbSchema([{ name: 'Products', url: '/products' }])
    expect((breadcrumb.itemListElement as Array<Record<string, unknown>>)[0]).toMatchObject({ position: 1, name: 'Products' })

    const faq = getFAQSchema([{ question: 'Do you deliver?', answer: 'Delivery options are shown at checkout.' }])
    expect((faq.mainEntity as Array<Record<string, unknown>>)[0].name).toBe('Do you deliver?')

    const article = getArticleSchema({ title: 'Guide', description: 'Guide description', slug: 'guide', publishedAt: '2026-01-01T00:00:00.000Z' })
    expect(article.publisher).toBeTruthy()
    expect(article.datePublished).toBe('2026-01-01T00:00:00.000Z')

    const list = getItemListSchema([{ name: 'Product', url: '/products/product', price: 2500 }])
    const listItem = (list.itemListElement as Array<Record<string, unknown>>)[0]
    const product = listItem.item as Record<string, unknown>
    expect((product.offers as Record<string, unknown>).priceCurrency).toBe('RWF')
  })

  it('escapes script-closing characters in the JSON-LD renderer', () => {
    expect(component).toContain("JSON.stringify(schema).replace(/</g, '\\\\u003c')")
    expect(component).toContain('type="application/ld+json"')
    expect(component).not.toContain("'use client'")
  })
})
