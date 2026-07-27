/**
 * Live Stats — real-time visitor tracking + revenue ticker.
 *
 * Tracks active storefront visitors by counting connected SSE clients
 * (each EventSource connection = 1 active visitor). Also tracks
 * real-time revenue by listening to payment:confirmed events.
 *
 * This is a module-level singleton — data lives in memory for the
 * lifetime of the process. For multi-process deployments, you'd use
 * Redis instead.
 */

import { subscribeToRealtimeEvents, getListenerCount, type RealtimeEvent } from "@/lib/event-bus"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LiveStats {
  activeVisitors: number
  todayRevenue: number
  todayOrderCount: number
  liveEvents: LiveEvent[]
}

export interface LiveEvent {
  id: string
  type: "order" | "payment" | "product" | "visitor" | "system"
  title: string
  message: string
  timestamp: string
}

// ─── Singleton state ─────────────────────────────────────────────────────────

const globalForLiveStats = globalThis as unknown as {
  __freedomLiveStats?: {
    todayRevenue: number
    todayOrderCount: number
    liveEvents: LiveEvent[]
    initialized: boolean
  }
}

const state = globalForLiveStats.__freedomLiveStats ?? {
  todayRevenue: 0,
  todayOrderCount: 0,
  liveEvents: [] as LiveEvent[],
  initialized: false,
}

if (!globalForLiveStats.__freedomLiveStats) {
  globalForLiveStats.__freedomLiveStats = state
}

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize the live stats listener. Called once on first access.
 * Subscribes to the event bus and updates stats in real-time.
 */
function initializeIfNeeded() {
  if (state.initialized) return
  state.initialized = true

  subscribeToRealtimeEvents((evt: RealtimeEvent) => {
    // Add to live events feed (keep last 50)
    const liveEvent = mapEventToLiveEvent(evt)
    if (liveEvent) {
      state.liveEvents.unshift(liveEvent)
      state.liveEvents = state.liveEvents.slice(0, 50)
    }

    // Track revenue on payment:confirmed
    if (evt.event === "payment:confirmed") {
      const p = evt.data as { amount?: number }
      if (p.amount) {
        state.todayRevenue += p.amount
      }
    }

    // Track order count on order:new
    if (evt.event === "order:new") {
      state.todayOrderCount++
    }
  })
}

function mapEventToLiveEvent(evt: RealtimeEvent): LiveEvent | null {
  const ts = evt.timestamp

  if (evt.event === "order:new") {
    const o = evt.data as { orderNumber?: string; total?: number; customerName?: string }
    return {
      id: `${evt.event}-${ts}`,
      type: "order",
      title: "New order",
      message: `${o.orderNumber || ""} — ${o.customerName || "Customer"} — ${o.total || 0} RWF`,
      timestamp: ts,
    }
  }

  if (evt.event === "payment:confirmed") {
    const p = evt.data as { orderNumber?: string; amount?: number; method?: string }
    return {
      id: `${evt.event}-${ts}`,
      type: "payment",
      title: "Payment confirmed",
      message: `${p.orderNumber || ""} — ${p.amount || 0} RWF via ${p.method || "MoMo"}`,
      timestamp: ts,
    }
  }

  if (evt.event === "payment:failed") {
    const p = evt.data as { orderNumber?: string; amount?: number }
    return {
      id: `${evt.event}-${ts}`,
      type: "payment",
      title: "Payment failed",
      message: `${p.orderNumber || ""} — ${p.amount || 0} RWF`,
      timestamp: ts,
    }
  }

  if (evt.event === "product:outOfStock") {
    const p = evt.data as { name?: string }
    return {
      id: `${evt.event}-${ts}`,
      type: "product",
      title: "Out of stock",
      message: p.name || "A product",
      timestamp: ts,
    }
  }

  if (evt.event === "product:stockLow") {
    const p = evt.data as { name?: string; stock?: number }
    return {
      id: `${evt.event}-${ts}`,
      type: "product",
      title: "Low stock",
      message: `${p.name || "A product"} — ${p.stock || 0} left`,
      timestamp: ts,
    }
  }

  if (evt.event === "product:created") {
    const p = evt.data as { name?: string }
    return {
      id: `${evt.event}-${ts}`,
      type: "product",
      title: "New product",
      message: p.name || "A product was added",
      timestamp: ts,
    }
  }

  if (evt.event === "order:shipped") {
    const o = evt.data as { orderNumber?: string }
    return {
      id: `${evt.event}-${ts}`,
      type: "order",
      title: "Order shipped",
      message: o.orderNumber || "",
      timestamp: ts,
    }
  }

  if (evt.event === "order:delivered") {
    const o = evt.data as { orderNumber?: string }
    return {
      id: `${evt.event}-${ts}`,
      type: "order",
      title: "Order delivered",
      message: o.orderNumber || "",
      timestamp: ts,
    }
  }

  return null
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the current live stats snapshot.
 * Active visitors = number of connected SSE clients.
 */
export function getLiveStats(): LiveStats {
  initializeIfNeeded()
  return {
    activeVisitors: getListenerCount(),
    todayRevenue: state.todayRevenue,
    todayOrderCount: state.todayOrderCount,
    liveEvents: [...state.liveEvents],
  }
}

/**
 * Seed the initial revenue + order count from the database.
 * Called on first access to avoid starting from 0.
 */
export function seedLiveStats(revenue: number, orderCount: number) {
  state.todayRevenue = revenue
  state.todayOrderCount = orderCount
}
