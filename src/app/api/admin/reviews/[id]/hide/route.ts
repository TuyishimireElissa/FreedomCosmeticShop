export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'
import { recalculateProductReviewStats } from '@/server/services/review-rating'

const schema = z.object({
  action: z.enum(['HIDE','RESTORE']),
  reason: z.enum(['SPAM','ABUSE','PRIVACY','LEGAL','DUPLICATE']).optional(),
  details: z.string().trim().max(500).optional(),
}).strict().refine((value) => value.action !== 'HIDE' || Boolean(value.reason), { path: ['reason'], message: 'REASON_REQUIRED' })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = await requirePermission(PERMISSIONS.REVIEWS_MODERATE)
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_MODERATION' }, { status: 400 })
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Review" WHERE id = ${id} FOR UPDATE`
      const review = await tx.review.findUnique({ where: { id: id }, select: { id: true, productId: true, rating: true } })
      if (!review) throw new ModerationError('REVIEW_NOT_FOUND', 404)
      const hidden = parsed.data.action === 'HIDE'
      await tx.review.update({ where: { id: review.id }, data: { isHidden: hidden, moderationReason: hidden ? [parsed.data.reason, parsed.data.details].filter(Boolean).join(': ') : null } })
      await tx.reviewReport.updateMany({ where: { reviewId: review.id, resolved: false }, data: { resolved: true, resolvedAt: new Date(), resolvedBy: admin.id } })
      await recalculateProductReviewStats(tx, review.productId)
      return { reviewId: review.id, hidden, rating: review.rating }
    })
    void logActivity({ userId: admin.id, userName: admin.name, userRole: admin.role, action: result.hidden ? 'REVIEW_HIDE' : 'REVIEW_RESTORE', entityType: 'REVIEW', entityId: result.reviewId, description: result.hidden ? `Hid a review for moderation reason ${parsed.data.reason}.` : 'Restored a moderated review.', req: request }).catch(() => {})
    return NextResponse.json({ success: true, data: { hidden: result.hidden } })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    if (error instanceof ModerationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    console.error('Review moderation failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'MODERATION_FAILED' }, { status: 500 })
  }
}
class ModerationError extends Error { constructor(message: string, public status: number) { super(message) } }
