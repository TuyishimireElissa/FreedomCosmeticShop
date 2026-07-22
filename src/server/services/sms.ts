/**
 * SMS Service — Complete Rwanda SMS integration with Africa's Talking + Pindo.
 *
 * Features:
 *   - Africa's Talking as primary provider
 *   - Pindo as fallback provider
 *   - Automatic provider failover
 *   - Opt-out checking (respects customer preferences)
 *   - Delivery tracking (messageId returned by provider)
 *   - Phone number normalization (+250)
 *   - Simulation mode for development
 *
 * Environment variables:
 *   AT_USERNAME — Africa's Talking username
 *   AT_API_KEY — Africa's Talking API key
 *   AT_SENDER_ID — Alphanumeric sender ID (max 11 chars)
 *   PINDO_API_KEY — Pindo API key (backup)
 *
 * Opt-out:
 *   Customers can opt out of promotional SMS via /api/sms/opt-out.
 *   Transactional SMS (order updates, OTP) always send.
 */

import { env, features } from "@/lib/env"
import { normalizeRwandaPhone } from "@/lib/phone"
import { isCriticalTemplate, type SmsTemplateKey } from "./sms-templates"
import { resolveTranslation } from "@/lib/i18n"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SmsResult {
  success: boolean
  messageId?: string
  message: string
  provider?: "AFRICAS_TALKING" | "PINDO" | "SIMULATED"
  cost?: number
}

export interface SmsProviderResult {
  success: boolean
  messageId?: string
  message: string
  provider: "AFRICAS_TALKING" | "PINDO" | "SIMULATED"
}

// ─── Opt-out registry (in-memory for MVP; use DB in production) ──────────────

const optedOutPhones = new Set<string>()

/**
 * Check if a phone number has opted out of promotional SMS.
 */
export function hasOptedOut(phone: string): boolean {
  const normalized = normalizeRwandaPhoneSafe(phone)
  return optedOutPhones.has(normalized)
}

/**
 * Opt a phone number out of promotional SMS.
 */
export function optOut(phone: string): void {
  const normalized = normalizeRwandaPhoneSafe(phone)
  optedOutPhones.add(normalized)
}

/**
 * Opt a phone number back in.
 */
export function optIn(phone: string): void {
  const normalized = normalizeRwandaPhoneSafe(phone)
  optedOutPhones.delete(normalized)
}

/**
 * Check if SMS should be sent to a recipient.
 * Returns { shouldSend: boolean, reason: string }
 */
export function shouldSendSms(
  phone: string,
  templateKey?: SmsTemplateKey
): { shouldSend: boolean; reason: string } {
  // Critical templates (OTP, order updates) always send
  if (templateKey && isCriticalTemplate(templateKey)) {
    return { shouldSend: true, reason: resolveTranslation('en', 'sms.reason_transactional') }
  }

  // Check opt-out for non-critical (promotional, abandoned cart, etc.)
  if (hasOptedOut(phone)) {
    return { shouldSend: false, reason: resolveTranslation('en', 'sms.reason_opted_out') }
  }

  return { shouldSend: true, reason: resolveTranslation('en', 'sms.reason_ok') }
}

// ─── Phone normalization ─────────────────────────────────────────────────────

function normalizeRwandaPhoneSafe(phone: string): string {
  try {
    return normalizeRwandaPhone(phone)
  } catch {
    return phone // Return as-is if invalid
  }
}

// ─── Africa's Talking provider ───────────────────────────────────────────────

async function sendViaAfricasTalking(
  to: string,
  message: string
): Promise<SmsProviderResult> {
  if (!env.AT_API_KEY || !env.AT_USERNAME) {
    throw new Error(resolveTranslation('en', 'sms.at_not_configured'))
  }

  // Africa's Talking requires E.164 international format, including the +.
  const normalized = normalizeRwandaPhone(to)

  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey: env.AT_API_KEY,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      username: env.AT_USERNAME,
      to: normalized,
      message,
      from: env.AT_SENDER_ID || "FREEDOM",
    }).toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(resolveTranslation('en', 'sms.at_error', { error: err }))
  }

  const data = await res.json()
  const recipient = data.SMSMessageData?.Recipients?.[0]

  if (!recipient || recipient.status !== "Success") {
    throw new Error(recipient?.status || resolveTranslation('en', 'sms.at_delivery_failed'))
  }

  return {
    success: true,
    messageId: recipient.messageId,
    message: resolveTranslation('en', 'sms.sent_via_at'),
    provider: "AFRICAS_TALKING",
  }
}

// ─── Pindo provider (fallback) ───────────────────────────────────────────────

