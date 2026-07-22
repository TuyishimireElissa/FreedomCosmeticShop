/**
 * Flutterwave Service — Complete card payment integration for Rwanda.
 *
 * Flutterwave supports Visa, Mastercard, and Amex in Rwanda.
 * We use the Standard Payment (redirect) flow for 3D Secure compliance.
 *
 * Documentation: https://developer.flutterwave.com/
 *
 * Features:
 *   - Card payment initialization (redirect to Flutterwave secure page)
 *   - Payment verification (confirm payment status)
 *   - Refund processing
 *   - Webhook signature verification
 *   - Rwanda-specific configuration (RWF currency)
 *   - Retry logic with exponential backoff
 *
 * Environment variables:
 *   FLW_SECRET_KEY — Flutterwave secret key (FLWSECK-...)
 *   FLW_PUBLIC_KEY — Flutterwave public key (FLWPUBK-...)
 *   FLW_ENCRYPTION_KEY — Flutterwave encryption key
 *   FLW_WEBHOOK_HASH — Webhook verification hash
 */

import { timingSafeEqual } from 'node:crypto'
import { env, features } from "@/lib/env"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlutterwaveInitParams {
  /** Amount in RWF (integer) */
  amount: number
  /** Unique transaction reference (e.g., order number) */
  txRef: string
  /** Customer details */
  customer: {
    name: string
    email: string
    phone?: string
  }
  /** Payment options: card, mobilemoneyrwanda, etc. */
  paymentOptions?: string
  /** Redirect URL after payment */
  redirectUrl?: string
  /** Meta data (optional) */
  meta?: Record<string, string>
}

export interface FlutterwaveInitResult {
  success: boolean
  status: string
  message: string
  /** Payment link — redirect customer here */
  paymentLink: string | null
  /** Flutterwave transaction reference */
  txRef: string
  simulated: boolean
}

export interface FlutterwaveVerifyResult {
  success: boolean
  status: "success" | "failed" | "pending" | "cancelled"
  txRef: string
  flwRef: string
  amount: number
  currency: string
  paymentType: string
  customer: {
    name: string
    email: string
    phone: string | null
  }
  card: {
    last4: string | null
    brand: string | null
  } | null
  message: string
  simulated: boolean
}

export interface FlutterwaveRefundResult {
  success: boolean
  refundId: string | null
  message: string
  simulated: boolean
}

export interface FlutterwaveWebhookEvent {
  event: string
  "event.type": string
  data: {
    id: number
    tx_ref: string
    flw_ref: string
    amount: number
    currency: string
    status: string
    payment_type: string
    customer: {
      name: string
      email: string
      phone_number: string | null
    }
    card: {
      first_6characters: string | null
      last_4characters: string | null
      issuer: string | null
      country: string | null
      type: string | null
    } | null
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FLW_BASE_URL = "https://api.flutterwave.com/v3"
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000]

// ─── Error class ─────────────────────────────────────────────────────────────

export class FlutterwaveError extends Error {
  code: string
  statusCode: number
  constructor(message: string, code: string = "FLW_ERROR", statusCode: number = 500) {
    super(message)
    this.name = "FlutterwaveError"
    this.code = code
    this.statusCode = statusCode
  }
}

// ─── Retry wrapper ───────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Don't retry on client errors (4xx)
      if (error instanceof FlutterwaveError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error
      }

      if (attempt < MAX_RETRIES - 1) {
        console.warn(
          `[Flutterwave] ${context} failed (attempt ${attempt + 1}/${MAX_RETRIES}):`,
          lastError.message
        )
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
      }
    }
  }

  throw lastError || new FlutterwaveError(`${context} failed after ${MAX_RETRIES} attempts`)
}

// ─── Payment initialization ──────────────────────────────────────────────────

/**
 * Initialize a card payment via Flutterwave Standard Payment.
 *
 * Returns a payment link that the customer should be redirected to.
 * After payment, Flutterwave redirects back to the redirectUrl.
 *
 * @param params Payment details
 * @returns Payment link + transaction reference
 */
