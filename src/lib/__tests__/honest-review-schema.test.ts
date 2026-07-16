import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8')
const reviewsApi = readFileSync(resolve(process.cwd(), 'src/app/api/reviews/route.ts'), 'utf8')
const homepage = readFileSync(resolve(process.cwd(), 'src/app/api/reviews/homepage/route.ts'), 'utf8')
const publicProduct = readFileSync(resolve(process.cwd(), 'src/lib/public-product.ts'), 'utf8')
const productPage = readFileSync(resolve(process.cwd(), 'src/app/products/[slug]/page.tsx'), 'utf8')

const reviewModel = schema.slice(schema.indexOf('model Review {'), schema.indexOf('model ReviewRequest {'))

describe('honest review database foundation', () => {
  it('preserves legacy review data while adding order verification and context', () => {
    for (const field of ['orderNumber', 'hairType', 'shadeMatched', 'isVerified', 'pointsAwarded', 'pointsAwardedAt']) expect(reviewModel).toContain(field)
    expect(reviewModel).toContain('isVerified Boolean @default(false)')
    expect(reviewModel).toContain('@@unique([userId, productId, orderId])')
    expect(reviewModel).toContain('body   String? @db.Text')
    expect(reviewModel).toContain('photos String?')
  })

  it('adds durable votes, reports, moderation, responses and review requests', () => {
    for (const model of ['model ReviewRequest', 'model ReviewVote', 'model ReviewReport']) expect(schema).toContain(model)
    for (const field of ['isHidden', 'moderationReason', 'merchantResponse', 'merchantResponseAt', 'notHelpfulCount']) expect(reviewModel).toContain(field)
    expect(schema).toContain('@@unique([reviewId, userId])')
    expect(schema).toContain('@@unique([reviewId, reportedBy])')
    expect(schema).toContain('reviewRequests   ReviewRequest[]')
  })

  it('does not encode rating-dependent rewards or auto-verify legacy reviews', () => {
    expect(reviewModel).not.toMatch(/pointsAwarded.*rating|rating.*pointsAwarded/)
    expect(reviewModel).not.toContain('isVerified Boolean @default(true)')
    expect(schema).not.toContain('review.createMany')
  })

  it('allows only verified, visible, approved reviews in public counts and displays', () => {
    for (const source of [reviewsApi, homepage, publicProduct, productPage]) {
      expect(source).toContain('isVerified: true')
      expect(source).toContain('isHidden: false')
      expect(source).toContain('isApproved: true')
    }
  })

  it('keeps negative ratings structurally independent from moderation visibility', () => {
    expect(reviewModel).toContain('rating Int')
    expect(reviewModel).toContain('isHidden         Boolean @default(false)')
    expect(reviewModel).not.toMatch(/rating.*isHidden|isHidden.*rating/)
  })
})
