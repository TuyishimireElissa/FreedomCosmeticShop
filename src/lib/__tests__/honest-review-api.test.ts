import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const submit = read('src/app/api/reviews/submit/route.ts')
const legacy = read('src/app/api/reviews/route.ts')
const product = read('src/app/api/reviews/product/[productId]/route.ts')
const vote = read('src/app/api/reviews/[reviewId]/vote/route.ts')
const report = read('src/app/api/reviews/[reviewId]/report/route.ts')
const constants = read('src/lib/review-constants.ts')
const rating = read('src/server/services/review-rating.ts')

describe('verified honest review APIs', () => {
  it('uses custom JWT and requires an actual delivered order item', () => {
    expect(submit).toContain("import { requireAuth } from '@/lib/auth'")
    expect(submit).not.toContain('getServerSession')
    expect(submit).not.toContain('next-auth')
    expect(submit).toContain("status: 'DELIVERED'")
    expect(submit).toContain("order.delivery?.status !== 'DELIVERED'")
    expect(submit).toContain('order.delivery.deliveredAt')
    expect(submit).toContain('item.productId === data.productId')
    expect(submit).toContain('item.bundle?.products.some')
  })

  it('enforces the real 90-day window, one review key, and Cloudinary-only photos', () => {
    expect(constants).toContain('REVIEW_WINDOW_DAYS = 90')
    expect(submit).toContain('REVIEW_WINDOW_DAYS * 86_400_000')
    expect(submit).toContain("url.hostname === 'res.cloudinary.com'")
    expect(submit).toContain("url.pathname.startsWith('/dohoc0tmp/image/upload/')")
    expect(submit).toContain('MAX_REVIEW_PHOTOS')
    expect(submit).toContain("error.code === 'P2002'")
    expect(legacy).toContain("error: 'VERIFIED_ORDER_REQUIRED'")
    expect(legacy).toContain('{ status: 410 }')
  })

  it('awards one rating-neutral constant in the same transaction', () => {
    expect(constants).toContain('REVIEW_REWARD_POINTS = 100')
    expect(submit).toContain('pointsAwarded: REVIEW_REWARD_POINTS')
    expect(submit).toContain('points: REVIEW_REWARD_POINTS')
    expect(submit).toContain('loyaltyPoints: { increment: REVIEW_REWARD_POINTS }')
    expect(submit).not.toMatch(/rating\s*[>=<]=?.*REVIEW_REWARD_POINTS|REVIEW_REWARD_POINTS.*rating\s*[>=<]=?/)
    expect(submit).toContain('prisma.$transaction')
  })

  it('returns only verified visible reviews and real rating distribution', () => {
    for (const field of ['isVerified: true', 'isApproved: true', 'isHidden: false', 'isDeleted: false']) expect(product).toContain(field)
    expect(product).toContain('for (const review of allRatings)')
    expect(product).toContain('allRatings.reduce')
    expect(product).toContain('anonymizeName')
    expect(product).not.toContain('orderNumber: true')
    expect(rating).toContain('isVerified: true')
    expect(rating).toContain('_avg: { rating: true }')
  })

  it('recomputes helpful counters from durable unique votes', () => {
    expect(vote).toContain('reviewId_userId')
    expect(vote).toContain('FOR UPDATE')
    expect(vote).toContain("groupBy({ by: ['isHelpful']")
    expect(vote).toContain('helpfulVotes, notHelpfulCount')
    expect(vote).toContain('SELF_VOTE_NOT_ALLOWED')
  })

  it('records reports without hiding or deleting critical reviews', () => {
    expect(report).toContain('prisma.reviewReport.create')
    expect(report).toContain('Reports never hide reviews automatically')
    expect(report).not.toContain('isHidden: true')
    expect(report).not.toContain('review.delete')
    expect(report).not.toContain('rating:')
  })
})