export async function initializePayment(
  params: FlutterwaveInitParams
): Promise<FlutterwaveInitResult> {
  // Validate amount
  if (!params.amount || params.amount < 100) {
    throw new FlutterwaveError("Amount must be at least RWF 100", "INVALID_AMOUNT", 400)
  }

  // Validate txRef
  if (!params.txRef || params.txRef.trim().length < 3) {
    throw new FlutterwaveError("Transaction reference is required", "INVALID_TX_REF", 400)
  }

  // Validate customer
  if (!params.customer.email) {
    throw new FlutterwaveError("Customer email is required for card payments", "INVALID_CUSTOMER", 400)
  }

  // ─── Simulation mode ──────────────────────────────────────────────
  if (!features.realPayments || !env.FLW_SECRET_KEY) {
    return {
      success: true,
      status: "success",
      message: "Payment initialized (simulated). In production, returns a redirect link.",
      paymentLink: null,
      txRef: params.txRef,
      simulated: true,
    }
  }

  // ─── Real Flutterwave API call ────────────────────────────────────
  return withRetry(async () => {
    const res = await fetch(`${FLW_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
      },
      body: JSON.stringify({
        tx_ref: params.txRef,
        amount: params.amount,
        currency: "RWF",
        redirect_url: params.redirectUrl || `${env.APP_URL}/checkout`,
        customer: {
          email: params.customer.email,
          phonenumber: params.customer.phone || "",
          name: params.customer.name,
        },
        customizations: {
          title: "FreedomCosmeticShop",
          description: `Order ${params.txRef}`,
          logo: `${env.APP_URL}/logo.svg`,
        },
        payment_options: params.paymentOptions || "card",
        meta: params.meta,
      }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new FlutterwaveError(
        errBody.message || `Flutterwave initialization failed (${res.status})`,
        "INIT_FAILED",
        res.status
      )
    }

    const data = await res.json() as {
      status: string
      message: string
      data: { link: string }
    }

    if (data.status !== "success" || !data.data?.link) {
      throw new FlutterwaveError(
        data.message || "Flutterwave initialization failed",
        "INIT_FAILED"
      )
    }

    return {
      success: true,
      status: data.status,
      message: data.message,
      paymentLink: data.data.link,
      txRef: params.txRef,
      simulated: false,
    }
  }, "Payment initialization")
}

// ─── Payment verification ────────────────────────────────────────────────────

/**
 * Verify a payment by transaction reference.
 *
 * IMPORTANT: Always verify payments server-side before fulfilling orders.
 * Never trust the redirect URL parameters alone.
 *
 * @param txRef Transaction reference (from initialization)
 * @returns Verification result with payment details
 */
export async function verifyPayment(
  txRef: string
): Promise<FlutterwaveVerifyResult> {
  if (!txRef) {
    throw new FlutterwaveError("Transaction reference is required", "INVALID_TX_REF", 400)
  }

  // ─── Simulation mode ──────────────────────────────────────────────
  if (!features.realPayments || !env.FLW_SECRET_KEY) {
    return {
      success: true,
      status: "success",
      txRef,
      flwRef: `sim-flw-${Date.now()}`,
      amount: 0,
      currency: "RWF",
      paymentType: "card",
      customer: {
        name: "Simulated Customer",
        email: "simulated@example.com",
        phone: null,
      },
      card: {
        last4: "4242",
        brand: "visa",
      },
      message: "Payment verified (simulated).",
      simulated: true,
    }
  }

  return withRetry(async () => {
    const res = await fetch(`${FLW_BASE_URL}/transactions/verify?tx_ref=${encodeURIComponent(txRef)}`, {
      headers: {
        Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
      },
    })

    if (!res.ok) {
      throw new FlutterwaveError(
        `Verification failed (${res.status})`,
        "VERIFY_FAILED",
        res.status
      )
    }

    const data = await res.json() as {
      status: string
      message: string
      data: {
        tx_ref: string
        flw_ref: string
        amount: number
        currency: string
        status: string
        payment_type: string
        customer: { name: string; email: string; phone_number: string | null }
        card: {
          last_4characters: string | null
          issuer: string | null
          type: string | null
        } | null
      }
    }

    if (data.status !== "success") {
      throw new FlutterwaveError(
        data.message || "Verification failed",
        "VERIFY_FAILED"
      )
    }

    const tx = data.data
    return {
      success: tx.status === "successful",
      status: tx.status === "successful" ? "success" : tx.status === "failed" ? "failed" : "pending",
      txRef: tx.tx_ref,
      flwRef: tx.flw_ref,
      amount: tx.amount,
      currency: tx.currency,
      paymentType: tx.payment_type,
      customer: {
        name: tx.customer.name,
        email: tx.customer.email,
        phone: tx.customer.phone_number,
      },
      card: tx.card
        ? {
            last4: tx.card.last_4characters,
            brand: tx.card.type || tx.card.issuer,
          }
        : null,
      message: data.message,
      simulated: false,
    }
  }, "Payment verification")
}

// ─── Refund ──────────────────────────────────────────────────────────────────

/**
 * Process a refund for a Flutterwave transaction.
 *
 * @param flwRef Flutterwave transaction reference (flw_ref, not tx_ref)
 * @param amount Refund amount (RWF). Must be <= original amount.
 * @returns Refund result
 */
export async function refundPayment(
  flwRef: string,
  amount: number
): Promise<FlutterwaveRefundResult> {
  if (!flwRef) {
    throw new FlutterwaveError("Flutterwave reference is required", "INVALID_REF", 400)
  }
  if (!amount || amount < 100) {
    throw new FlutterwaveError("Refund amount must be at least RWF 100", "INVALID_AMOUNT", 400)
  }

  // Simulation mode
  if (!features.realPayments || !env.FLW_SECRET_KEY) {
    return {
      success: true,
      refundId: `sim-refund-${Date.now()}`,
      message: "Refund simulated successfully.",
      simulated: true,
    }
  }

  return withRetry(async () => {
    const res = await fetch(`${FLW_BASE_URL}/transactions/${flwRef}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount,
        comments: `Refund for order — ${new Date().toISOString()}`,
      }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new FlutterwaveError(
        errBody.message || "Refund failed",
        "REFUND_FAILED",
        res.status
      )
    }

    const data = await res.json() as {
      status: string
      message: string
      data: { id: number }
    }

    return {
      success: data.status === "success",
      refundId: String(data.data?.id || ""),
      message: data.message,
      simulated: false,
    }
  }, "Refund")
}