async function sendViaPindo(
  to: string,
  message: string
): Promise<SmsProviderResult> {
  if (!env.PINDO_API_KEY) {
    throw new Error(resolveTranslation('en', 'sms.pindo_not_configured'))
  }

  // Pindo also documents E.164 recipients such as +250781234567.
  const normalized = normalizeRwandaPhone(to)

  const res = await fetch("https://api.pindo.io/v1/sms/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PINDO_API_KEY}`,
    },
    body: JSON.stringify({
      to: normalized,
      text: message,
      sender: "FREEDOM",
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(resolveTranslation('en', 'sms.pindo_error', { error: err }))
  }

  const data = await res.json()

  return {
    success: true,
    messageId: data.id || data.message_id,
    message: resolveTranslation('en', 'sms.sent_via_pindo'),
    provider: "PINDO",
  }
}

// ─── Provider with fallback ──────────────────────────────────────────────────

/**
 * Send SMS via provider with automatic fallback.
 *
 * Tries Africa's Talking first, falls back to Pindo on failure.
 * In simulation mode, returns a synthetic success without logging customer data.
 *
 * This is the low-level send function used by the SMS queue.
 * For most use cases, use sendSms() which checks opt-out + queues.
 */
export async function sendSmsViaProvider(
  to: string,
  message: string
): Promise<SmsProviderResult> {
  // ─── Simulation mode ──────────────────────────────────────────────
  if (!features.sms) {
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      message: resolveTranslation('en', 'sms.simulated'),
      provider: "SIMULATED",
    }
  }

  // ─── Try Africa's Talking first ───────────────────────────────────
  try {
    return await sendViaAfricasTalking(to, message)
  } catch (atError) {
    console.warn("[SMS] Africa's Talking failed, trying Pindo:", atError instanceof Error ? atError.message : atError)

    // ─── Fallback to Pindo ────────────────────────────────────────
    try {
      return await sendViaPindo(to, message)
    } catch (pindoError) {
      console.error("[SMS] Pindo also failed:", pindoError instanceof Error ? pindoError.message : pindoError)
      return {
        success: false,
        message: resolveTranslation('en', 'sms.providers_failed', { atError: atError instanceof Error ? atError.message : resolveTranslation('en', 'sms.unknown'), pindoError: pindoError instanceof Error ? pindoError.message : resolveTranslation('en', 'sms.unknown') }),
        provider: "AFRICAS_TALKING",
      }
    }
  }
}

// ─── High-level send (with opt-out check) ────────────────────────────────────

/**
 * Send an SMS to a recipient.
 *
 * Checks opt-out status (for non-critical templates) before sending.
 * Uses the SMS queue for delivery (priority, retry, scheduling).
 *
 * @param to Recipient phone (+2507XXXXXXXX)
 * @param message Message text
 * @param templateKey Template key (for opt-out checking)
 * @returns SmsResult
 */
export async function sendSms(
  to: string,
  message: string,
  templateKey?: SmsTemplateKey
): Promise<SmsResult> {
  // Check opt-out
  const { shouldSend, reason } = shouldSendSms(to, templateKey)
  if (!shouldSend) {
    return {
      success: false,
      message: resolveTranslation('en', 'sms.not_sent', { reason }),
    }
  }

  // Send directly (bypassing queue for immediate delivery)
  const result = await sendSmsViaProvider(to, message)
  return result
}

// ─── Delivery tracking ───────────────────────────────────────────────────────

/**
 * Delivery status tracking.
 *
 * Africa's Talking supports delivery reports via webhook.
 * To enable: configure a delivery report callback URL in your AT dashboard.
 * The webhook should call a handler that updates the delivery status.
 *
 * For MVP, we track sent/failed at the queue level.
 * In production, add a DeliveryReport model to track per-message status:
 *   - SENT (provider accepted)
 *   - DELIVERED (handset received)
 *   - FAILED (delivery failed)
 */

interface DeliveryReport {
  messageId: string
  status: "SENT" | "DELIVERED" | "FAILED" | "PENDING"
  phoneNumber: string
  retryCount: number
  updatedAt: Date
}

const deliveryReports = new Map<string, DeliveryReport>()

export function recordDeliveryReport(
  messageId: string,
  status: DeliveryReport["status"],
  phoneNumber: string
): void {
  const existing = deliveryReports.get(messageId)
  deliveryReports.set(messageId, {
    messageId,
    status,
    phoneNumber,
    retryCount: existing?.retryCount || 0,
    updatedAt: new Date(),
  })
}

export function getDeliveryReport(messageId: string): DeliveryReport | null {
  return deliveryReports.get(messageId) || null
}

export function getDeliveryStats(): {
  total: number
  sent: number
  delivered: number
  failed: number
  pending: number
} {
  const reports = Array.from(deliveryReports.values())
  return {
    total: reports.length,
    sent: reports.filter((r) => r.status === "SENT").length,
    delivered: reports.filter((r) => r.status === "DELIVERED").length,
    failed: reports.filter((r) => r.status === "FAILED").length,
    pending: reports.filter((r) => r.status === "PENDING").length,
  }
}
