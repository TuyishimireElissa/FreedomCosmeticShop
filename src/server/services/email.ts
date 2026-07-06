/**
 * Email service — abstraction over Resend.
 *
 * Used for:
 *   - Order confirmation emails
 *   - Order status updates
 *   - Password reset (when auth is enabled)
 *   - Newsletter (optional)
 *
 * To complete this integration:
 *   1. Sign up at https://resend.com/ → get API key
 *   2. Set RESEND_API_KEY, EMAIL_FROM in .env
 *   3. Set ENABLE_EMAIL_NOTIFICATIONS=true
 *   4. Verify your sending domain in Resend dashboard
 */

import { env, features } from "@/lib/env"

export type EmailResult = {
  success: boolean
  messageId?: string
  message: string
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send a transactional email via Resend.
 */
export async function sendEmail(opts: EmailOptions): Promise<EmailResult> {
  // ─── Simulation mode ──────────────────────────────────────────────
  if (!features.email) {
    console.log(`[MOCK EMAIL] To: ${opts.to} | Subject: ${opts.subject}`)
    console.log(opts.text || opts.html.substring(0, 200) + "...")
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      message: "Email simulated (ENABLE_EMAIL_NOTIFICATIONS=false).",
    }
  }

  if (!env.RESEND_API_KEY) {
    return {
      success: false,
      message: "Resend API key not configured.",
    }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || "Ubumwe Beauty <hello@ubumwe.beauty>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: env.EMAIL_REPLY_TO,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resend error: ${err}`)
    }

    const data = await res.json()
    return {
      success: true,
      messageId: data.id,
      message: "Email sent successfully.",
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Email send failed",
    }
  }
}

/**
 * Send an order confirmation email.
 * Stub — replace with a proper React Email template.
 */
export async function sendOrderConfirmationEmail(
  to: string,
  orderNumber: string,
  total: number
): Promise<EmailResult> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #b76e79;">Thank you for your order!</h1>
      <p>Hi there,</p>
      <p>We've received your order <strong>${orderNumber}</strong> totalling <strong>RWF ${total.toLocaleString()}</strong>.</p>
      <p>We'll send you another email when your order ships.</p>
      <p>Warm regards,<br>The Ubumwe Beauty team</p>
    </div>
  `
  return sendEmail({
    to,
    subject: `Order ${orderNumber} confirmed`,
    html,
    text: `Order ${orderNumber} confirmed. Total: RWF ${total}.`,
  })
}
