/**
 * FEATURE-FLAGGED: Currently disabled. Business decision: WhatsApp-only
 * ordering with payment collected on delivery. This integration is preserved
 * and working — see /api/config/features to re-enable.
 */
/**
 * PayPack Service — Complete MTN MoMo + Airtel Money integration for Rwanda.
 *
 * PayPack is a Rwandan payment aggregator that supports both MTN Mobile Money
 * and Airtel Money through a single API.
 *
 * Documentation: https://docs.paypack.co.rw/
 *
 * Features:
 *   - Authentication with token caching (1-hour expiry)
 *   - Cashin (request money from customer — USSD push)
 *   - Cashout (send money to customer — refunds)
 *   - Transaction status checking
 *   - Webhook event verification
 *   - Phone number validation (+250 format)
 *   - Retry logic with exponential backoff
 *   - Comprehensive error handling
 *
 * Environment variables:
 *   PAYPACK_CLIENT_ID — PayPack client ID
 *   PAYPACK_CLIENT_SECRET — PayPack client secret
 *   PAYPACK_ENVIRONMENT — "production" | "sandbox"
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { env, features } from "@/lib/env"
import { normalizeRwandaPhone, PhoneValidationError } from "@/lib/phone"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaypackToken {
  access: string
  expiresAt: number // Unix timestamp (ms)
}

export interface PaypackCashinParams {
  /** Amount in RWF (integer) */
  amount: number
  /** Customer phone in +2507XXXXXXXX format */
  phone: string
  /** Reference for reconciliation (e.g., order number) */
  reference: string
}

export interface PaypackCashoutParams {
  amount: number
  phone: string
  reference: string
}

export interface PaypackTransaction {
  id: string
  ref: string
  status: "pending" | "success" | "failed"
  amount: number
  phone: string
  network: string
  created_at: string
  processed_at: string | null
  // PayPack includes more fields but we only need these
}

export interface PaypackPaymentResult {
  success: boolean
  transactionId: string
  reference: string
  status: "pending" | "success" | "failed"
  message: string
  /** In dev mode, no real payment is processed */
  simulated: boolean
}

export interface PaypackWebhookEvent {
  id: string
  ref: string
  status: "success" | "failed"
  amount: number
  phone?: string
  number?: string
  network: string
  // PayPack webhook payload
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Verified against https://docs.paypack.rw/quickstart/api-reference — the host
// is payments.paypack.rw. The previous value (api.paypack.co.rw) does not
// resolve in DNS, so every call failed before it left the server.
const PAYPACK_BASE_URL = "https://payments.paypack.rw/api"
// PayPack routes webhooks by mode: a transaction sent in one mode is never
// delivered to a webhook registered in the other. Must match the Mode field on
// the webhook in the PayPack dashboard.
// https://docs.paypack.rw/quickstart/webhooks#troubleshooting
const PAYPACK_WEBHOOK_MODE = env.PAYPACK_ENVIRONMENT === "production" ? "production" : "development"
const TOKEN_TTL_MS = 50 * 60 * 1000 // 50 minutes (PayPack tokens last 1 hour — refresh early)
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff

// ─── Token cache (in-memory, per server instance) ────────────────────────────

let cachedToken: PaypackToken | null = null

// ─── Error class ─────────────────────────────────────────────────────────────

export class PaypackError extends Error {
  code: string
  statusCode: number
  constructor(message: string, code: string = "PAYPACK_ERROR", statusCode: number = 500) {
    super(message)
    this.name = "PaypackError"
    this.code = code
    this.statusCode = statusCode
  }
}

// ─── Status helpers ──────────────────────────────────────────────────────────

/**
 * PayPack reports terminal states as "successful" / "failed" in webhooks and
 * transaction records, while the cashin response returns "pending". Both the
 * short and long spellings are accepted so a wording change on their side
 * cannot silently mark a paid order unpaid.
 * https://docs.paypack.rw/quickstart/webhooks#webhook-events
 */
export function isPaypackSuccess(status: string | undefined): boolean {
  const value = (status || "").toLowerCase()
  return value === "successful" || value === "success"
}

export function isPaypackFailure(status: string | undefined): boolean {
  const value = (status || "").toLowerCase()
  return value === "failed" || value === "failure"
}

// ─── Phone validation ────────────────────────────────────────────────────────

/**
 * Validate and normalize a Rwandan phone number for PayPack.
 * PayPack expects the format 250XXXXXXXXX (no + prefix).
 *
 * Examples:
 *   0788123456      → 250788123456
 *   +250788123456   → 250788123456
 *   250788123456    → 250788123456
 */
export function normalizePhoneForPaypack(phone: string): string {
  try {
    const normalized = normalizeRwandaPhone(phone) // → +2507XXXXXXXX
    return normalized.replace("+", "") // → 2507XXXXXXXX
  } catch (e) {
    if (e instanceof PhoneValidationError) {
      throw new PaypackError(e.message, "INVALID_PHONE", 400)
    }
    throw e
  }
}

/**
 * Detect the mobile network from a phone number.
 * MTN: 078X, 079X
 * Airtel: 072X, 073X
 */
export function detectNetwork(phone: string): "MTN" | "AIRTEL" | "UNKNOWN" {
  try {
    const normalized = normalizeRwandaPhone(phone)
    const prefix = normalized.slice(4, 6) // "78", "79", "72", "73"
    if (prefix === "78" || prefix === "79") return "MTN"
    if (prefix === "72" || prefix === "73") return "AIRTEL"
    return "UNKNOWN"
  } catch {
    return "UNKNOWN"
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

      // Don't retry on client errors (4xx) — they won't succeed
      if (error instanceof PaypackError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error
      }

      // Retry on network errors and 5xx server errors
      if (attempt < MAX_RETRIES - 1) {
        console.warn(
          `[PayPack] ${context} failed (attempt ${attempt + 1}/${MAX_RETRIES}):`,
          lastError.message
        )
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
      }
    }
  }

