import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const form = read('src/components/reviews/ReviewSubmissionForm.tsx')
const page = read('src/app/review/[orderId]/[productId]/page.tsx')
const eligibility = read('src/app/api/reviews/eligibility/route.ts')
const upload = read('src/app/api/reviews/upload/route.ts')
const ordersApi = read('src/app/api/account/orders/route.ts')
const ordersPage = read('src/app/account/orders/page.tsx')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

describe('verified review submission UI', () => {
  it('uses a private eligibility endpoint tied to the authenticated delivered order', () => {
    expect(eligibility).toContain('requireAuth()')
    expect(eligibility).toContain("order.status !== 'DELIVERED'")
    expect(eligibility).toContain("order.delivery?.status !== 'DELIVERED'")
    expect(eligibility).toContain('item.bundle?.products.some')
    expect(eligibility).toContain('REVIEW_WINDOW_DAYS')
    expect(eligibility).not.toContain('customerPhone')
    expect(eligibility).not.toContain('customerEmail')
  })

  it('starts with no rating and states equal rewards for negative and positive feedback', () => {
    expect(form).toContain('useState(0)')
    expect(form).toContain("t('reviews.equal_reward_notice'")
    expect(form).toContain("t('reviews.negative_welcome')")
    expect(form).toContain('REVIEW_REWARD_POINTS')
    expect(form).not.toMatch(/rating\s*===\s*5.*points|rating\s*===\s*1.*points/)
  })

  it('supports translated context fields and secure customer photo upload', () => {
    for (const term of ['skinTypes', 'hairTypes', 'shadeMatched', 'MAX_REVIEW_PHOTOS', "fetch('/api/reviews/upload'"]) expect(form).toContain(term)
    expect(upload).toContain('requireAuth()')
    expect(upload).toContain("folder: 'freedomcosmeticshop/reviews'")
    expect(upload).toContain('MAX_BYTES = 5 * 1024 * 1024')
    expect(upload).not.toContain("form.get('folder')")
  })

  it('links delivered direct and bundle products from the real account order page', () => {
    expect(ordersApi).toContain('item.bundle?.products')
    expect(ordersApi).toContain('reviewProducts:')
    expect(ordersPage).toContain("order.status==='DELIVERED'")
    expect(ordersPage).toContain('href={`/review/${order.id}/${product.id}`}')
    expect(page).toContain('<ReviewSubmissionForm orderId={params.orderId} productId={params.productId} />')
  })

  it('uses mobile touch targets and translated rendered text', () => {
    expect(form).toContain('h-12 w-12')
    expect(form).toContain('min-h-[52px]')
    expect(form).not.toContain('lang ===')
    for (const key of ['form_title','equal_reward_notice','rating_label','comment_placeholder','negative_welcome','thank_you','review_product']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
