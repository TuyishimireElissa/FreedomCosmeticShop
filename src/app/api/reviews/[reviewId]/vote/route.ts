export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const schema = z.object({ isHelpful: z.boolean() }).strict()

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const { reviewId } = await params
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 })
    if (!reviewId || reviewId.length > 100) return NextResponse.json({ success: false, error: 'INVALID_REVIEW' }, { status: 400 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_VOTE' }, { status: 400 })
    const counts = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Review" WHERE id = ${reviewId} FOR UPDATE`
      const review = await tx.review.findFirst({ where: { id: reviewId, isVerified: true, isApproved: true, isHidden: false, isDeleted: false }, select: { id: true, userId: true } })
      if (!review) throw new ReviewVoteError('REVIEW_NOT_FOUND', 404)
      if (review.userId === user.id) throw new ReviewVoteError('SELF_VOTE_NOT_ALLOWED', 403)
      const existing = await tx.reviewVote.findUnique({ where: { reviewId_userId: { reviewId: review.id, userId: user.id } } })
      if (!existing) {
        await tx.reviewVote.create({ data: { reviewId: review.id, userId: user.id, isHelpful: parsed.data.isHelpful } })
      } else if (existing.isHelpful === parsed.data.isHelpful) {
        await tx.reviewVote.delete({ where: { id: existing.id } })
      } else {
        await tx.reviewVote.update({ where: { id: existing.id }, data: { isHelpful: parsed.data.isHelpful } })
      }
      const grouped = await tx.reviewVote.groupBy({ by: ['isHelpful'], where: { reviewId: review.id }, _count: { _all: true } })
      const helpfulVotes = grouped.find((item) => item.isHelpful)?._count._all || 0
      const notHelpfulCount = grouped.find((item) => !item.isHelpful)?._count._all || 0
      return tx.review.update({ where: { id: review.id }, data: { helpfulVotes, notHelpfulCount }, select: { helpfulVotes: true, notHelpfulCount: true } })
    })
    return NextResponse.json({ success: true, data: counts })
  } catch (error) {
    if (error instanceof ReviewVoteError) return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    console.error('Review vote failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'VOTE_FAILED' }, { status: 500 })
  }
}
class ReviewVoteError extends Error { constructor(message: string, public status: number) { super(message) } }
