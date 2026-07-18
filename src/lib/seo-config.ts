import type { Metadata } from 'next'
import { BUSINESS, hasSocial } from './business-config'

export type SEOLanguage = 'en' | 'rw'
export type LocalizedSEOText = { en: string; rw: string }

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function isConfigured(value: string | null | undefined): value is string {
  return Boolean(value && !value.includes('TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH'))
}

function absoluteUrl(siteUrl: string, value: string) {
  if (/^https?:\/\//i.test(value)) return value
  return `${siteUrl}${value.startsWith('/') ? value : `/${value}`}`
}

const siteUrl = withoutTrailingSlash(process.env.NEXT_PUBLIC_APP_URL || BUSINESS.url)
const verifiedSocialUrls = (Object.keys(BUSINESS.social) as Array<keyof typeof BUSINESS.social>)
  .filter((platform) => hasSocial(platform))
  .map((platform) => BUSINESS.social[platform])
  .filter((value): value is string => Boolean(value))

/**
 * FreedomCosmeticShop SEO configuration.
 *
 * Central source for truthful metadata defaults. Unconfigured legal identity,
 * contact, address, hours, geo, social, GTIN, and handle values are omitted
 * rather than replaced with SEO placeholders.
 */
export const SEO_CONFIG = {
  siteName: BUSINESS.name,
  siteUrl,
  defaultLanguage: 'rw' as const,
  supportedLanguages: ['rw', 'en'] as const,

  defaultTitle: {
    en: 'FreedomCosmeticShop | Beauty Products in Rwanda',
    rw: 'FreedomCosmeticShop | Ibicuruzwa by’Ubwiza mu Rwanda', // verified-rw
  },
  titleTemplate: {
    en: `%s | ${BUSINESS.name}`,
    rw: `%s | ${BUSINESS.name}`, // verified-rw
  },
  defaultDescription: {
    en: 'Shop skincare, makeup and haircare online in Rwanda. View current prices in RWF, payment options, and delivery information for Kigali and districts across Rwanda.',
    rw: 'Gura ibita ku ruhu, ibikoresho byo kwisiga n’ibita ku musatsi kuri interineti mu Rwanda. Reba ibiciro biriho mu RWF, uburyo bwo kwishyura n’amakuru yo kubigeza muri Kigali no mu turere tw’u Rwanda.', // verified-rw
  },
  keywords: {
    en: [
      'beauty products Rwanda',
      'cosmetics Kigali',
      'skincare Rwanda',
      'makeup Rwanda',
      'haircare Rwanda',
      'online beauty shop Rwanda',
      'RWF beauty products',
    ],
    rw: [
      'ibicuruzwa by’ubwiza mu Rwanda', // verified-rw
      'ibita ku ruhu muri Kigali', // verified-rw
      'ibikoresho byo kwisiga mu Rwanda', // verified-rw
      'ibita ku musatsi mu Rwanda', // verified-rw
      'iduka ry’ubwiza kuri interineti', // verified-rw
      'FreedomCosmeticShop',
    ],
  },

  organization: {
    name: BUSINESS.name,
    legalName: isConfigured(BUSINESS.legalName) ? BUSINESS.legalName : undefined,
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`,
    email: isConfigured(BUSINESS.email) ? BUSINESS.email : undefined,
    phone: isConfigured(BUSINESS.phone) ? BUSINESS.phone : undefined,
    sameAs: verifiedSocialUrls,
  },

  localBusiness: {
    type: 'Store' as const,
    name: BUSINESS.tradingName,
    image: `${siteUrl}/logo.svg`,
    address: {
      addressLocality: BUSINESS.address.city,
      addressCountry: 'RW',
      streetAddress: isConfigured(BUSINESS.address.street) ? BUSINESS.address.street : undefined,
      addressRegion: isConfigured(BUSINESS.address.district) ? BUSINESS.address.district : undefined,
    },
    // Exact coordinates and opening hours remain absent until owner-confirmed.
    geo: undefined,
    openingHours: undefined,
    paymentAccepted: ['MTN Mobile Money', 'Airtel Money', 'Visa', 'Mastercard', 'Cash on Delivery'],
    currenciesAccepted: 'RWF',
  },

  // The repository currently has a real SVG logo but no verified 1200×630 OG asset.
  ogImage: `${siteUrl}/logo.svg`,
  twitterHandle: undefined,
} as const

export function getPageMetadata({
  title,
  description,
  path = '',
  image,
  language = SEO_CONFIG.defaultLanguage,
  noIndex = false,
}: {
  title?: LocalizedSEOText | string
  description?: LocalizedSEOText | string
  path?: string
  image?: string
  language?: SEOLanguage
  noIndex?: boolean
} = {}): Metadata {
  const lang: SEOLanguage = language === 'en' ? 'en' : 'rw'
  const finalTitle = typeof title === 'string'
    ? title
    : title?.[lang] || SEO_CONFIG.defaultTitle[lang]
  const finalDescription = typeof description === 'string'
    ? description
    : description?.[lang] || SEO_CONFIG.defaultDescription[lang]
  const canonical = absoluteUrl(SEO_CONFIG.siteUrl, path || '/')
  const socialImage = absoluteUrl(SEO_CONFIG.siteUrl, image || SEO_CONFIG.ogImage)

  return {
    title: { absolute: finalTitle },
    description: finalDescription,
    keywords: [...SEO_CONFIG.keywords[lang]],
    alternates: {
      canonical,
      // Language alternates are intentionally omitted until distinct crawlable
      // rw/en URLs render the requested language on the server.
    },
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      url: canonical,
      siteName: SEO_CONFIG.siteName,
      locale: lang === 'rw' ? 'rw_RW' : 'en_RW',
      type: 'website',
      images: [{ url: socialImage, alt: finalTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: finalDescription,
      images: [socialImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    formatDetection: {
      telephone: false,
      email: false,
      address: false,
    },
  }
}
