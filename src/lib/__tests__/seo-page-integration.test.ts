import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const layout = read('src/app/layout.tsx')
const productsPage = read('src/app/products/page.tsx')
const productsClient = read('src/components/products/ProductsPageClient.tsx')
const productPage = read('src/app/products/[slug]/page.tsx')
const wholesale = read('src/app/wholesale/layout.tsx')
const contact = read('src/app/contact/page.tsx')
const terms = read('src/app/terms/layout.tsx')
const privacy = read('src/app/privacy/layout.tsx')
const cart = read('src/app/cart/layout.tsx')
const checkout = read('src/app/checkout/layout.tsx')

describe('SEO page metadata integration', () => {
  it('uses central homepage metadata and truthful global schemas', () => {
    expect(layout).toContain("...getPageMetadata({ path: '/' })")
    expect(layout).toContain('metadataBase: new URL(SEO_CONFIG.siteUrl)')
    expect(layout).toContain('getOrganizationSchema()')
    expect(layout).toContain('getLocalBusinessSchema()')
    expect(layout).toContain('getWebsiteSchema()')
    expect(layout).toContain('<StructuredData data=')
    expect(layout).not.toContain("Rwanda's #1")
  })

  it('adds canonical category metadata and noIndex search metadata', () => {
    expect(productsPage).toContain('export async function generateMetadata')
    expect(productsPage).toContain("const search = firstValue(params.search || params.q)")
    expect(productsPage).toContain('noIndex: true')
    expect(productsPage).toContain('/products?search=${encodedSearch}')
    expect(productsPage).toContain('/products?category=${encodeURIComponent(category)}')
    expect(productsPage).toContain('getBreadcrumbSchema(breadcrumbs)')
  })

  it('preserves the low-data catalogue client and adds a real loaded-product ItemList', () => {
    expect(productsClient).toContain('const LOW_DATA_PAGE_SIZE = 8')
    expect(productsClient).toContain('const NORMAL_PAGE_SIZE = 12')
    expect(productsClient).toContain('getItemListSchema(products.map')
    expect(productsClient).toContain('price: product.price')
    expect(productsClient).toContain('image: image?.url')
    expect(productsClient).toContain('itemListSchema && <StructuredData')
  })

  it('uses database reviews for product ratings and validates real barcodes', () => {
    expect(productPage).toContain('getPageMetadata({')
    expect(productPage).toContain('getProductSchema({')
    expect(productPage).toContain("source: 'database'")
    expect(productPage).toContain('reviews.length > 0')
    expect(productPage).toContain('getKnownGTIN(product.barcode)')
    expect(productPage).toContain('getBreadcrumbSchema([')
    expect(productPage).not.toContain("aggregateRating: reviews.length ? {")
  })

  it('selects and forwards the catalogue size to the product schema', () => {
    // The builder can only emit `size` if the page selects the column and
    // passes it. Asserting the builder alone leaves the wiring untested.
    expect(productPage).toMatch(/select:[\s\S]*?\bsize: true,/)
    expect(productPage).toContain('size: product.size,')
  })

  it('adds unique honest metadata to wholesale, contact, and legal pages', () => {
    for (const source of [wholesale, contact, terms, privacy]) {
      expect(source).toContain('getPageMetadata({')
      expect(source).toContain('path:')
    }
    expect(wholesale).toContain('Unconfigured discounts or credit are not promised.')
    expect(contact).toContain('currently configured ways to contact')
    expect(privacy).not.toContain('Compliant with Rwanda Law')
  })

  it('prevents cart and checkout flows from being indexed', () => {
    for (const source of [cart, checkout]) {
      expect(source).toContain('noIndex: true')
      expect(source).toContain('getPageMetadata({')
    }
  })

  it('marks all newly rendered Kinyarwanda SEO text as verified', () => {
    for (const source of [productsPage, productPage, wholesale, contact, terms, privacy, cart, checkout]) {
      const kinyarwandaLines = source.split('\n').filter((line) => /rw:|name: 'Ahabanza'|name: 'Ibicuruzwa'/.test(line))
      expect(kinyarwandaLines.length).toBeGreaterThan(0)
      expect(kinyarwandaLines.every((line) => line.includes('// verified-rw') || line.trim().endsWith('rw: {'))).toBe(true)
    }
  })
})

describe('breadcrumb trails match the real crawlable hierarchy', () => {
  const blogPage = read('src/app/blog/[slug]/page.tsx')

  it('routes a blog post through the blog index, not straight from home', () => {
    // /blog exists and returns 200, so skipping it published a trail that did
    // not match the site's own structure.
    const trail = blogPage.slice(blogPage.indexOf('getBreadcrumbSchema(['))
    const listed = trail.slice(0, trail.indexOf('])'))
    expect(listed).toContain("{ name: 'Ahabanza', url: '/' }")
    expect(listed).toContain("url: '/blog' }")
    expect(listed.indexOf("url: '/blog' }")).toBeLessThan(listed.indexOf('/blog/${post.slug}'))
  })

  it('keeps the product trail at four levels through its real category', () => {
    const trail = productPage.slice(productPage.indexOf('getBreadcrumbSchema(['))
    const listed = trail.slice(0, trail.indexOf('])'))
    expect(listed).toContain("{ name: 'Ahabanza', url: '/' }")
    expect(listed).toContain("{ name: 'Ibicuruzwa', url: '/products' }")
    expect(listed).toContain('product.category.name')
    expect(listed).toContain('product.category.slug')
  })

  it('adds the category level only when the category is real', () => {
    // An unrecognised ?category= value must not produce a breadcrumb pointing
    // at a shelf that does not exist. The guard now also accepts a category
    // resolved from the database, so shelves outside the hand-written
    // CATEGORY_SEO map (soap, fragrance) still get a crumb.
    const listPage = read('src/app/products/page.tsx')
    expect(listPage).toContain('...(categorySEO || collection')
    expect(listPage).toContain('categorySEO?.label || collection?.name')
  })
})

describe('category shelves are described in the server HTML (Phase 4)', () => {
  const listPage = read('src/app/products/page.tsx')

  it('server-renders the CollectionPage instead of leaving it to the client', () => {
    // ProductsPageClient builds an ItemList too, but it is a client component
    // fetching in useEffect, so that copy never reaches the crawled HTML.
    expect(listPage).toContain('getCollectionPageSchema(collection)')
    expect(listPage).toContain('await getCollection(category)')
    expect(listPage).toContain("from '@/lib/prisma'")
  })

  it('stays silent on an empty shelf', () => {
    // Announcing a collection and then showing nothing is worse than nothing.
    expect(listPage).toContain('if (totalItems === 0) return null')
  })

  it('emits no collection schema on noindex search pages', () => {
    expect(listPage).toContain('const collection = search ? null : await getCollection(category)')
  })

  it('caps the listed sample so a big shelf cannot bloat the page', () => {
    expect(listPage).toContain('const COLLECTION_SAMPLE_SIZE = 20')
    expect(listPage).toContain('take: COLLECTION_SAMPLE_SIZE,')
  })

  it('sends the true shelf size alongside the capped sample', () => {
    expect(listPage).toContain('prisma.product.count({ where })')
    expect(listPage).toContain('totalItems,')
  })
})