  throw lastError || new PaypackError(`${context} failed after ${MAX_RETRIES} attempts`)
}

// ─── Authentication ──────────────────────────────────────────────────────────

/**
 * Get a valid PayPack access token.
 * Uses cached token if still valid; otherwise fetches a new one.
 */
export async function getPaypackToken(): Promise<string> {
  // Return cached token if still valid (with 5-minute buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.access
  }

  // Check if credentials are configured
  if (!env.PAYPACK_CLIENT_ID || !env.PAYPACK_CLIENT_SECRET) {
    throw new PaypackError(
      "PayPack credentials not configured. Set PAYPACK_CLIENT_ID and PAYPACK_CLIENT_SECRET.",
      "NOT_CONFIGURED",
      500
    )
  }

  return withRetry(async () => {
    // https://docs.paypack.rw/quickstart/authentication — the documented path
    // is /auth/agents/authorize. /auth/clients/credentials returns 404.
    const res = await fetch(`${PAYPACK_BASE_URL}/auth/agents/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.PAYPACK_CLIENT_ID,
        client_secret: env.PAYPACK_CLIENT_SECRET,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new PaypackError(
        `PayPack authentication failed: ${errText}`,
        "AUTH_FAILED",
        res.status
      )
    }

    const data = (await res.json()) as { access: string; expires_in?: number }
    cachedToken = {
      access: data.access,
      expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : TOKEN_TTL_MS),
    }

    return cachedToken.access
  }, "Authentication")
}

// ─── Cashin (request money from customer) ────────────────────────────────────

/**
 * Initiate a cashin (USSD push) to the customer's phone.
 *
 * The customer will receive a prompt on their phone to approve the payment.
 * Once approved, PayPack sends a webhook to our /api/webhooks/paypack endpoint.
 *
 * @param params Amount, phone, reference
 * @returns Payment result with transaction ID for polling
 */
export async function cashin(params: PaypackCashinParams): Promise<PaypackPaymentResult> {
  // Validate amount
  if (!params.amount || params.amount < 100) {
    throw new PaypackError("Amount must be at least RWF 100", "INVALID_AMOUNT", 400)
  }
  if (params.amount > 5_000_000) {
    throw new PaypackError("Amount cannot exceed RWF 5,000,000", "INVALID_AMOUNT", 400)
  }

  // Validate + normalize phone
  const phone = normalizePhoneForPaypack(params.phone)

  // Validate reference
  if (!params.reference || params.reference.trim().length < 3) {
    throw new PaypackError("Reference is required (min 3 characters)", "INVALID_REFERENCE", 400)
  }

  // ─── Simulation mode (MVP) ────────────────────────────────────────
  if (!features.realPayments || !env.PAYPACK_CLIENT_ID || !env.PAYPACK_CLIENT_SECRET) {
    if (process.env.NODE_ENV === 'production') throw new PaypackError('PayPack is not configured', 'PAYPACK_NOT_CONFIGURED', 503)
    return {
      success: true,
      transactionId: `sim-${Date.now()}`,
      reference: params.reference,
      status: "pending",
      message: `Payment prompt simulated for ${phone}. In production, the customer would receive a USSD prompt.`,
      simulated: true,
    }
  }

  // ─── Real PayPack API call ────────────────────────────────────────
  return withRetry(async () => {
    const token = await getPaypackToken()

    // https://docs.paypack.rw/quickstart/api-reference — the path is
    // /transactions/cashin ("/transactions/cash" 404s).
    const res = await fetch(`${PAYPACK_BASE_URL}/transactions/cashin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Webhook-Mode": PAYPACK_WEBHOOK_MODE,
        // Guards against a retry double-charging the customer.
        "Idempotency-Key": params.reference.slice(0, 32),
      },
      body: JSON.stringify({
        amount: params.amount,
        number: phone,
        reference: params.reference,
      }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      const message = errBody.message || errBody.error || `PayPack cashin failed (${res.status})`
      throw new PaypackError(message, "CASHIN_FAILED", res.status)
    }

    const data = (await res.json()) as PaypackTransaction

    return {
      success: true,
      // The documented cashin response carries `ref` only — there is no `id`
      // field. Falling back to `ref` keeps providerTransactionId populated so
      // the webhook can still match this payment.
      transactionId: data.id || data.ref,
      reference: data.ref || params.reference,
      status: isPaypackSuccess(data.status) ? "success" : isPaypackFailure(data.status) ? "failed" : "pending",
      message: "Payment prompt sent to customer's phone. Awaiting approval.",
      simulated: false,
    }
  }, "Cashin")
}

