export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'

const schema = z.object({ response: z.string().trim().min(3).max(2000) }).strict()
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePermission(PERMISSIONS.REVIEWS_MODERATE)
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_RESPONSE' }, { status: 400 })
    const review = await prisma.review.findFirst({ where: { id: params.id, isVerified: true }, select: { id: true, productId: true } })
    if (!review) return NextResponse.json({ success: false, error: 'REVIEW_NOT_FOUND' }, { status: 404 })
    await prisma.review.update({ where: { id: review.id }, data: { merchantResponse: parsed.data.response, merchantResponseAt: new Date() } })
    void logActivity({ userId: admin.id, userName: admin.name, userRole: admin.role, action: 'REVIEW_RESPONSE', entityType: 'REVIEW', entityId: review.id, description: 'Posted or updated a merchant response to a verified review.', req: request }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    console.error('Review response failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'RESPONSE_FAILED' }, { status: 500 })
  }
}
