import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SEO_CONFIG, getPageMetadata } from '@/lib/seo-config'
import { BUSINESS } from '@/lib/business-config'
import { getOrganizationSchema, getBreadcrumbSchema } from '@/lib/structured-data'

/**
 * The site moved to freedomcosmeticshop.com on 2026-08-15.
 *
 * Before the move, every page on the new domain carried a canonical tag
 * pointing at the old `.vercel.app` host — which told Google to keep indexing
 * the old URL, and pointed at an address that 307-redirects straight back. A
 * canonical/redirect loop is one of the few SEO faults that can quietly cost
 * an entire domain its ranking, so it gets its own guard.
 *
 * These assertions run with whatever NEXT_PUBLIC_APP_URL the environment has.
 * That is intentional: the fallback chain is what production actually used
 * when this broke, and it must be correct on its own.
 */

const CANONICAL_HOST = 'freedomcosmeticshop.com'
const OLD_HOST = 'freedom-cosmetic-shop.vercel.app'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('the canonical domain is the custom domain', () => {
  it('resolves siteUrl to the custom domain', () => {
    expect(SEO_CONFIG.siteUrl).toContain(CANONICAL_HOST)
    expect(SEO_CONFIG.siteUrl).not.toContain(OLD_HOST)
  })

  it('has no trailing slash, so joined paths cannot double up', () => {
    expect(SEO_CONFIG.siteUrl.endsWith('/')).toBe(false)
  })

  it('falls back to the custom domain when the env var is absent', () => {
    // seo-config reads NEXT_PUBLIC_APP_URL first and BUSINESS.url second.
    // Production was running on the fallback when the canonical broke, so the
    // fallback itself has to be right — not just the environment variable.
    expect(BUSINESS.url).toBe(`https://${CANONICAL_HOST}`)
    expect(BUSINESS.domain).toBe(CANONICAL_HOST)
    expect(BUSINESS.adminUrl).toBe(`https://${CANONICAL_HOST}/admin`)
  })
})

describe('canonical URLs use the new domain', () => {
  it('points the canonical link at the custom domain', () => {
    const metadata = getPageMetadata({ path: '/products' })
    expect(metadata.alternates?.canonical).toBe(`https://${CANONICAL_HOST}/products`)
  })

  it('points Open Graph and Twitter at the custom domain', () => {
    const metadata = getPageMetadata({ path: '/products' })
    expect(metadata.openGraph?.url).toBe(`https://${CANONICAL_HOST}/products`)
    expect(JSON.stringify(metadata.openGraph?.images)).toContain(CANONICAL_HOST)
    expect(JSON.stringify(metadata.twitter?.images)).toContain(CANONICAL_HOST)
    expect(JSON.stringify(metadata)).not.toContain(OLD_HOST)
  })

  it('points structured data at the custom domain', () => {
    const organization = getOrganizationSchema()
    expect(organization['@id']).toContain(CANONICAL_HOST)
    expect(organization.url).toContain(CANONICAL_HOST)
    const breadcrumb = getBreadcrumbSchema([{ name: 'Products', url: '/products' }])
    expect(JSON.stringify(breadcrumb)).toContain(CANONICAL_HOST)
    expect(JSON.stringify(breadcrumb)).not.toContain(OLD_HOST)
  })
})

describe('sitemap and robots use the new domain', () => {
  it('builds every sitemap URL from the shared siteUrl', () => {
    // Not a hardcoded host: if this file ever inlines a domain, the migration
    // has to be done twice and one copy will be missed.
    const sitemap = read('src/app/sitemap.ts')
    expect(sitemap).toContain('const baseUrl = SEO_CONFIG.siteUrl')
    expect(sitemap).not.toContain(OLD_HOST)
    expect(sitemap).not.toContain(CANONICAL_HOST)
  })

  it('builds robots Host and Sitemap from the shared siteUrl', () => {
    const robots = read('src/app/robots.ts')
    expect(robots).toContain('${SEO_CONFIG.siteUrl}/sitemap.xml')
    expect(robots).toContain('host: SEO_CONFIG.siteUrl')
    expect(robots).not.toContain(OLD_HOST)
  })

  it('keeps the static public/robots.txt on the same domain', () => {
    // This file is a plain static fallback with no access to SEO_CONFIG, so it
    // is the one place a stale domain can survive a migration. It did: this
    // exact file was missed in the Phase 0 audit and caught by the suite.
    const publicRobots = read('public/robots.txt')
    expect(publicRobots).toContain(`Sitemap: https://${CANONICAL_HOST}/sitemap.xml`)
    expect(publicRobots).toContain(`Host: https://${CANONICAL_HOST}`)
    expect(publicRobots).not.toContain(OLD_HOST)
  })
})

describe('no shipped code still points at the old host', () => {
  it('finds the old host nowhere outside tests, docs and history notes', () => {
    // Swept across every tracked file rather than a hand-written list, so a
    // new file cannot reintroduce the old host unnoticed.
    const tracked = execSync('git ls-files', { cwd: process.cwd(), encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)

    const offenders = tracked.filter((file) => {
      // Docs record history deliberately; test fixtures use the old host as a
      // synthetic request origin, not as a claim about the live site.
      if (file.endsWith('.md')) return false
      if (file.includes('__tests__')) return false
      let contents: string
      try {
        contents = readFileSync(resolve(process.cwd(), file), 'utf8')
      } catch {
        return false
      }
      if (!contents.includes(OLD_HOST)) return false
      // A comment explaining the migration is allowed; executable code is not.
      const code = contents.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(\/\/|#).*$/gm, '')
      return code.includes(OLD_HOST)
    })

    expect(offenders, `these still reference ${OLD_HOST}: ${offenders.join(', ')}`).toEqual([])
  })

  it('proves the sweep is not vacuously passing', () => {
    // If git ls-files returned nothing the check above would pass regardless.
    const tracked = execSync('git ls-files', { cwd: process.cwd(), encoding: 'utf8' }).split('\n').filter(Boolean)
    expect(tracked.length).toBeGreaterThan(100)
    expect(tracked).toContain('src/lib/business-config.ts')
  })
})
