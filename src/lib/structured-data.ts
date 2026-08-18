import { BUSINESS } from './business-config'
import { SEO_CONFIG } from './seo-config'

export type StructuredDataObject = Record<string, unknown>

type KnownGTIN = {
  value: string
  type: 'gtin8' | 'gtin12' | 'gtin13' | 'gtin14'
}

type DatabaseAggregateRating = {
  average: number
  count: number
  source: 'database'
}

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value
  return `${SEO_CONFIG.siteUrl}${value.startsWith('/') ? value : `/${value}`}`
}

function validPrice(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function validGTIN(gtin: KnownGTIN | undefined) {
  if (!gtin) return undefined
  const expectedLength = Number(gtin.type.replace('gtin', ''))
  const normalized = gtin.value.replace(/\D/g, '')
  return normalized.length === expectedLength ? { [gtin.type]: normalized } : undefined
}

/** Organization schema containing only owner-confirmed public facts. */
export function getOrganizationSchema(): StructuredDataObject {
  const organization = SEO_CONFIG.organization
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SEO_CONFIG.siteUrl}/#organization`,
    name: organization.name,
    ...(organization.legalName ? { legalName: organization.legalName } : {}),
    url: organization.url,
    logo: organization.logo,
    // The same factual catalogue description the site uses elsewhere. No
    // "Rwanda's leading cosmetics store" — that is an unprovable superlative,
    // and the brief's own wording for it would be a claim the owner has not
    // substantiated.
    description: BUSINESS.description,
    ...(organization.email ? { email: organization.email } : {}),
    ...(organization.phone ? {
      telephone: organization.phone,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: organization.phone,
        contactType: 'customer service',
        availableLanguage: ['Kinyarwanda', 'English'],
        areaServed: 'RW',
      },
    } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS.address.city,
      // Owner-confirmed sector. Already published on the Store schema; the two
      // address blocks should not disagree with each other.
      ...(SEO_CONFIG.localBusiness.address.addressRegion
        ? { addressRegion: SEO_CONFIG.localBusiness.address.addressRegion }
        : {}),
      addressCountry: 'RW',
    },
    ...(organization.sameAs.length > 0 ? { sameAs: [...organization.sameAs] } : {}),
  }
}

/** Kigali store schema without invented street, geo, hours, or price range. */
export function getLocalBusinessSchema(): StructuredDataObject {
  const local = SEO_CONFIG.localBusiness
  const address = local.address
  return {
    '@context': 'https://schema.org',
    '@type': local.type,
    '@id': `${SEO_CONFIG.siteUrl}/#store`,
    name: local.name,
    image: local.image,
    url: SEO_CONFIG.siteUrl,
    ...(SEO_CONFIG.organization.phone ? { telephone: SEO_CONFIG.organization.phone } : {}),
    ...(SEO_CONFIG.organization.email ? { email: SEO_CONFIG.organization.email } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: address.addressLocality,
      addressCountry: address.addressCountry,
      ...(address.streetAddress ? { streetAddress: address.streetAddress } : {}),
      ...(address.addressRegion ? { addressRegion: address.addressRegion } : {}),
    },
    paymentAccepted: local.paymentAccepted.join(', '),
    currenciesAccepted: local.currenciesAccepted,
    areaServed: {
      '@type': 'Country',
      name: 'Rwanda',
    },
  }
}

/** Website schema whose SearchAction points to the real product-search URL. */
export function getWebsiteSchema(): StructuredDataObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SEO_CONFIG.siteUrl}/#website`,
    name: SEO_CONFIG.siteName,
    url: SEO_CONFIG.siteUrl,
    inLanguage: ['rw-RW', 'en-RW'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SEO_CONFIG.siteUrl}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Delivery rates published to Google.
 *
 * Mirrors the real zone table in src/server/services/delivery.service.ts,
 * which is also what /api/delivery/calculate returns and what the DB
 * DeliveryZoneSettings rows hold — all three agree on FEES. A single flat rate
 * would under-quote every shopper outside Kigali by 2,000–3,000 RWF.
 *
 * Google's OfferShippingDetails takes one region per entry, so each zone is
 * emitted separately with its own districts under addressRegion.
 *
 * Transit times come from delivery.service.ts / DeliveryZoneSettings, NOT from
 * the DELIVERY_TIMES map in src/lib/constants.ts. Those two disagree (constants
 * claims 3-5 days for Eastern where the service and the database both say 3),
 * and the service is what the live API actually answers with.
 */
