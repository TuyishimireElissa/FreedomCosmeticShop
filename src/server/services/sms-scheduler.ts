/**
 * SMS Scheduler — scheduled promotional SMS + abandoned cart detection.
 *
 * Features:
 *   - Schedule promotional SMS to be sent at a future date/time
 *   - Abandoned cart SMS (sent 2 hours after cart abandonment)
 *   - Weekly newsletter SMS (optional)
 *   - Automatic customer language detection (EN/RW)
 *
 * For MVP, schedules are stored in-memory. In production, use a cron job
 * or Bull recurring job to process scheduled SMS.
 */

import { enqueueSms } from "./sms-queue"
import { getSmsMessage, type SmsLanguage, type SmsTemplateKey } from "./sms-templates"
import { hasOptedOut, sendSmsViaProvider } from "./sms"
import { db } from "@/lib/db"
import { features } from "@/lib/env"
import { hasCurrentRetentionConsent } from "./retention-messaging"
import { SEO_CONFIG } from "@/lib/seo-config"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScheduledSms {
  id: string
  name: string
  message: string
  templateKey?: SmsTemplateKey
  language: SmsLanguage
  /** Recipient phone (or "all_customers" for broadcast) */
  recipients: string[]
  scheduledAt: Date
  status: "scheduled" | "sent" | "cancelled"
  createdAt: Date
  sentAt?: Date
  sentCount?: number
}

interface AbandonedCart {
  userId: string
  itemCount: number
  cartValue: number
  abandonedAt: Date
  notified: boolean
}

// ─── In-memory storage ───────────────────────────────────────────────────────

const scheduledSmsList: Map<string, ScheduledSms> = new Map()
const abandonedCarts: Map<string, AbandonedCart> = new Map()

// ─── Scheduled SMS ───────────────────────────────────────────────────────────

/**
 * Schedule an SMS to be sent at a future time.
 */
export function scheduleSms(
  name: string,
  message: string,
  recipients: string[],
  scheduledAt: Date,
  options: { templateKey?: SmsTemplateKey; language?: SmsLanguage } = {}
): string {
  const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const item: ScheduledSms = {
    id,
    name,
    message,
    templateKey: options.templateKey,
    language: options.language || "en",
    recipients,
    scheduledAt,
    status: "scheduled",
    createdAt: new Date(),
  }
  scheduledSmsList.set(id, item)
  console.log(`[SMS Scheduler] Scheduled "${name}" for ${scheduledAt.toISOString()}`)
  return id
}

/**
 * Get all scheduled SMS.
 */
export function getScheduledSms(): ScheduledSms[] {
  return Array.from(scheduledSmsList.values()).sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
  )
}

/**
 * Cancel a scheduled SMS.
 */
export function cancelScheduledSms(id: string): boolean {
  const item = scheduledSmsList.get(id)
  if (!item || item.status === "sent") return false
  item.status = "cancelled"
  return true
}

/**
 * Process scheduled SMS — called on a timer.
 * Sends any scheduled SMS that are due.
 */
async function processScheduledSms(): Promise<void> {
  const now = new Date()

  for (const item of scheduledSmsList.values()) {
    if (item.status !== "scheduled") continue
    if (item.scheduledAt > now) continue

    // Due — send it
    let sentCount = 0
    for (const phone of item.recipients) {
      // Check opt-out
      if (hasOptedOut(phone)) continue

      const message = item.templateKey
        ? getSmsMessage(item.templateKey, item.language, { message: item.message })
        : item.message

      enqueueSms(phone, message, {
        priority: 3, // low priority for promotional
        template: item.templateKey,
      })
      sentCount++
    }

    item.status = "sent"
    item.sentAt = new Date()
    item.sentCount = sentCount
    console.log(`[SMS Scheduler] Sent "${item.name}" to ${sentCount} recipients`)
  }
}

// ─── Abandoned cart detection ────────────────────────────────────────────────

const ABANDONED_CART_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours

/**
 * Track a cart event (when a user adds/updates items in cart).
 * If the cart is not checked out within 2 hours, send abandoned cart SMS.
 *
 * For MVP, this is called from the frontend via an API route.
 * In production, this would be triggered by cart activity events.
 */
export function trackCartActivity(userId: string, itemCount: number, cartValue: number): void {
  abandonedCarts.set(userId, {
    userId,
    itemCount,
    cartValue,
    abandonedAt: new Date(),
    notified: false,
  })
}

/**
 * Clear cart tracking when an order is placed.
 */
export function clearCartTracking(userId: string): void {
  abandonedCarts.delete(userId)
}

/**
 * Process abandoned carts — called on a timer.
 * Sends SMS to users whose carts have been abandoned for 2+ hours.
 */
async function processAbandonedCarts(): Promise<void> {
  const now = Date.now()

  for (const [, cart] of abandonedCarts) {
    if (cart.notified) continue

    const elapsed = now - cart.abandonedAt.getTime()
    if (elapsed < ABANDONED_CART_THRESHOLD_MS) continue

    // Resolve contact information only at send time and require current channel
    // plus abandoned-cart purpose consent. Disabled providers never simulate or
    // log recipient details for retention messages.
    const preference = await db.communicationPreference.findUnique({
      where: { userId: cart.userId },
      include: { user: { select: { phone: true, isDeleted: true } } },
    })
    if (!preference || preference.user.isDeleted || !hasCurrentRetentionConsent(preference, 'SMS', 'ABANDONED_CART')) {
      abandonedCarts.delete(cart.userId)
      continue
    }
    if (!features.sms) continue

    const message = getSmsMessage("ABANDONED_CART", preference.language === 'en' ? 'en' : 'rw', {
      itemCount: cart.itemCount,
      cartLink: `${SEO_CONFIG.siteUrl}/cart`,
    })
    const result = await sendSmsViaProvider(preference.user.phone, message).catch(() => null)
    if (result?.success && result.provider !== 'SIMULATED') cart.notified = true
  }
}

// ─── Broadcast to all customers ──────────────────────────────────────────────

/**
 * Schedule a promotional SMS to all customers.
 *
 * In production, this would query the User model for all phone numbers.
 * For MVP, we just log the intent.
 */
export async function scheduleBroadcast(
  name: string,
  message: string,
  scheduledAt: Date,
  language: SmsLanguage = "en"
): Promise<string> {
  // Fetch all customer phone numbers from DB
  const customers = await db.user.findMany({
    where: {
      role: "CUSTOMER",
      isDeleted: false,
      phone: { not: "" },
    },
    select: { phone: true },
  })

  const recipients = customers.map((c) => c.phone)
  console.log(`[SMS Scheduler] Broadcast "${name}" scheduled for ${recipients.length} customers`)

  return scheduleSms(name, message, recipients, scheduledAt, { language })
}

// ─── Start timers ────────────────────────────────────────────────────────────

if (typeof setInterval !== "undefined") {
  // Process scheduled SMS every 1 minute
  setInterval(processScheduledSms, 60 * 1000).unref?.()

  // Process abandoned carts every 10 minutes
  setInterval(processAbandonedCarts, 10 * 60 * 1000).unref?.()
}