// ─── Cashout (send money to customer — refunds) ──────────────────────────────

/**
 * Initiate a cashout (send money to customer's phone).
 * Used for refunds.
 *
 * @param params Amount, phone, reference
 * @returns Payment result
 */
export async function cashout(params: PaypackCashoutParams): Promise<PaypackPaymentResult> {
  const phone = normalizePhoneForPaypack(params.phone)

  if (!params.amount || params.amount < 100) {
    throw new PaypackError("Amount must be at least RWF 100", "INVALID_AMOUNT", 400)
  }

  // ─── Simulation mode ──────────────────────────────────────────────
  if (!features.realPayments || !env.PAYPACK_CLIENT_ID || !env.PAYPACK_CLIENT_SECRET) {
    if (process.env.NODE_ENV === 'production') throw new PaypackError('PayPack is not configured', 'PAYPACK_NOT_CONFIGURED', 503)
    return {
      success: true,
      transactionId: `sim-out-${Date.now()}`,
      reference: params.reference,
      status: "success",
      message: "Refund simulated successfully.",
      simulated: true,
    }
  }

  return withRetry(async () => {
    const token = await getPaypackToken()

    const res = await fetch(`${PAYPACK_BASE_URL}/transactions/cashout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Webhook-Mode": PAYPACK_WEBHOOK_MODE,
      },
      body: JSON.stringify({
        amount: params.amount,
        number: phone,
        reference: params.reference,
      }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new PaypackError(
        errBody.message || "Cashout failed",
        "CASHOUT_FAILED",
        res.status
      )
    }

    const data = (await res.json()) as PaypackTransaction

    return {
      success: true,
      transactionId: data.id || data.ref,
      reference: data.ref || params.reference,
      status: isPaypackSuccess(data.status) ? "success" : "pending",
      message: "Refund sent to customer's phone.",
      simulated: false,
    }
  }, "Cashout")
}

// ─── Transaction status ──────────────────────────────────────────────────────

/**
 * Check the status of a PayPack transaction by ID.
 *
 * @param transactionId PayPack transaction ID
 * @returns Transaction details including status
 */
export async function getTransactionStatus(
  transactionId: string
): Promise<PaypackTransaction> {
  if (!transactionId) {
    throw new PaypackError("Transaction ID is required", "INVALID_TX_ID", 400)
  }

  // Simulation mode
  if (!features.realPayments || !env.PAYPACK_CLIENT_ID || !env.PAYPACK_CLIENT_SECRET) {
    if (process.env.NODE_ENV === 'production') throw new PaypackError('PayPack is not configured', 'PAYPACK_NOT_CONFIGURED', 503)
    return {
      id: transactionId,
      ref: `sim-ref-${transactionId}`,
      status: "success",
      amount: 0,
      phone: "",
      network: "MTN",
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    }
  }

  return withRetry(async () => {
    const token = await getPaypackToken()

    const res = await fetch(`${PAYPACK_BASE_URL}/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      throw new PaypackError(
        `Failed to fetch transaction status (${res.status})`,
        "STATUS_CHECK_FAILED",
        res.status
      )
    }

    return (await res.json()) as PaypackTransaction
  }, "Status check")
}

