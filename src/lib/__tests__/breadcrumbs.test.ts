import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const breadcrumbs = read('src/components/ui/Breadcrumbs.tsx')
const products = read('src/components/products/ProductsPageClient.tsx')
const productPage = read('src/app/products/[slug]/page.tsx')
const blogPage = read('src/app/blog/[slug]/page.tsx')
const blogContent = read('src/components/blog/BlogPostContent.tsx')
const wholesale = read('src/app/wholesale/page.tsx')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('accessible visible breadcrumbs', () => {
  it('uses translated navigation semantics and identifies the current page', () => {
    expect(breadcrumbs).toContain("aria-label={t('accessibility.breadcrumb')}")
    expect(breadcrumbs).toContain("aria-label={t('nav.home')}")
    expect(breadcrumbs).toContain('aria-current="page"')
    expect(breadcrumbs).toContain('<ol')
    expect(breadcrumbs).toContain('<li')
    expect(breadcrumbs).not.toContain('aria-label="Breadcrumb"')
  })

  it('provides practical touch targets and hides decorative icons', () => {
    expect(breadcrumbs).toContain('min-h-11 min-w-11')
    expect(breadcrumbs).toContain('flex min-h-11')
    expect(breadcrumbs.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(2)
    expect(breadcrumbs).toContain('sr-only')
  })

  it('filters invalid and duplicate-home items without hiding keyword text', () => {
    expect(breadcrumbs).toContain("item.name.trim() && item.url.trim() && item.url !== '/'")
    expect(breadcrumbs).not.toContain('className="hidden')
  })

  it('renders catalogue breadcrumbs using the active translated category', () => {
    expect(products).toContain('CATEGORY_TRANSLATION_KEYS')
    expect(products).toContain("{ name: t('nav.products'), url: '/products' }")
    expect(products).toContain('<Breadcrumbs items={breadcrumbItems} />')
  })

  it('renders product, blog, and wholesale breadcrumbs', () => {
    expect(productPage).toContain('<Breadcrumbs items={[')
    expect(productPage).toContain('product.category.name')
    expect(blogContent).toContain('<Breadcrumbs items={[')
    expect(blogPage).toContain('getBreadcrumbSchema([')
    expect(wholesale).toContain("name: t('nav.wholesale')")
  })

  it('provides English and verified Kinyarwanda breadcrumb labels', () => {
    expect(english).toMatch(/breadcrumb: 'Breadcrumb'/)
    expect(kinyarwanda).toMatch(/breadcrumb:.*\/\/ verified-rw/)
  })
})
