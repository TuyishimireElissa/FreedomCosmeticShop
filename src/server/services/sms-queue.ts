/**
 * SMS Queue — in-memory queue with priority, retry, and scheduling.
 *
 * For the MVP, we use an in-memory queue. In production, replace with
 * Bull + Redis for persistent, distributed queue processing.
 *
 * Features:
 *   - Priority levels: critical (0), high (1), normal (2), low (3)
 *   - Retry with exponential backoff (3 attempts)
 *   - Scheduled messages (send at a future time)
 *   - Cost optimization: merge messages to the same recipient
 *   - Rate limiting: max 10 SMS per minute per recipient
 *   - Queue stats for admin dashboard
 *
 * Bull/Redis integration (production):
 *   import Bull from 'bull'
 *   const smsQueue = new Bull('sms', process.env.REDIS_URL)
 *   smsQueue.process(async (job) => { ... })
 *   await smsQueue.add({ to, message, template }, { priority, attempts, delay })
 */

import { sendSmsViaProvider, SmsProviderResult } from "./sms"
import { countSmsSegments, estimateSmsCost } from "./sms-templates"

// ─── Types ───────────────────────────────────────────────────────────────────

export type SmsPriority = 0 | 1 | 2 | 3 // critical | high | normal | low

export interface SmsQueueItem {
  id: string
  to: string
  message: string
  template?: string
  priority: SmsPriority
  scheduledAt?: Date
  attempts: number
  maxAttempts: number
  lastError?: string
  status: "queued" | "sending" | "sent" | "failed" | "scheduled"
  createdAt: Date
  sentAt?: Date
  provider?: "AFRICAS_TALKING" | "PINDO" | "SIMULATED"
  messageId?: string
  cost?: number
  segments?: number
}

interface QueueStats {
  total: number
  queued: number
  sending: number
  sent: number
  failed: number
  scheduled: number
  totalCost: number
  totalSegments: number
}

// ─── In-memory storage ───────────────────────────────────────────────────────

const queue: Map<string, SmsQueueItem> = new Map()
const rateLimiter: Map<string, number[]> = new Map() // phone → timestamps

const RATE_LIMIT_PER_MINUTE = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const PROCESS_INTERVAL_MS = 5 * 1000 // Process queue every 5 seconds

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isRateLimited(phone: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimiter.get(phone) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  )
  if (timestamps.length >= RATE_LIMIT_PER_MINUTE) {
    return true
  }
  timestamps.push(now)
  rateLimiter.set(phone, timestamps)
  return false
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Add an SMS to the queue.
 *
 * @param to Recipient phone (+2507XXXXXXXX)
 * @param message Message text
 * @param options Priority, schedule, template info
 * @returns Queue item ID
 */
export function enqueueSms(
  to: string,
  message: string,
  options: {
    priority?: SmsPriority
    scheduledAt?: Date
    template?: string
    maxAttempts?: number
  } = {}
): string {
  const id = generateId()
  const priority = options.priority ?? 2 // normal
  const scheduledAt = options.scheduledAt

  const item: SmsQueueItem = {
    id,
    to,
    message,
    template: options.template,
    priority,
    scheduledAt,
    attempts: 0,
    maxAttempts: options.maxAttempts ?? 3,
    status: scheduledAt && scheduledAt > new Date() ? "scheduled" : "queued",
    createdAt: new Date(),
    segments: countSmsSegments(message),
    cost: estimateSmsCost(message),
  }

  queue.set(id, item)
  console.log(`[SMS Queue] Enqueued ${id} → ${to} (priority: ${priority}, status: ${item.status})`)

  return id
}

/**
 * Process the queue — send due messages.
 * Called on a timer every 5 seconds.
 */
