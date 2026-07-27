/**
 * POST /api/payments/card
 *
 * Initiate a card payment via Flutterwave.
 *
 * Body: { orderId }
 *
 * Flow:
 *   1. Fetch the order (verify it exists + is PENDING)
 *   2. Call Flutterwave initializePayment() to get a payment link
 *   3. Create/update Payment record with tx_ref
 *   4. Return the payment link for client-side redirect
 *
 * The customer is redirected to Flutterwave's secure payment page.
 * After payment, they're redirected back to the return_url.
 * Flutterwave webhook (/api/webhooks/flutterwave) updates the payment status.
 */
import { NextResponse } from "next/server"
import { z } from 'zod'
import { db } from "@/lib/db"
import { requireAuth } from '@/lib/auth'
import { features } from '@/lib/env'
import { verifyOrderAccessToken } from '@/lib/order-access'
import {
  initializePayment,
  generateTxRef,
  FlutterwaveError,
} from "@/server/services/flutterwave"
import { validateOrderStockForPayment } from '@/server/services/payment-order-validation'

const input = z.object({
  orderId: z.string().min(1).max(100),
  language: z.enum(['en', 'rw']).default('rw'),
  orderAccessToken: z.string().min(32).max(2000),
}).strict()
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin')
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers: PRIVATE_HEADERS })
    const parsed = input.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payment request' }, { status: 400, headers: PRIVATE_HEADERS })
    const { orderId, language, orderAccessToken } = parsed.data

    // Fetch the order
    const order = await db.order.findFirst({
      where: { id: orderId },
      include: { payments: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404, headers: PRIVATE_HEADERS })
    }
    const auth = await requireAuth().catch(() => null)
    const tokenValid = await verifyOrderAccessToken(orderAccessToken, order.id)
    const accountOwnsOrder = Boolean(auth && order.userId && auth.id === order.userId)
    if (!tokenValid && !accountOwnsOrder) return NextResponse.json({ error: 'FORBIDDEN_ORDER' }, { status: 403, headers: PRIVATE_HEADERS })

    if (!order.customerEmail) return NextResponse.json({ error: 'EMAIL_REQUIRED_FOR_CARD' }, { status: 400, headers: PRIVATE_HEADERS })

    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Order already ${order.status.toLowerCase()}` },
        { status: 400 }
      )
    }
    const stock = await validateOrderStockForPayment(order.id)
    if (!stock.available) return NextResponse.json({ error: 'ORDER_STOCK_CHANGED' }, { status: 409, headers: PRIVATE_HEADERS })
    const providerConfigured = features.realPayments && Boolean(process.env.FLW_PUBLIC_KEY && process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_HASH)
    const developmentSimulation = process.env.NODE_ENV !== 'production' && !providerConfigured
    if (!providerConfigured && !developmentSimulation) {
      return NextResponse.json({ error: 'PAYMENTS_NOT_CONFIGURED' }, { status: 503, headers: PRIVATE_HEADERS })
    }

    // Generate unique transaction reference
    const txRef = generateTxRef(order.orderNumber)

    // Create or find payment record
    let payment = order.payments.find((p) => p.method === "CARD" && p.status === "PENDING")

    if (payment) {
      payment = await db.payment.update({
        where: { id: payment.id },
        data: { providerTransactionId: txRef, webhookData: JSON.stringify({ checkoutLanguage: language }) },
      })
    } else {
      payment = await db.payment.create({
        data: {
          orderId: order.id,
          method: "CARD",
          amount: order.total,
          status: "PENDING",
          providerTransactionId: txRef,
          webhookData: JSON.stringify({ checkoutLanguage: language }),
        },
      })
    }

    // Development-only simulation; production always fails closed above.
    if (developmentSimulation) {

      // Simulate payment success after 3 seconds
      setTimeout(async () => {
        try {
          const { handlePaymentSuccess } = await import("@/server/services/payment-events")
          await handlePaymentSuccess({
            paymentId: payment!.id,
            orderId: order.id,
            providerTransactionId: txRef,
            cardLast4: "4242",
            cardBrand: "visa",
          })
        } catch (e) {
          console.error("Failed to update mock payment:", e)
        }
      }, 3000)

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        txRef,
        status: "PENDING",
        message: "Card payment initiated (simulated — will auto-confirm in 3 seconds).",
        simulated: true,
        paymentLink: null,
      })
    }

    // ─── Real Flutterwave integration ─────────────────────────────────
    try {
      const result = await initializePayment({
        amount: order.total,
        txRef,
        customer: {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
        },
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"}/checkout/payment-return?paymentId=${encodeURIComponent(payment.id)}&accessToken=${encodeURIComponent(orderAccessToken)}`,
      })

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        txRef,
        status: "PENDING",
        paymentLink: result.paymentLink,
        message: "Redirecting to secure payment page...",
        simulated: false,
      })
    } catch (err) {
      console.error("Flutterwave init error:", err)

      if (err instanceof FlutterwaveError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.statusCode }
        )
      }

      return NextResponse.json(
        { error: "Card payment initiation failed." },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Card payment error:", error)
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    )
  }
}
