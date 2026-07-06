/**
 * Payment service — abstraction over MTN MoMo (PayPack) + Flutterwave.
 *
 * This is a STUB for the MVP. The storefront uses `simulatePayment()`
 * for demo orders. When `ENABLE_REAL_PAYMENTS=true` in env, switch to
 * `initiateMomoPayment()` which calls PayPack's real API.
 *
 * To complete this integration:
 *   1. Sign up at https://paypack.co.rw/ → get client_id & client_secret
 *   2. Set PAYPACK_CLIENT_ID, PAYPACK_CLIENT_SECRET in .env
 *   3. Set ENABLE_REAL_PAYMENTS=true
 *   4. Implement /api/webhooks/paypack/route.ts to receive payment events
 *   5. Update order.paymentStatus = "PAID" in the webhook handler
 */

import { env, features } from "@/lib/env"

export type PaymentResult = {
  success: boolean
  transactionId?: string
  status: "PENDING" | "PAID" | "FAILED"
  message: string
  /** PayPack payment URL the customer should be redirected to (if any) */
  redirectUrl?: string
}

/**
 * Initiate an MTN MoMo payment via PayPack.
 *
 * @param amount  Amount in RWF (integer)
 * @param phone   Customer's MTN phone number (e.g. "0788123456")
 * @param orderId Internal order ID for reconciliation
 */
export async function initiateMomoPayment(
  amount: number,
  phone: string,
  orderId: string
): Promise<PaymentResult> {
  // ─── Simulation mode (MVP) ────────────────────────────────────────
  if (!features.realPayments) {
    console.log(`[MOCK PAYMENT] ${amount} RWF from ${phone} for order ${orderId}`)
    return {
      success: true,
      transactionId: `mock-${Date.now()}`,
      status: "PAID",
      message: "Payment simulated successfully (ENABLE_REAL_PAYMENTS=false).",
    }
  }

  // ─── Real PayPack integration ─────────────────────────────────────
  if (!env.PAYPACK_CLIENT_ID || !env.PAYPACK_CLIENT_SECRET) {
    return {
      success: false,
      status: "FAILED",
      message: "PayPack credentials are not configured.",
    }
  }

  try {
    // Step 1: Get access token
    const tokenRes = await fetch("https://api.paypack.co.rw/api/auth/clients/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.PAYPACK_CLIENT_ID,
        client_secret: env.PAYPACK_CLIENT_SECRET,
      }),
    })
    if (!tokenRes.ok) throw new Error("Failed to authenticate with PayPack")
    const { access } = await tokenRes.json()

    // Step 2: Initiate the payment (request money from customer)
    const payRes = await fetch("https://api.paypack.co.rw/api/transactions/cash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        amount,
        // PayPack expects international format without +
        number: phone.replace(/^\+250/, "250").replace(/^0/, "250"),
        // Custom reference for reconciliation in webhook
        reference: orderId,
      }),
    })

    if (!payRes.ok) {
      const err = await payRes.json().catch(() => ({}))
      throw new Error(err.message || "PayPack payment request failed")
    }

    const data = await payRes.json()
    return {
      success: true,
      transactionId: data.id || data.ref,
      status: "PENDING",
      message: "Payment prompt sent to customer's phone. Awaiting confirmation.",
      redirectUrl: data.url,
    }
  } catch (err) {
    return {
      success: false,
      status: "FAILED",
      message: err instanceof Error ? err.message : "Unknown payment error",
    }
  }
}

/**
 * Initiate a card payment via Flutterwave.
 * (Stub — implement when card payments are needed.)
 */
export async function initiateCardPayment(
  _amount: number,
  _orderId: string,
  _customerEmail: string
): Promise<PaymentResult> {
  if (!features.realPayments) {
    return {
      success: true,
      transactionId: `mock-card-${Date.now()}`,
      status: "PAID",
      message: "Card payment simulated.",
    }
  }

  // TODO: Implement Flutterwave card payment
  // See: https://developer.flutterwave.com/reference/endpoints/standard-payment
  return {
    success: false,
    status: "FAILED",
    message: "Card payments not yet implemented.",
  }
}

/**
 * Verify a payment by transaction ID (used in webhook handler).
 */
export async function verifyPayment(transactionId: string): Promise<PaymentResult> {
  // TODO: Call PayPack /transactions/:id endpoint
  return {
    success: true,
    transactionId,
    status: "PAID",
    message: "Verified (stub).",
  }
}
