export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePermission(PERMISSIONS.REVIEWS_MODERATE)
    const review = await prisma.review.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!review) return NextResponse.json({ success: false, error: 'REVIEW_NOT_FOUND' }, { status: 404 })
    const result = await prisma.reviewReport.updateMany({ where: { reviewId: review.id, resolved: false }, data: { resolved: true, resolvedAt: new Date(), resolvedBy: admin.id } })
    void logActivity({ userId: admin.id, userName: admin.name, userRole: admin.role, action: 'REVIEW_REPORT_RESOLVE', entityType: 'REVIEW', entityId: review.id, description: 'Resolved review reports without hiding the review.', req: request }).catch(() => {})
    return NextResponse.json({ success: true, data: { resolved: result.count } })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    console.error('Review report resolution failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'REPORT_RESOLUTION_FAILED' }, { status: 500 })
  }
}