// ─── Webhook verification ────────────────────────────────────────────────────

/**
 * Verify a Flutterwave webhook event.
 *
 * Flutterwave signs webhooks with a secret hash (FLW_WEBHOOK_HASH).
 * The signature is sent in the `verif-hash` header.
 *
 * @param body Raw request body (JSON string)
 * @param signature Value of the `verif-hash` header
 * @returns Parsed webhook event, or null if invalid
 */
export function verifyWebhookEvent(
  body: string,
  signature?: string
): FlutterwaveWebhookEvent | null {
  // Check if webhook hash is configured
  if (!env.FLW_WEBHOOK_HASH) {
    console.error("[Flutterwave Webhook] FLW_WEBHOOK_HASH not configured")
    return null
  }

  // Verify the configured hash without a direct string comparison.
  if (!signature) return null
  const supplied = Buffer.from(signature)
  const expected = Buffer.from(env.FLW_WEBHOOK_HASH)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    console.error("[Flutterwave Webhook] Invalid signature")
    return null
  }

  try {
    const event = JSON.parse(body) as FlutterwaveWebhookEvent

    // Basic validation
    if (!event.event || !event.data?.tx_ref || !Number.isFinite(event.data.amount) || event.data.amount <= 0 || event.data.currency !== 'RWF') {
      console.error("[Flutterwave Webhook] Invalid event structure")
      return null
    }

    return event
  } catch (e) {
    console.error("[Flutterwave Webhook] Failed to parse body:", e)
    return null
  }
}

// ─── Health check ────────────────────────────────────────────────────────────

/**
 * Check if Flutterwave is configured.
 */
export function isConfigured(): boolean {
  return !!(env.FLW_SECRET_KEY && env.FLW_PUBLIC_KEY)
}

// ─── Generate transaction reference ──────────────────────────────────────────

/**
 * Generate a unique transaction reference for Flutterwave.
 * Format: UB-{orderNumber}-{timestamp}
 */
export function generateTxRef(orderNumber: string): string {
  return `UB-${orderNumber}-${Date.now()}`
}
