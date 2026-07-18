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

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(gtin || {}),
    url: productUrl,
    ...(product.brand?.name ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
    ...(validPrice(product.price) ? {
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'RWF',
        price: product.price,
        availability: product.stockQuantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          '@id': `${SEO_CONFIG.siteUrl}/#organization`,
          name: SEO_CONFIG.siteName,
        },
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
