import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getPageMetadata, SEO_CONFIG } from '@/lib/seo-config'

describe('central SEO metadata configuration', () => {
  it('uses truthful Rwanda and Kinyarwanda defaults without ranking claims', () => {
    expect(SEO_CONFIG.defaultLanguage).toBe('rw')
    expect(SEO_CONFIG.defaultTitle.rw).toContain('Ibicuruzwa by’Ubwiza mu Rwanda')
    expect(SEO_CONFIG.defaultDescription.rw).toContain('RWF')
    expect(SEO_CONFIG.defaultDescription.en).toContain('Rwanda')
    expect(SEO_CONFIG.defaultDescription.en).not.toMatch(/#1|best|guaranteed/i)
  })

  it('publishes owner-confirmed contact facts and omits the rest', () => {
    // The owner supplied phone and email on 2026-08-09, so search engines may
    // now be told them. Everything still unverified must stay absent — an
    // invented legalName or geo pin is worse than no answer.
    expect(SEO_CONFIG.organization.email).toBe('freedomcosmeticshop@gmail.com')
    expect(SEO_CONFIG.organization.phone).toBe('+250790215965')

    expect(SEO_CONFIG.organization.legalName).toBeUndefined()
    expect(SEO_CONFIG.organization.sameAs).toEqual([])
    expect(SEO_CONFIG.localBusiness.geo).toBeUndefined()
    expect(SEO_CONFIG.localBusiness.openingHours).toBeUndefined()
    expect(SEO_CONFIG.localBusiness.address.addressLocality).toBe('Kigali')
    expect(SEO_CONFIG.localBusiness.currenciesAccepted).toBe('RWF')
  })

  it('never emits a raw owner placeholder to search engines', () => {
    expect(JSON.stringify(SEO_CONFIG)).not.toContain('OWNER_MUST_ADD_THIS_BEFORE_LAUNCH')
  })

  it('references an asset that actually exists in the repository', () => {
    expect(SEO_CONFIG.organization.logo).toBe(`${SEO_CONFIG.siteUrl}/logo.png`)
    expect(SEO_CONFIG.ogImage).toBe(`${SEO_CONFIG.siteUrl}/og-image.png`)
    expect(SEO_CONFIG.twitterHandle).toBeUndefined()

    // Assert what the test name actually promises: the referenced files are on
    // disk. A string comparison alone would still pass after someone deletes
    // the asset, which is the failure mode this test exists to catch.
    for (const url of [SEO_CONFIG.organization.logo, SEO_CONFIG.ogImage]) {
      const publicPath = join(process.cwd(), 'public', url.replace(SEO_CONFIG.siteUrl, ''))
      expect(existsSync(publicPath), `${publicPath} is missing`).toBe(true)
    }
  })

  it('advertises OG image dimensions social platforms can use', () => {
    // Facebook, WhatsApp and X need explicit width/height plus a raster format;
    // SVG previews are dropped silently.
    expect(SEO_CONFIG.ogImage).toMatch(/\.(png|jpg|jpeg)$/)
    expect(SEO_CONFIG.ogImageWidth).toBe(1200)
    expect(SEO_CONFIG.ogImageHeight).toBe(630)

    const images = getPageMetadata({ path: '/' }).openGraph?.images
    const first = Array.isArray(images) ? images[0] : images
    expect(first).toMatchObject({ width: 1200, height: 630 })
  })

  it('creates canonical Kinyarwanda metadata by default', () => {
    const metadata = getPageMetadata({ path: '/products' })
    expect(metadata.title).toEqual({ absolute: SEO_CONFIG.defaultTitle.rw })
    expect(metadata.description).toBe(SEO_CONFIG.defaultDescription.rw)
    expect(metadata.alternates?.canonical).toBe(`${SEO_CONFIG.siteUrl}/products`)
    expect(metadata.openGraph?.locale).toBe('rw_RW')
    expect(metadata.keywords).toEqual(SEO_CONFIG.keywords.rw)
  })

  it('selects supplied bilingual English metadata without keyword stuffing', () => {
    const metadata = getPageMetadata({
      language: 'en',
      title: { en: 'Skincare in Rwanda', rw: 'Kwita ku ruhu mu Rwanda' },
      description: { en: 'Browse current skincare products.', rw: 'Reba ibita ku ruhu biriho.' },
      path: '/products?category=skincare',
    })
    expect(metadata.title).toEqual({ absolute: 'Skincare in Rwanda' })
    expect(metadata.description).toBe('Browse current skincare products.')
    expect(metadata.openGraph?.locale).toBe('en_RW')
    expect(new Set(SEO_CONFIG.keywords.en).size).toBe(SEO_CONFIG.keywords.en.length)
  })

  it('supports noIndex and does not advertise non-functional language URLs', () => {
    const metadata = getPageMetadata({ path: '/products?search=skin', noIndex: true })
    expect(metadata.robots).toEqual({ index: false, follow: false })
    expect(metadata.alternates?.languages).toBeUndefined()
    expect(JSON.stringify(metadata)).not.toContain('OWNER_MUST_ADD_THIS_BEFORE_LAUNCH')
  })
})
