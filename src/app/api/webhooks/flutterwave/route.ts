/**
 * POST /api/webhooks/flutterwave
 *
 * Flutterwave webhook handler for card payment events.
 *
 * Flutterwave sends webhooks for:
 *   - charge.completed (card payment completed)
 *   - transfer.completed (refund completed)
 *
 * Flow:
 *   1. Read raw body + verify signature (verif-hash header)
 *   2. Parse webhook event
 *   3. Verify the payment with Flutterwave API (don't trust the webhook alone)
 *   4. Find the payment by tx_ref
 *   5. If VERIFIED + SUCCESS: update payment, confirm order, award loyalty, SMS/email
 *   6. If FAILED: update payment, notify customer
 *
 * Security:
 *   - Verifies webhook signature using FLW_WEBHOOK_HASH
 *   - Double-verifies payment via Flutterwave API
 *   - Idempotent
 *
 * Configure webhook URL in Flutterwave dashboard:
 *   https://your-domain.com/api/webhooks/flutterwave
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWebhookEvent, verifyPayment } from "@/server/services/flutterwave"
import { handlePaymentSuccess, handlePaymentFailure } from "@/server/services/payment-events"
import { recordPaymentSecurityAlert } from '@/server/services/payment-security'

export async function POST(req: Request) {
  try {
    // Read raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get("verif-hash") || undefined

    // Verify + parse the webhook event
    const event = verifyWebhookEvent(body, signature)
    if (!event) {
      console.error("[Flutterwave Webhook] Invalid event — signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Only process charge.completed events
    if (event.event !== "charge.completed") {
      return NextResponse.json({ received: true, ignored: true })
    }

    // Find the payment by tx_ref
    const payment = await db.payment.findFirst({
      where: { providerTransactionId: event.data.tx_ref },
      include: { order: true },
    })

    if (!payment) {
      console.error(
        `[Flutterwave Webhook] Payment not found for tx_ref: ${event.data.tx_ref}`
      )
      return NextResponse.json({ received: true, message: "Payment not found" })
    }

    // CRITICAL: Verify the payment with Flutterwave API (don't trust the webhook alone)
    let verification
    try {
      verification = await verifyPayment(event.data.tx_ref)
    } catch (verifyError) {
      console.error("[Flutterwave Webhook] Verification failed:", verifyError)
      // If verification fails, don't mark as paid — wait for manual review
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 500 }
      )
    }

    const detailsMatch = verification.txRef === event.data.tx_ref && verification.amount === payment.amount && event.data.amount === payment.amount && verification.currency === 'RWF' && event.data.currency === 'RWF'
    if (!detailsMatch) {
      await recordPaymentSecurityAlert({ provider: 'FLUTTERWAVE', orderId: payment.orderId, orderNumber: payment.order.orderNumber, paymentId: payment.id, reason: 'Reference, amount, or currency mismatch', expectedAmount: payment.amount, receivedAmount: verification.amount })
      return NextResponse.json({ error: 'Verified payment details do not match order' }, { status: 422 })
    }

    // Process based on verified status
    if (verification.success && verification.status === "success") {
      await handlePaymentSuccess({
        paymentId: payment.id,
        orderId: payment.orderId,
        providerTransactionId: event.data.tx_ref,
        cardLast4: verification.card?.last4 || undefined,
        cardBrand: verification.card?.brand || undefined,
      })
    } else if (verification.status === 'failed' || verification.status === 'cancelled') {
      await handlePaymentFailure({ paymentId: payment.id, orderId: payment.orderId, reason: verification.message || 'Payment verification failed' })
    } else {
      return NextResponse.json({ received: true, processed: false, status: 'pending' })
    }

    return NextResponse.json({ received: true, processed: true })
  } catch (error) {
    console.error("[Flutterwave Webhook] Handler error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/flutterwave
 * Health check endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "flutterwave-webhook",
    timestamp: new Date().toISOString(),
  })
}
