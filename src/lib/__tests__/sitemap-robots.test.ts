import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import robots from '@/app/robots'
import { SEO_CONFIG } from '@/lib/seo-config'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const sitemapSource = read('src/app/sitemap.ts')
const robotsSource = read('src/app/robots.ts')
const publicRobots = read('public/robots.txt')

describe('dynamic sitemap and robots policy', () => {
  it('uses the central canonical site URL for both discovery files', () => {
    expect(sitemapSource).toContain("import { SEO_CONFIG } from '@/lib/seo-config'")
    expect(robotsSource).toContain("import { SEO_CONFIG } from '@/lib/seo-config'")
    const value = robots()
    expect(value.sitemap).toBe(`${SEO_CONFIG.siteUrl}/sitemap.xml`)
    expect(value.host).toBe(SEO_CONFIG.siteUrl)
  })

  it('includes only real static public routes and omits private flows', () => {
    for (const route of ['/products', '/bundles', '/wholesale', '/quiz', '/shipping', '/returns', '/contact', '/faq', '/support/whatsapp', '/privacy', '/terms']) {
      expect(sitemapSource).toContain(`\${baseUrl}${route}`)
    }
    for (const route of ['/about', '/blog`', '/account', '/cart', '/checkout', '/admin']) {
      expect(sitemapSource).not.toContain(`\${baseUrl}${route}`)
    }
  })

  it('uses real database state for dynamic product, category, blog, and bundle URLs', () => {
    expect(sitemapSource).toContain('isActive: true, isDeleted: false')
    expect(sitemapSource).toContain("status: 'PUBLISHED', isDeleted: false")
    expect(sitemapSource).toContain('where: { isActive: true, deletedAt: null }')
    expect(sitemapSource).toContain('/products/${encodeURIComponent(item.slug)}')
    expect(sitemapSource).toContain('/products?category=${encodeURIComponent(item.slug)}')
    expect(sitemapSource).toContain('/blog/${encodeURIComponent(item.slug)}')
    expect(sitemapSource).toContain('/bundles/${encodeURIComponent(item.slug)}')
  })

  it('does not pretend static pages changed on every sitemap request', () => {
    expect(sitemapSource).not.toContain('const now = new Date()')
    expect(sitemapSource).not.toMatch(/staticRoutes[\s\S]*lastModified: now/)
    expect(sitemapSource).toContain('lastModified: item.updatedAt')
    expect(sitemapSource).toContain('return staticRoutes')
  })

  it('allows public crawling while blocking private and search-result paths', () => {
    const value = robots()
    const general = Array.isArray(value.rules) ? value.rules.find((rule) => rule.userAgent === '*') : value.rules
    expect(general?.allow).toBe('/')
    expect(general?.disallow).toEqual(expect.arrayContaining([
      '/admin', '/account', '/api', '/cart', '/checkout', '/login', '/register',
      '/*?*search=*', '/*?*q=*', '/*?*utm_*',
    ]))
  })

  it('applies the requested AI crawler policy without blocking Google or Bing', () => {
    const value = robots()
    const rules = Array.isArray(value.rules) ? value.rules : [value.rules]
    expect(rules).toContainEqual({ userAgent: 'GPTBot', disallow: '/' })
    expect(rules).toContainEqual({ userAgent: 'CCBot', disallow: '/' })
    expect(JSON.stringify(rules)).not.toContain('Googlebot')
    expect(JSON.stringify(rules)).not.toContain('Bingbot')
  })

  it('keeps the public fallback robots file aligned with generated policy', () => {
    for (const directive of ['Disallow: /admin', 'Disallow: /account', 'Disallow: /api', 'Disallow: /cart', 'User-agent: GPTBot', 'User-agent: CCBot', `Sitemap: ${SEO_CONFIG.siteUrl}/sitemap.xml`]) {
      expect(publicRobots).toContain(directive)
    }
  })
})
