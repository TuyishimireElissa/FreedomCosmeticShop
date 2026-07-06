/**
 * POST /api/webhooks/paypack
 *
 * PayPack webhook handler for MTN MoMo + Airtel Money payment events.
 *
 * PayPack sends webhooks when:
 *   - Payment is successful (customer approved the USSD prompt)
 *   - Payment fails (customer declined, timeout, insufficient funds)
 *
 * Flow:
 *   1. Read raw body + verify signature
 *   2. Parse webhook event
 *   3. Find the payment by providerTransactionId
 *   4. If PAID: update payment, confirm order, award loyalty, send SMS/email
 *   5. If FAILED: update payment, notify customer
 *
 * Security:
 *   - Verifies webhook signature (if configured)
 *   - Idempotent — safe to receive the same webhook multiple times
 *   - Returns 200 immediately to acknowledge receipt (PayPack retries on non-200)
 *
 * Configure webhook URL in PayPack dashboard:
 *   https://your-domain.com/api/webhooks/paypack
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWebhookEvent } from "@/server/services/paypack"
import { handlePaymentSuccess, handlePaymentFailure } from "@/server/services/payment-events"

export async function POST(req: Request) {
  try {
    // Read raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get("x-paypack-signature") || undefined

    // Verify + parse the webhook event
    const event = verifyWebhookEvent(body, signature)
    if (!event) {
      console.error("[PayPack Webhook] Invalid event — signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    console.log(`[PayPack Webhook] Received event: ${event.id} — status: ${event.status}`)

    // Find the payment by provider transaction ID or reference
    const payment = await db.payment.findFirst({
      where: {
        OR: [
          { providerTransactionId: event.id },
          { providerReference: event.ref },
        ],
      },
      include: { order: true },
    })

    if (!payment) {
      console.error(`[PayPack Webhook] Payment not found for tx ${event.id} / ref ${event.ref}`)
      // Return 200 to stop PayPack from retrying — the payment may have been deleted
      return NextResponse.json({ received: true, message: "Payment not found" })
    }

    // Handle based on status
    if (event.status === "success") {
      await handlePaymentSuccess({
        paymentId: payment.id,
        orderId: payment.orderId,
        providerTransactionId: event.id,
      })

      console.log(`[PayPack Webhook] Payment ${payment.id} marked as PAID`)
    } else if (event.status === "failed") {
      await handlePaymentFailure({
        paymentId: payment.id,
        orderId: payment.orderId,
        reason: "Payment declined or timed out",
      })

      console.log(`[PayPack Webhook] Payment ${payment.id} marked as FAILED`)
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true, processed: true })
  } catch (error) {
    console.error("[PayPack Webhook] Handler error:", error)
    // Return 500 so PayPack retries
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/paypack
 * Health check endpoint (useful for PayPack dashboard verification).
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "paypack-webhook",
    timestamp: new Date().toISOString(),
  })
}