const SHIPPING_ZONES = [
  { regions: ['Kigali City'], fee: 1000, minDays: 0, maxDays: 1 },
  { regions: ['Northern Province', 'Southern Province'], fee: 3000, minDays: 2, maxDays: 3 },
  { regions: ['Eastern Province'], fee: 3500, minDays: 2, maxDays: 3 },
  { regions: ['Western Province'], fee: 4000, minDays: 3, maxDays: 4 },
] as const

/** Orders at or above this RWF subtotal ship free, in every zone. */
const FREE_SHIPPING_THRESHOLD = 50000

/** Days a price is advertised as valid. Google warns when priceValidUntil is absent. */
const PRICE_VALID_DAYS = 30

function getShippingDetails(price: number): StructuredDataObject[] {
  // Every zone ships free at or above the threshold. When a single unit
  // already clears it, quoting the paid rate would overstate the cost.
  const freeAtThisPrice = validPrice(price) && price >= FREE_SHIPPING_THRESHOLD
  return SHIPPING_ZONES.map((zone) => ({
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: freeAtThisPrice ? 0 : zone.fee,
      currency: 'RWF',
    },
    shippingDestination: zone.regions.map((region) => ({
      '@type': 'DefinedRegion',
      addressCountry: 'RW',
      addressRegion: region,
    })),
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      // Orders are confirmed over WhatsApp before dispatch, so same-day is
      // possible but not promised: handling is 0-1 days.
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: 0,
        maxValue: 1,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: zone.minDays,
        maxValue: zone.maxDays,
        unitCode: 'DAY',
      },
    },
  }))
}

/**
 * Return policy, stating only what the published FAQ actually commits to.
 *
 * The FAQ says unopened, unused products may be eligible within 7 days, and
 * that opened personal-care items normally cannot be returned at all for
 * hygiene reasons. So: a 7-day finite window, and nothing more.
 *
 * returnMethod and returnFees are deliberately OMITTED. The shop delivers by
 * courier and takes orders on WhatsApp — there is no mail-return process — and
 * nothing anywhere promises free returns. Publishing either would be a
 * commitment to Google, and to customers, that the owner has not made.
 */
function getReturnPolicy(): StructuredDataObject {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'RW',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 7,
  }
}

/**
 * Product schema. Aggregate ratings require an explicit database source marker;
 * callers must pass values calculated from real approved reviews.
 */
export function getProductSchema(product: {
  id: string
  name: string
  slug: string
  description?: string | null
  price: number
  images: string[]
  stockQuantity: number
  sku?: string | null
  brand?: { name: string } | null
  aggregateRating?: DatabaseAggregateRating
  gtin?: KnownGTIN
  /** Physical size, e.g. "225 ml". Real on 107 of 116 live products. */
  size?: string | null
  /** Reference date for priceValidUntil. Injected so tests are deterministic. */
  now?: Date
}): StructuredDataObject {
  const productUrl = `${SEO_CONFIG.siteUrl}/products/${encodeURIComponent(product.slug)}`
  const images = product.images.filter(Boolean).map(absoluteUrl)
  const gtin = validGTIN(product.gtin)
  const rating = product.aggregateRating
  const hasRealRating = rating?.source === 'database'
    && Number.isFinite(rating.average)
    && rating.average >= 1
    && rating.average <= 5
    && Number.isInteger(rating.count)
    && rating.count > 0

  // 30 days out, date-only. Google warns when an Offer has no priceValidUntil.
  const validUntil = new Date(product.now ? product.now.getTime() : Date.now())
  validUntil.setUTCDate(validUntil.getUTCDate() + PRICE_VALID_DAYS)
  const priceValidUntil = validUntil.toISOString().slice(0, 10)

  const size = product.size?.trim()

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    // Our SKU is also our manufacturer part number: there is no separate MPN
    // in the catalogue and no barcode on any live product, so this is the only
    // stable identifier Google can match on. Emitted only when a SKU exists.
    ...(product.sku ? { mpn: product.sku } : {}),
    ...(gtin || {}),
    url: productUrl,
    ...(product.brand?.name ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
    ...(size ? { size } : {}),
    ...(validPrice(product.price) ? {
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'RWF',
        price: product.price,
        priceValidUntil,
        availability: product.stockQuantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          '@id': `${SEO_CONFIG.siteUrl}/#organization`,
          name: SEO_CONFIG.siteName,
        },
        shippingDetails: getShippingDetails(product.price),
        hasMerchantReturnPolicy: getReturnPolicy(),
      },
    } : {}),
    ...(hasRealRating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(rating.average.toFixed(1)),
        reviewCount: rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  }
}

