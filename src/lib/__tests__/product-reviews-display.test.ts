import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const component = read('src/components/reviews/ProductReviews.tsx')
const tabs = read('src/components/products/ProductTabs.tsx')
const api = read('src/app/api/reviews/product/[productId]/route.ts')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

describe('real verified product review display', () => {
  it('replaces the legacy review panel on the active product page', () => {
    expect(tabs).toContain("import ProductReviews from '@/components/reviews/ProductReviews'")
    expect(tabs).toContain("active === 'reviews' && <ProductReviews productId={product.id} productSlug={product.slug} />")
    expect(tabs).not.toContain('fetch(`/api/reviews?productId=')
  })

  it('shows only database-derived totals, averages, distribution and pagination', () => {
    expect(component).toContain('data.stats.averageRating.toFixed(1)')
    expect(component).toContain("t('reviews.real_count', { count: data.stats.totalReviews })")
    expect(component).toContain('data.distribution.breakdown.map')
    expect(component).toContain('data.page < data.pages')
    expect(component).not.toContain('DEFAULT_REVIEWS')
    expect(component).not.toContain('Math.random')
  })

  it('supports sorting, star filters, metadata, photos and public merchant responses', () => {
    for (const term of ["value=\"helpful\"", "value=\"recent\"", "value=\"rating_high\"", "value=\"rating_low\"", 'review.photos.map', 'review.skinType', 'review.hairType', 'review.shadeMatched', 'review.merchantResponse']) expect(component).toContain(term)
    expect(api).toContain("isVerified: true")
    expect(api).toContain("isHidden: false")
  })

  it('uses durable voting and reporting without automatic hiding', () => {
    expect(component).toContain('/vote`')
    expect(component).toContain('/report`')
    expect(component).toContain("reportReasons = ['SPAM','ABUSE','PRIVACY','IRRELEVANT','OTHER']")
    expect(component).not.toContain('prompt(')
    expect(component).not.toContain('isHidden')
  })

  it('uses mobile touch targets and translated labels', () => {
    expect(component).toContain('min-h-11')
    for (const key of ['empty_title','real_count','all_verified','sort_helpful','sort_low','merchant_response','helpful_question','report_reason','load_more']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
