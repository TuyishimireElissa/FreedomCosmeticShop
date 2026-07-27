import { prisma } from '@/lib/prisma'
import { BUSINESS } from '@/lib/business-config'
import { features } from '@/lib/env'
import { resolveTranslation } from '@/lib/i18n'
import { REVIEW_REWARD_POINTS } from '@/lib/review-constants'
import { sendSms } from '@/server/services/sms'

const REVIEW_DELAY_MS = 3 * 86_400_000
const CLAIM_TIMEOUT_MS = 15 * 60_000

/** Create one idempotent request per real product in an authenticated delivered order. */
export async function createReviewRequests(orderId: string): Promise<number> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      delivery: { select: { status: true, deliveredAt: true } },
      items: { select: { productId: true, bundle: { select: { products: { select: { productId: true } } } } } },
    },
  })
  if (!order || order.status !== 'DELIVERED' || order.delivery?.status !== 'DELIVERED' || !order.delivery.deliveredAt || !order.userId) return 0
  const productIds = [...new Set(order.items.flatMap((item) => item.productId ? [item.productId] : item.bundle?.products.map((component) => component.productId) || []))]
  if (!productIds.length) return 0
  const existingReviews = await prisma.review.findMany({ where: { orderId: order.id, userId: order.userId, productId: { in: productIds } }, select: { id: true, productId: true } })
  await prisma.$transaction(productIds.map((productId) => {
    const review = existingReviews.find((item) => item.productId === productId)
    return prisma.reviewRequest.upsert({
      where: { orderId_productId: { orderId: order.id, productId } },
      create: { orderId: order.id, userId: order.userId!, productId, requestedAt: order.delivery!.deliveredAt!, reviewSubmitted: Boolean(review), reviewId: review?.id || null },
      update: review ? { reviewSubmitted: true, reviewId: review.id } : {},
    })
  }))
  return productIds.length
}

export async function sendPendingReviewSMS(): Promise<{ sent: number; failed: number; skipped: number }> {
  const eligibleBefore = new Date(Date.now() - REVIEW_DELAY_MS)
  const candidates = await prisma.reviewRequest.findMany({
    where: { smsSent: false, reviewSubmitted: false, requestedAt: { lte: eligibleBefore }, order: { status: 'DELIVERED', delivery: { status: 'DELIVERED', deliveredAt: { not: null } } } },
    include: { order: { select: { orderNumber: true, customerPhone: true } } },
    orderBy: { requestedAt: 'asc' },
    take: 50,
  })
  if (!features.sms) return { sent: 0, failed: 0, skipped: candidates.length }
  let sent = 0
  let failed = 0
  let skipped = 0
  for (const request of candidates) {
    const now = new Date()
    const claimed = await prisma.reviewRequest.updateMany({
      where: { id: request.id, smsSent: false, reviewSubmitted: false, OR: [{ smsClaimedAt: null }, { smsClaimedAt: { lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) } }] },
      data: { smsClaimedAt: now, smsAttempts: { increment: 1 }, lastSmsError: null },
    })
    if (claimed.count !== 1) { skipped += 1; continue }
    const reviewUrl = `${BUSINESS.url}/review/${encodeURIComponent(request.orderId)}/${encodeURIComponent(request.productId)}`
    const message = resolveTranslation('rw', 'sms.review_request', { order: request.order.orderNumber, points: REVIEW_REWARD_POINTS, url: reviewUrl, business: BUSINESS.tradingName })
    const result = await sendSms(request.order.customerPhone, message).catch(() => null)
    if (result?.success && result.provider !== 'SIMULATED') {
      await prisma.reviewRequest.update({ where: { id: request.id }, data: { smsSent: true, smsSentAt: new Date(), smsClaimedAt: null, lastSmsError: null } })
      sent += 1
    } else {
      await prisma.reviewRequest.update({ where: { id: request.id }, data: { smsClaimedAt: null, lastSmsError: 'PROVIDER_REJECTED' } })
      failed += 1
    }
  }
  return { sent, failed, skipped }
}
