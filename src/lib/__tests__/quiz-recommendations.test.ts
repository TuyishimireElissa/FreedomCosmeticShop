import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUDGET_RANGES, QUIZ_CATEGORY_SLUGS, buildRecommendationQuery, getQuizStep, type QuizAnswers } from '@/lib/quiz-logic'

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

  // Regression guard. The 2026-08-14 re-categorisation emptied Skin Care from 23
  // products down to 3, and the quiz filtered on that single slug, so six of the
  // nine skin concerns returned nothing. The search must span every category a
  // quiz path can legitimately recommend from.
  describe('the skin path is not tied to one category slug', () => {
    it('spans the categories that hold skin products today', () => {
      const skin = QUIZ_CATEGORY_SLUGS.skin
      // Where the 20 displaced skincare products actually went.
      for (const slug of ['skincare', 'whitening', 'soap', 'petroleum-jelly']) {
        expect(skin, `skin quiz must be able to recommend from "${slug}"`).toContain(slug)
      }
      expect(skin.length).toBeGreaterThan(1)
    })

    it('exposes every slug on the query, not just the primary', () => {
      const answers: QuizAnswers = { category: 'skin', mainConcern: 'dark_spots', preferredResult: 'even_tone', budget: '5k-15k', sensitivity: 'none' }
      const query = buildRecommendationQuery(answers)
      expect(query.categorySlugs).toEqual(QUIZ_CATEGORY_SLUGS.skin)
      // Primary stays a plain string: Bundle.targetCategory stores exactly one.
      expect(typeof query.category).toBe('string')
      expect(query.categorySlugs[0]).toBe(query.category)
    })

    it('filters products with an IN clause over every slug', () => {
      expect(api).toContain('category: { slug: { in: recommendation.categorySlugs } }')
      // The single-slug filter is what broke. It must not come back.
      expect(api).not.toContain('category: { slug: recommendation.category }')
    })

    it('keeps hair and makeup paths mapped to their own categories', () => {
      expect(QUIZ_CATEGORY_SLUGS.hair).toContain('haircare')
      expect(QUIZ_CATEGORY_SLUGS.makeup).toEqual(['makeup'])
      // A hair answer must never pull skin-only categories into range.
      expect(QUIZ_CATEGORY_SLUGS.hair).not.toContain('skincare')
      expect(QUIZ_CATEGORY_SLUGS.hair).not.toContain('soap')
    })
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
    expect(api).toContain('PUBLIC_PRODUCT_CARD_SELECT')
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