// ─── Webhook verification ────────────────────────────────────────────────────

/**
 * Verify a PayPack webhook event.
 *
 * PayPack sends webhooks with a specific payload structure.
 * In production, you should verify the webhook signature using a shared secret.
 *
 * @param body Raw request body (JSON string)
 * @param signature Header value (if PayPack provides one)
 * @returns Parsed webhook event, or null if invalid
 */
export function verifyWebhookEvent(body: string, signature?: string): PaypackWebhookEvent | null {
  const secret = env.PAYPACK_WEBHOOK_SECRET
  if (!secret || !signature) {
    console.error('[PayPack Webhook] Signing secret or signature missing')
    return null
  }
  // PayPack sends a base64 HMAC-SHA256 of the raw body, not hex.
  // https://docs.paypack.rw/quickstart/webhooks#signature-verification
  const supplied = signature.trim().replace(/^sha256=/i, '')
  const expected = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  let suppliedBuffer: Buffer
  try {
    suppliedBuffer = Buffer.from(supplied, 'base64')
  } catch {
    return null
  }
  const expectedBuffer = Buffer.from(expected, 'base64')
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null
  try {
    const parsed = JSON.parse(body) as unknown
    return normalizeWebhookEvent(parsed)
  } catch {
    console.error('[PayPack Webhook] Failed to parse body')
    return null
  }
}

/**
 * Flatten PayPack's `transaction:processed` envelope into the shape the rest of
 * this codebase already consumes.
 *
 * PayPack sends the transaction nested under `data`, with no top-level id and
 * the customer number in `client`:
 *   { event_id, kind: "transaction:processed", data: { ref, amount, status,
 *     client, provider, ... } }
 * https://docs.paypack.rw/quickstart/webhooks#webhook-events
 *
 * A flat legacy payload is still accepted so existing callers and any older
 * queued deliveries keep working.
 */
export function normalizeWebhookEvent(parsed: unknown): PaypackWebhookEvent | null {
  if (!parsed || typeof parsed !== 'object') return null
  const envelope = parsed as Record<string, unknown>
  const nested = envelope.data
  const source = (nested && typeof nested === 'object' ? nested : envelope) as Record<string, unknown>

  const ref = typeof source.ref === 'string' ? source.ref : ''
  // No id is issued for a cashin, so fall back to ref — that is what was stored
  // as providerTransactionId when the payment was initiated.
  const id = typeof source.id === 'string' && source.id
    ? source.id
    : typeof envelope.event_id === 'string' && !nested
      ? envelope.event_id
      : ref
  const rawStatus = typeof source.status === 'string' ? source.status : ''
  const amount = typeof source.amount === 'number' ? source.amount : Number(source.amount)
  const phone = typeof source.client === 'string'
    ? source.client
    : typeof source.phone === 'string'
      ? source.phone
      : typeof source.number === 'string'
        ? source.number
        : undefined
  const network = typeof source.provider === 'string'
    ? source.provider.toUpperCase()
    : typeof source.network === 'string'
      ? source.network
      : ''

  const status: PaypackWebhookEvent['status'] | null = isPaypackSuccess(rawStatus)
    ? 'success'
    : isPaypackFailure(rawStatus)
      ? 'failed'
      : null

  if (!id || !ref || !status || !Number.isFinite(amount) || amount <= 0 || typeof phone !== 'string') {
    console.error('[PayPack Webhook] Invalid event structure')
    return null
  }

  return { id, ref, status, amount, phone, number: phone, network }
}

// ─── Health check ────────────────────────────────────────────────────────────

/**
 * Check if PayPack is configured and accessible.
 */
export async function healthCheck(): Promise<{ configured: boolean; reachable: boolean }> {
  const configured = !!(env.PAYPACK_CLIENT_ID && env.PAYPACK_CLIENT_SECRET)

  if (!configured) {
    return { configured: false, reachable: false }
  }

  try {
    await getPaypackToken()
    return { configured: true, reachable: true }
  } catch {
    return { configured: true, reachable: false }
  }
}
