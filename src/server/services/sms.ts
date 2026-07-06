/**
 * SMS service — abstraction over Africa's Talking + Pindo.
 *
 * Used to send order status updates to customers:
 *   - Order placed
 *   - Order confirmed
 *   - Order shipped
 *   - Order delivered
 *
 * To complete this integration:
 *   1. Sign up at https://africastalking.com/ → get API key
 *   2. Set AT_USERNAME, AT_API_KEY, AT_SENDER_ID in .env
 *   3. Set ENABLE_SMS_NOTIFICATIONS=true
 */

import { env, features } from "@/lib/env"

export type SmsResult = {
  success: boolean
  messageId?: string
  message: string
}

/**
 * Send an SMS to a Rwandan phone number.
 *
 * @param to    Phone number in any Rwandan format (we normalize to +250XXXXXXXXX)
 * @param body  Message text (max 160 chars per segment)
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  // Normalize the phone number to international format without +
  const normalized = to.replace(/^\+250/, "250").replace(/^0/, "250")

  // ─── Simulation mode ──────────────────────────────────────────────
  if (!features.sms) {
    console.log(`[MOCK SMS] To: ${normalized} | Body: ${body}`)
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      message: "SMS simulated (ENABLE_SMS_NOTIFICATIONS=false).",
    }
  }

  // ─── Africa's Talking ─────────────────────────────────────────────
  if (env.AT_API_KEY && env.AT_USERNAME) {
    try {
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
          message: body,
          from: env.AT_SENDER_ID || "UBUMWE",
        }).toString(),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Africa's Talking error: ${err}`)
      }

      const data = await res.json()
      return {
        success: true,
        messageId: data.SMSMessageData?.Recipients?.[0]?.messageId,
        message: "SMS sent successfully.",
      }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "SMS send failed",
      }
    }
  }

  // ─── Pindo (alternative) ──────────────────────────────────────────
  if (env.PINDO_API_KEY) {
    try {
      const res = await fetch("https://api.pindo.io/v1/sms/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.PINDO_API_KEY}`,
        },
        body: JSON.stringify({
          to: normalized,
          text: body,
          sender: "UBUMWE",
        }),
      })

      if (!res.ok) throw new Error(`Pindo error: ${await res.text()}`)

      const data = await res.json()
      return {
        success: true,
        messageId: data.id,
        message: "SMS sent via Pindo.",
      }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "SMS send failed",
      }
    }
  }

  return {
    success: false,
    message: "No SMS provider configured.",
  }
}

/**
 * Send an order status update SMS to the customer.
 * Convenience wrapper that formats the message.
 */
export async function sendOrderStatusSms(
  phone: string,
  orderNumber: string,
  status: string
): Promise<SmsResult> {
  const messages: Record<string, string> = {
    PENDING: `Ubumwe Beauty: Order ${orderNumber} received. We'll confirm shortly.`,
    CONFIRMED: `Ubumwe Beauty: Order ${orderNumber} confirmed. Preparing your items.`,
    PROCESSING: `Ubumwe Beauty: Order ${orderNumber} is being processed.`,
    SHIPPED: `Ubumwe Beauty: Order ${orderNumber} is on the way! Track at ubumwe.beauty.`,
    DELIVERED: `Ubumwe Beauty: Order ${orderNumber} delivered. Thank you for shopping with us!`,
    CANCELLED: `Ubumwe Beauty: Order ${orderNumber} was cancelled. Call +250788123456 for help.`,
  }
  const body = messages[status] || `Ubumwe Beauty: Order ${orderNumber} status: ${status}.`
  return sendSms(phone, body)
}
