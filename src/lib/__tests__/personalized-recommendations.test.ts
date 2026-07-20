import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { rankRecommendationCandidate } from '@/server/services/personalized-recommendations'

const read = (path: string) => readFileSync(path, 'utf8')
const service = read('src/server/services/personalized-recommendations.ts')
const route = read('src/app/api/recommendations/personalized/route.ts')
const component = read('src/components/home/PersonalizedRecommendations.tsx')
const home = read('src/app/page.tsx')
const publicProduct = read('src/lib/public-product.ts')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

function signals() {
  return {
    orderCategories: new Map([['cat-order', 6]]),
    savedCategories: new Map([['cat-saved', 4]]),
    brands: new Map([['brand-a', 2]]),
    quizProductIds: new Set(['quiz-product']),
    quizCategoryIds: new Set(['cat-quiz']),
  }
}

describe('privacy-minimized personalized recommendations', () => {
  it('ranks deterministic catalogue signals with an explainable reason', () => {
    const quiz = rankRecommendationCandidate({ id: 'quiz-product', name: 'A', categoryId: 'cat-quiz', brandId: null }, signals())
    expect(quiz.score).toBe(11)
    expect(quiz.reason).toBe('QUIZ_MATCH')
    const order = rankRecommendationCandidate({ id: 'other', name: 'B', categoryId: 'cat-order', brandId: 'brand-a' }, signals())
    expect(order.score).toBe(8)
    expect(order.reason).toBe('PURCHASE_CATEGORY')
  })

  it('uses only eligible paid or delivered purchase history', () => {
    expect(service).toContain("OR: [{ status: 'DELIVERED' }, { payments: { some: { status: 'PAID' } } }]")
    expect(service).toContain('userId,')
    expect(service).toContain('take: 200')
  })

  it('uses broad product/category signals without selecting sensitive quiz answers', () => {
    expect(service).toContain('select: { recommendedProductIds: true }')
    expect(service).not.toMatch(/select:\s*\{[^}]*mainConcern/)
    expect(service).not.toMatch(/select:\s*\{[^}]*sensitivity/)
    expect(service).not.toMatch(/select:\s*\{[^}]*skinType/)
    expect(service).not.toMatch(/select:\s*\{[^}]*preferredResult/)
  })

  it('never selects or returns customer identity and contact details', () => {
    expect(service).not.toMatch(/select:\s*\{[^}]*\b(phone|email|address)\s*:\s*true/)
    expect(service).not.toMatch(/user:\s*\{\s*select:/)
    expect(route).not.toMatch(/user(Name|Phone|Email)|customer(Name|Phone|Email)|address/)
    expect(route).not.toContain('userId: user.id')
  })

  it('excludes already purchased, unavailable, inactive, and deleted products', () => {
    expect(service).toContain('id: { notIn: [...purchasedIds] }')
    expect(service).toContain('stock: { gt: 0 }')
    expect(service).toContain('isActive: true')
    expect(service).toContain('isDeleted: false')
  })

  it('uses the established public product allowlist and real sales calculation', () => {
    expect(service).toContain('select: PUBLIC_PRODUCT_SELECT')
    expect(service).toContain('getRealUnitSales')
    expect(service).toContain('serializePublicProduct')
    expect(publicProduct).toContain('Count only paid orders or delivered orders')
  })

  it('does not invent recommendations when there are no eligible signals', () => {
    expect(service).toContain("if (!hasSignals) return { products: [], reasons: {}, personalized: false")
    expect(service).not.toMatch(/featured:\s*true[\s\S]*personalized:\s*true/)
    expect(component).toContain("if (!result) return null")
  })

  it('does not create a persistent behavioral profile or customer segment', () => {
    expect(service).not.toMatch(/customerSegment\.(create|update|upsert)/)
    expect(service).not.toMatch(/analyticsEvent\.(create|update|upsert)/)
    expect(route).toContain('createsPersistentCustomerProfile: false')
    expect(route).toContain('sensitiveQuizAnswersReturned: false')
  })

  it('protects the endpoint with custom auth, per-user limits, and private caching', () => {
    expect(route).toContain('requireAuth')
    expect(route).toContain('rateLimit')
    expect(route).toContain("'Cache-Control': 'private, no-store, max-age=0'")
    expect(route).toContain("Vary: 'Cookie'")
    expect(route).not.toContain('getServerSession')
  })

  it('loads the section lazily and silently hides it for signed-out or signal-free users', () => {
    expect(home).toContain("import('@/components/home/PersonalizedRecommendations')")
    expect(home).toContain("<LazySection label={t('personalized_recommendations.section_label')}")
    expect(component).toContain("response.ok ? response.json()")
    expect(component).toContain('data?.personalized && data.products.length')
    expect(component).toContain("credentials: 'same-origin'")
  })

  it('explains broad recommendation reasons without claiming product efficacy', () => {
    expect(component).toContain('reasonKeys')
    expect(component).toContain("t('personalized_recommendations.description')")
    const block = en.match(/personalized_recommendations: \{([\s\S]*?)\n  \},/)?.[1] || ''
    expect(block).not.toMatch(/works|effective|best for you|guarantee/i)
  })

  it('translates all UI text and marks new Kinyarwanda lines verified-rw', () => {
    expect(en).toContain('personalized_recommendations:')
    const block = rw.match(/personalized_recommendations: \{([\s\S]*?)\n  \},/)?.[1] || ''
    const values = block.split('\n').filter((line) => line.includes(':'))
    expect(values).toHaveLength(10)
    for (const line of values) expect(line).toContain('// verified-rw')
    expect(component).not.toMatch(/>\s*(Selected|Loading|Matches|Similar|A brand)[^<{]*</)
  })
})
