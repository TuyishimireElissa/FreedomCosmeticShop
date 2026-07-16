export const dynamic = 'force-dynamic'

import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { MAX_REVIEW_PHOTOS, REVIEW_REWARD_POINTS, REVIEW_WINDOW_DAYS } from '@/lib/review-constants'
import { recalculateProductReviewStats } from '@/server/services/review-rating'

const cloudinaryReviewUrl = z.string().url().max(1000).refine((value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && url.pathname.startsWith('/dohoc0tmp/image/upload/')
  } catch { return false }
}, 'INVALID_REVIEW_PHOTO')
const schema = z.object({
  orderId: z.string().min(1).max(100),
  productId: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional(),
  comment: z.string().trim().max(2000).optional(),
  skinType: z.enum(['OILY','DRY','COMBINATION','NORMAL','SENSITIVE','ALL']).optional(),
  hairType: z.enum(['NATURAL','RELAXED','WAVY','CURLY','COILY','ALL_HAIR']).optional(),
  shadeMatched: z.boolean().optional(),
  photos: z.array(cloudinaryReviewUrl).max(MAX_REVIEW_PHOTOS).default([]),
}).strict()

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_REVIEW', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    const data = parsed.data
    const order = await prisma.order.findFirst({
      where: { id: data.orderId, userId: user.id, status: 'DELIVERED' },
      include: {
        delivery: { select: { status: true, deliveredAt: true } },
        items: { select: { productId: true, bundle: { select: { products: { select: { productId: true } } } } } },
      },
    })
    if (!order || order.delivery?.status !== 'DELIVERED' || !order.delivery.deliveredAt) return NextResponse.json({ success: false, error: 'DELIVERED_ORDER_REQUIRED' }, { status: 403 })
    const purchased = order.items.some((item) => item.productId === data.productId || item.bundle?.products.some((component) => component.productId === data.productId))
    if (!purchased) return NextResponse.json({ success: false, error: 'PRODUCT_NOT_IN_ORDER' }, { status: 403 })
    const reviewDeadline = new Date(order.delivery.deliveredAt.getTime() + REVIEW_WINDOW_DAYS * 86_400_000)
    if (new Date() > reviewDeadline) return NextResponse.json({ success: false, error: 'REVIEW_WINDOW_EXPIRED' }, { status: 400 })

    const review = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`
      const reviewer = await tx.user.findUnique({ where: { id: user.id }, select: { loyaltyPoints: true } })
      if (!reviewer) throw new Error('Reviewer not found')
      const created = await tx.review.create({ data: {
        userId: user.id,
        productId: data.productId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        rating: data.rating,
        title: data.title || null,
        body: data.comment || null,
        skinType: data.skinType || null,
        hairType: data.hairType || null,
        shadeMatched: data.shadeMatched,
        photos: JSON.stringify([...new Set(data.photos)]),
        isVerified: true,
        isApproved: true,
        isHidden: false,
        pointsAwarded: REVIEW_REWARD_POINTS,
        pointsAwardedAt: new Date(),
      } })
      const balanceAfter = reviewer.loyaltyPoints + REVIEW_REWARD_POINTS
      await tx.user.update({ where: { id: user.id }, data: { loyaltyPoints: { increment: REVIEW_REWARD_POINTS } } })
      await tx.loyaltyPoints.create({ data: {
        userId: user.id,
        points: REVIEW_REWARD_POINTS,
        type: 'EARNED',
        reason: `Verified review for order ${order.orderNumber}`,
        orderId: order.id,
        balanceAfter,
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      } })
      await tx.reviewRequest.updateMany({ where: { orderId: order.id, productId: data.productId }, data: { reviewSubmitted: true, reviewId: created.id } })
      await recalculateProductReviewStats(tx, data.productId)
      return created
    })
    return NextResponse.json({ success: true, data: { reviewId: review.id, pointsAwarded: REVIEW_REWARD_POINTS } }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ success: false, error: 'ALREADY_REVIEWED' }, { status: 409 })
    console.error('Verified review submission failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'REVIEW_SUBMISSION_FAILED' }, { status: 500 })
  }
}