export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>): StructuredDataObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.filter((item) => item.name.trim() && item.url.trim()).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  }
}

/** FAQ schema must be rendered only where the same questions and answers are visible. */
export function getFAQSchema(faqs: Array<{ question: string; answer: string }>): StructuredDataObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.filter((faq) => faq.question.trim() && faq.answer.trim()).map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

export function getArticleSchema(article: {
  title: string
  description: string
  slug: string
  publishedAt: string
  updatedAt?: string
  image?: string | null
  author?: string | null
}): StructuredDataObject {
  const articleUrl = `${SEO_CONFIG.siteUrl}/blog/${encodeURIComponent(article.slug)}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${articleUrl}#article`,
    headline: article.title,
    description: article.description,
    image: absoluteUrl(article.image || SEO_CONFIG.ogImage),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: article.author
      ? { '@type': 'Person', name: article.author }
      : { '@type': 'Organization', '@id': `${SEO_CONFIG.siteUrl}/#organization`, name: SEO_CONFIG.siteName },
    publisher: {
      '@type': 'Organization',
      '@id': `${SEO_CONFIG.siteUrl}/#organization`,
      name: SEO_CONFIG.siteName,
      logo: {
        '@type': 'ImageObject',
        url: SEO_CONFIG.organization.logo,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
  }
}

/**
 * Category shelf as a CollectionPage wrapping an ItemList.
 *
 * Built on the server from the database, unlike the client-side ItemList in
 * ProductsPageClient, which is assembled inside a useEffect after a fetch and
 * therefore never appears in the HTML Google crawls.
 *
 * `numberOfItems` is the TOTAL live products on the shelf, while
 * itemListElement carries only the entries passed in. That is the correct
 * reading of ItemList for a paginated collection: the list is a sample, the
 * count is the truth.
 */
export function getCollectionPageSchema(collection: {
  name: string
  url: string
  description?: string | null
  totalItems: number
  items: Array<{ name: string; url: string; image?: string | null; price?: number }>
}): StructuredDataObject {
  const url = absoluteUrl(collection.url)
  const itemList = getItemListSchema(collection.items)
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name: collection.name,
    ...(collection.description ? { description: collection.description } : {}),
    url,
    isPartOf: { '@id': `${SEO_CONFIG.siteUrl}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: collection.totalItems,
      itemListElement: itemList.itemListElement,
    },
  }
}

export function getItemListSchema(items: Array<{
  name: string
  url: string
  image?: string | null
  price?: number
}>): StructuredDataObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.filter((item) => item.name.trim() && item.url.trim()).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: item.name,
        url: absoluteUrl(item.url),
        ...(item.image ? { image: absoluteUrl(item.image) } : {}),
        ...(validPrice(item.price) ? {
          offers: {
            '@type': 'Offer',
            price: item.price,
            priceCurrency: 'RWF',
          },
        } : {}),
      },
    })),
  }
}
