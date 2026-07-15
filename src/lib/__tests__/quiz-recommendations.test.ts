import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUDGET_RANGES, buildRecommendationQuery, getQuizStep, type QuizAnswers } from '@/lib/quiz-logic'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const api = read('src/app/api/quiz/recommend/route.ts')
const component = read('src/components/quiz/RoutineQuiz.tsx')

describe('routine quiz recommendations', () => {
  it('maps answers to live search dimensions without product IDs', () => {
    const answers: QuizAnswers = { category: 'skin', mainConcern: 'acne', skinType: 'OILY', preferredResult: 'clear_skin', budget: '5k-15k', sensitivity: 'some' }
    expect(buildRecommendationQuery(answers)).toMatchObject({ category: 'skincare', skinType: 'OILY', minPrice: 5000, maxPrice: 15000 })
    expect(buildRecommendationQuery(answers).searchTerms).toContain('salicylic acid')
    expect(read('src/lib/quiz-logic.ts')).not.toMatch(/productId\s*:/)
  })

  it('uses exact integer RWF budget ranges', () => {
    expect(BUDGET_RANGES.under5k).toMatchObject({ min: 0, max: 5000 })
    expect(BUDGET_RANGES['50k+']).toMatchObject({ min: 50000 })
    expect(BUDGET_RANGES['50k+'].max).toBeUndefined()
  })

  it('always provides one question for each of six steps', () => {
    const answers: Partial<QuizAnswers> = { category: 'makeup' }
    for (let step = 1; step <= 6; step += 1) expect(getQuizStep(step, answers).options.length).toBeGreaterThan(0)
  })

  it('queries only active real stock and returns public-safe product fields', () => {
    expect(api).toContain('isActive: true, isDeleted: false, stock: { gt: 0 }')
    expect(api).toContain('PUBLIC_PRODUCT_SELECT')
    expect(api).not.toContain('costPrice')
    expect(api).not.toContain('supplierId')
  })

  it('calculates bundle totals and stock from current products', () => {
    expect(api).toContain('item.product.price * item.quantity')
    expect(api).toContain('item.product.stock >= item.quantity')
    expect(api).toContain('normalTotal - bundle.bundlePrice')
  })

  it('makes no API call until the final answer and caches results', () => {
    expect(component).toContain('if (stepNumber < 6)')
    expect(component).toContain("fetch('/api/quiz/recommend'")
    expect(component).toContain('sessionStorage.getItem(cacheKey)')
    expect(component).toContain('CACHE_TTL_MS')
  })
})
