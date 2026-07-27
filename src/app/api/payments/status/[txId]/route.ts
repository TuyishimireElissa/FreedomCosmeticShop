import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { orderAccessTokenFromRequest, verifyOrderAccessToken } from '@/lib/order-access'
import { rateLimit } from '@/lib/permissions'

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

/** Poll a payment status after proving access to its order. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ txId: string }> },
) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const limit = rateLimit(`payment-status:${ip}`, { maxActions: 120, windowMs: 15 * 60_000 })
    if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers: PRIVATE_HEADERS })

    const { txId } = await params
    const payment = await db.payment.findUnique({
      where: { id: txId },
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true, total: true, userId: true },
        },
      },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404, headers: PRIVATE_HEADERS })

    const token = orderAccessTokenFromRequest(request)
    const tokenValid = await verifyOrderAccessToken(token, payment.orderId)
    const auth = await requireAuth().catch(() => null)
    const accountOwnsOrder = Boolean(auth && payment.order.userId && auth.id === payment.order.userId)
    if (!tokenValid && !accountOwnsOrder) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404, headers: PRIVATE_HEADERS })
    }

    return NextResponse.json({
      status: payment.status,
      payment: {
        id: payment.id,
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        failureReason: payment.failureReason,
        initiatedAt: payment.initiatedAt,
        completedAt: payment.completedAt,
        cardLast4: payment.cardLast4,
        cardBrand: payment.cardBrand,
      },
      order: {
        id: payment.order.id,
        orderNumber: payment.order.orderNumber,
        status: payment.order.status,
        total: payment.order.total,
        orderAccessToken: tokenValid ? token : undefined,
      },
    }, { headers: PRIVATE_HEADERS })
  } catch (error) {
    console.error('Payment status error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Failed to fetch payment status' }, { status: 500, headers: PRIVATE_HEADERS })
  }
}
