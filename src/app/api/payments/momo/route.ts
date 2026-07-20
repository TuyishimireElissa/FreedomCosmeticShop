export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { features } from '@/lib/env'
import { rateLimit } from '@/lib/permissions'
import { cashin, normalizePhoneForPaypack, PaypackError } from '@/server/services/paypack'
import { isValidForNetwork } from '@/lib/paypack'
import { validateOrderStockForPayment } from '@/server/services/payment-order-validation'

const input = z.object({
  orderId: z.string().min(1).max(100),
  phone: z.string().min(9).max(20),
  network: z.enum(['MTN', 'AIRTEL']),
  language: z.enum(['en', 'rw']).default('rw'),
}).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin')
    if (origin && origin !== new URL(req.url).origin) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
    }
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const limit = rateLimit(`payment-initiation:${ip}`, { maxActions: 10, windowMs: 15 * 60_000 })
    if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })

    const parsed = input.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payment request' }, { status: 400, headers })
    const { orderId, phone, network, language } = parsed.data
    // Keep an explicit guard as defense in depth and for maintainability.
    if (network !== 'MTN' && network !== 'AIRTEL') return NextResponse.json({ error: 'Invalid payment network' }, { status: 400, headers })
    if (!isValidForNetwork(phone, network)) return NextResponse.json({ error: 'INVALID_NETWORK_PHONE' }, { status: 400, headers })

    let normalizedPhone: string
    try {
      normalizedPhone = normalizePhoneForPaypack(phone)
    } catch {
      return NextResponse.json({ error: 'Invalid Rwanda phone number' }, { status: 400, headers })
    }

    const order = await db.order.findFirst({
      where: { id: orderId },
      include: { payments: true },
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404, headers })

    const auth = await requireAuth().catch(() => null)
    if (order.userId) {
      if (!auth || auth.id !== order.userId) return NextResponse.json({ error: 'FORBIDDEN_ORDER' }, { status: 403, headers })
    } else {
      let checkoutPhone: string
      try {
        checkoutPhone = normalizePhoneForPaypack(order.customerPhone)
      } catch {
        return NextResponse.json({ error: 'ORDER_PHONE_INVALID' }, { status: 409, headers })
      }
      if (checkoutPhone !== normalizedPhone) return NextResponse.json({ error: 'PAYMENT_PHONE_MISMATCH' }, { status: 403, headers })
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return NextResponse.json({ error: `Order already ${order.status.toLowerCase()}` }, { status: 400, headers })
    }
    const stock = await validateOrderStockForPayment(order.id)
    if (!stock.available) return NextResponse.json({ error: 'ORDER_STOCK_CHANGED' }, { status: 409, headers })

    // Production always fails closed when real provider processing is disabled.
    const developmentSimulation = process.env.NODE_ENV !== 'production' && !features.realPayments
    if (!features.realPayments && !developmentSimulation) {
      return NextResponse.json({ error: 'PAYMENTS_NOT_CONFIGURED' }, { status: 503, headers })
    }

    let payment = order.payments.find(
      (entry) => entry.method === (network === 'MTN' ? 'MTN_MOMO' : 'AIRTEL_MONEY') && entry.status === 'PENDING',
    )
    if (payment) {
      payment = await db.payment.update({
        where: { id: payment.id },
        data: { phoneNumber: normalizedPhone, webhookData: JSON.stringify({ checkoutLanguage: language }) },
      })
    } else {
      payment = await db.payment.create({
        data: {
          orderId: order.id,
          method: network === 'MTN' ? 'MTN_MOMO' : 'AIRTEL_MONEY',
          amount: order.total,
          status: 'PENDING',
          phoneNumber: normalizedPhone,
          webhookData: JSON.stringify({ checkoutLanguage: language }),
        },
      })
    }

    if (developmentSimulation) {
      setTimeout(async () => {
        try {
          const { handlePaymentSuccess } = await import('@/server/services/payment-events')
          await handlePaymentSuccess({ paymentId: payment!.id, orderId: order.id, providerTransactionId: `dev-mock-${Date.now()}` })
        } catch {
          // Development-only simulation failure is intentionally not exposed.
        }
      }, 3000)
      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        status: 'PENDING',
        message: 'Development payment simulation started.',
        simulated: true,
      }, { headers })
    }

    try {
      const result = await cashin({ amount: order.total, phone: normalizedPhone, reference: order.orderNumber })
      await db.payment.update({
        where: { id: payment.id },
        data: { providerTransactionId: result.transactionId, providerReference: result.reference },
      })
      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        providerTransactionId: result.transactionId,
        status: result.status.toUpperCase(),
        message: result.message,
        simulated: false,
      }, { headers })
    } catch (error) {
      console.error('PayPack cashin failed:', error instanceof Error ? error.message : 'unknown')
      if (error instanceof PaypackError) return NextResponse.json({ error: error.message }, { status: error.statusCode, headers })
      return NextResponse.json({ error: 'Payment initiation failed. Please try again.' }, { status: 502, headers })
    }
  } catch (error) {
    console.error('MoMo payment initiation failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500, headers })
  }
}
