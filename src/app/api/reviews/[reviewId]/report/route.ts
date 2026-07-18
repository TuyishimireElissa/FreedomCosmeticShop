export const dynamic = 'force-dynamic'

import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const schema = z.object({
  reason: z.enum(['SPAM','ABUSE','PRIVACY','IRRELEVANT','OTHER']),
  details: z.string().trim().min(3).max(500).optional(),
}).strict().refine((value) => value.reason !== 'OTHER' || Boolean(value.details), { message: 'DETAILS_REQUIRED', path: ['details'] })

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const { reviewId } = await params
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 })
    if (!reviewId || reviewId.length > 100) return NextResponse.json({ success: false, error: 'INVALID_REVIEW' }, { status: 400 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_REPORT' }, { status: 400 })
    const review = await prisma.review.findFirst({ where: { id: reviewId, isVerified: true, isApproved: true, isHidden: false, isDeleted: false }, select: { id: true, userId: true } })
    if (!review) return NextResponse.json({ success: false, error: 'REVIEW_NOT_FOUND' }, { status: 404 })
    if (review.userId === user.id) return NextResponse.json({ success: false, error: 'SELF_REPORT_NOT_ALLOWED' }, { status: 403 })
    await prisma.reviewReport.create({ data: { reviewId: review.id, reportedBy: user.id, reason: [parsed.data.reason, parsed.data.details].filter(Boolean).join(': ') } })
    // Reports never hide reviews automatically; a permitted moderator must review them.
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ success: false, error: 'ALREADY_REPORTED' }, { status: 409 })
    console.error('Review report failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'REPORT_FAILED' }, { status: 500 })
  }
}