async function processQueue(): Promise<void> {
  const now = new Date()

  // Get all items that are ready to send (queued or scheduled-but-due)
  const ready: SmsQueueItem[] = []
  for (const item of queue.values()) {
    if (item.status === "queued") {
      ready.push(item)
    } else if (item.status === "scheduled" && item.scheduledAt && item.scheduledAt <= now) {
      item.status = "queued"
      ready.push(item)
    }
  }

  // Sort by priority (0 = highest priority first), then by createdAt
  ready.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  // Process up to 20 messages per batch (avoid overwhelming the provider)
  const batch = ready.slice(0, 20)

  for (const item of batch) {
    // Skip if rate limited
    if (isRateLimited(item.to)) {
      console.log(`[SMS Queue] Rate limited: ${item.to}`)
      continue
    }

    // Mark as sending
    item.status = "sending"
    item.attempts++

    try {
      const result: SmsProviderResult = await sendSmsViaProvider(item.to, item.message)

      if (result.success) {
        item.status = "sent"
        item.sentAt = new Date()
        item.provider = result.provider
        item.messageId = result.messageId
        console.log(`[SMS Queue] Sent ${item.id} → ${item.to} via ${result.provider}`)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      item.lastError = error instanceof Error ? error.message : "Unknown error"

      if (item.attempts < item.maxAttempts) {
        // Retry with exponential backoff
        const delayMs = Math.pow(2, item.attempts) * 1000 // 2s, 4s, 8s
        item.status = "queued"
        item.scheduledAt = new Date(Date.now() + delayMs)
        console.warn(
          `[SMS Queue] Retry ${item.attempts}/${item.maxAttempts} for ${item.id} in ${delayMs}ms: ${item.lastError}`
        )
      } else {
        item.status = "failed"
        console.error(`[SMS Queue] Failed ${item.id} after ${item.maxAttempts} attempts: ${item.lastError}`)
      }
    }
  }
}

// Start the queue processor
if (typeof setInterval !== "undefined") {
  setInterval(processQueue, PROCESS_INTERVAL_MS).unref?.()
}

// ─── Stats + management ──────────────────────────────────────────────────────

export function getQueueStats(): QueueStats {
  const items = Array.from(queue.values())
  return {
    total: items.length,
    queued: items.filter((i) => i.status === "queued").length,
    sending: items.filter((i) => i.status === "sending").length,
    sent: items.filter((i) => i.status === "sent").length,
    failed: items.filter((i) => i.status === "failed").length,
    scheduled: items.filter((i) => i.status === "scheduled").length,
    totalCost: items
      .filter((i) => i.status === "sent")
      .reduce((sum, i) => sum + (i.cost || 0), 0),
    totalSegments: items
      .filter((i) => i.status === "sent")
      .reduce((sum, i) => sum + (i.segments || 0), 0),
  }
}

export function getQueueItems(limit = 50): SmsQueueItem[] {
  return Array.from(queue.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
}

export function getQueueItem(id: string): SmsQueueItem | null {
  return queue.get(id) || null
}

/**
 * Cancel a queued/scheduled SMS.
 */
export function cancelSms(id: string): boolean {
  const item = queue.get(id)
  if (!item) return false
  if (item.status === "sent" || item.status === "sending") return false
  item.status = "failed"
  item.lastError = "Cancelled by admin"
  return true
}

/**
 * Clear all sent/failed items (cleanup).
 */
export function clearProcessedItems(): number {
  let cleared = 0
  for (const [id, item] of queue) {
    if (item.status === "sent" || item.status === "failed") {
      queue.delete(id)
      cleared++
    }
  }
  return cleared
}

// ─── Cost optimization: merge messages ───────────────────────────────────────

/**
 * Merge multiple messages to the same recipient into a single SMS.
 * Saves cost by reducing the number of SMS segments.
 *
 * Example:
 *   mergeMessages("+250788123456", ["Order confirmed.", "Delivery in 2 days."])
 *   → "Order confirmed. Delivery in 2 days." (1 SMS instead of 2)
 */
export function enqueueMergedSms(
  to: string,
  messages: string[],
  options: { priority?: SmsPriority; template?: string } = {}
): string {
  const merged = messages.join(" ")
  return enqueueSms(to, merged, options)
}
