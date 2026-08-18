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
  it('publishes confirmed contact points and omits unconfigured legal or social values', () => {
    const schema = getOrganizationSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Organization')

    // Owner-confirmed 2026-08-09, so these are safe to publish.
    expect(schema).toHaveProperty('telephone', '+250790215965')
    expect(schema).toHaveProperty('email', 'freedomcosmeticshop@gmail.com')

    // Still unverified — must never be invented for schema.org.
    expect(schema).not.toHaveProperty('legalName')
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

describe('product offers carry real shipping, return and validity data', () => {
  const base = {
    id: 'p1',
    name: 'Test Product',
    slug: 'test-product',
    price: 2000,
    images: ['/a.jpg'],
    stockQuantity: 5,
    sku: 'FCS-001',
    now: new Date('2026-08-18T00:00:00Z'),
  }
  const offersOf = (schema: Record<string, unknown>) =>
    schema.offers as Record<string, unknown>

  it('quotes every real delivery zone, not one flat national rate', () => {
    const zones = offersOf(getProductSchema(base)).shippingDetails as Array<Record<string, any>>
    expect(zones).toHaveLength(4)
    // Verified against src/server/services/delivery.service.ts, the live
    // /api/delivery/calculate response, and the DeliveryZoneSettings rows.
    expect(zones.map((zone) => zone.shippingRate.value)).toEqual([1000, 3000, 3500, 4000])
    const regions = zones.flatMap((zone) => zone.shippingDestination.map((d: any) => d.addressRegion))
    expect(regions).toEqual([
      'Kigali City', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province',
    ])
    for (const zone of zones) {
      expect(zone.shippingRate.currency).toBe('RWF')
      for (const destination of zone.shippingDestination) {
        expect(destination.addressCountry).toBe('RW')
      }
    }
  })

  it('drops the shipping fee to zero once the order clears the free threshold', () => {
    const zones = offersOf(getProductSchema({ ...base, price: 50000 }))
      .shippingDetails as Array<Record<string, any>>
    expect(zones.map((zone) => zone.shippingRate.value)).toEqual([0, 0, 0, 0])
    // Just below the threshold the real rates must return.
    const under = offersOf(getProductSchema({ ...base, price: 49999 }))
      .shippingDetails as Array<Record<string, any>>
    expect(under.map((zone) => zone.shippingRate.value)).toEqual([1000, 3000, 3500, 4000])
  })

  it('publishes transit times that match the delivery service, not constants.ts', () => {
    const zones = offersOf(getProductSchema(base)).shippingDetails as Array<Record<string, any>>
    expect(zones.map((zone) => [
      zone.deliveryTime.transitTime.minValue,
      zone.deliveryTime.transitTime.maxValue,
    ])).toEqual([[0, 1], [2, 3], [2, 3], [3, 4]])
    for (const zone of zones) {
      expect(zone.deliveryTime.handlingTime.unitCode).toBe('DAY')
      expect(zone.deliveryTime.transitTime.unitCode).toBe('DAY')
    }
  })

  it('states only the return terms the published FAQ actually commits to', () => {
    const policy = offersOf(getProductSchema(base)).hasMerchantReturnPolicy as Record<string, unknown>
    expect(policy.merchantReturnDays).toBe(7)
    expect(policy.applicableCountry).toBe('RW')
    expect(policy.returnPolicyCategory).toBe('https://schema.org/MerchantReturnFiniteReturnWindow')
    // The shop delivers by courier and takes orders on WhatsApp: there is no
    // mail-return process, and nothing on the site promises free returns.
    // Claiming either would be a commitment the owner never made.
    expect(policy).not.toHaveProperty('returnMethod')
    expect(policy).not.toHaveProperty('returnFees')
  })

  it('advertises a 30-day price validity window', () => {
    expect(offersOf(getProductSchema(base)).priceValidUntil).toBe('2026-09-17')
  })

  it('falls back to the SKU for mpn, and omits both when there is no SKU', () => {
    // No live product has a barcode, so the SKU is the only stable identifier
    // Google can match on.
    expect(getProductSchema(base).mpn).toBe('FCS-001')
    const noSku = getProductSchema({ ...base, sku: null })
    expect(noSku).not.toHaveProperty('mpn')
    expect(noSku).not.toHaveProperty('sku')
  })

  it('emits size only when the catalogue really has one', () => {
    expect(getProductSchema({ ...base, size: '225 ml' }).size).toBe('225 ml')
    expect(getProductSchema(base)).not.toHaveProperty('size')
    expect(getProductSchema({ ...base, size: '   ' })).not.toHaveProperty('size')
  })

  it('still refuses to invent a brand or a rating', () => {
    const schema = getProductSchema(base)
    expect(schema).not.toHaveProperty('brand')
    expect(schema).not.toHaveProperty('aggregateRating')
  })

  it('keeps availability tied to real stock', () => {
    expect(offersOf(getProductSchema(base)).availability).toBe('https://schema.org/InStock')
    expect(offersOf(getProductSchema({ ...base, stockQuantity: 0 })).availability)
      .toBe('https://schema.org/OutOfStock')
  })

  it('omits the whole offer block when the price is invalid', () => {
    expect(getProductSchema({ ...base, price: Number.NaN })).not.toHaveProperty('offers')
  })
})
