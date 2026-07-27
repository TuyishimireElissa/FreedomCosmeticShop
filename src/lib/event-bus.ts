/**
 * Event Bus — in-process pub/sub for real-time admin → storefront sync.
 *
 * This is the Next.js equivalent of a Socket.io server. Since the FreedomCosmeticShop
 * app runs as a single Next.js process (standalone build), we can use a
 * module-level EventEmitter to broadcast events from API routes (admin actions)
 * to SSE clients (storefront visitors) within the same process.
 *
 * Architecture:
 *   Admin action (e.g., POST /api/admin/products)
 *     → broadcastProductEvent("product:created", product)
 *       → revalidateTag("products")  // bust Next.js cache
 *       → eventBus.emit("product:created", product)  // notify SSE clients
 *         → /api/events/stream sends event to all connected browsers
 *           → storefront useProductUpdates() hook fires
 *             → product list updates instantly (no page refresh)
 *
 * Event names follow the mission spec:
 *   product:created | product:updated | product:deleted
 *   product:stockLow | product:outOfStock | product:priceChange
 *   product:featured | product:onSale
 *   order:new | order:confirmed | order:processing | order:shipped
 *   order:delivered | order:cancelled
 *   payment:confirmed | payment:failed | payment:refunded
 *   banner:updated | banner:created | banner:deleted
 *   promotion:started | promotion:ended
 *   coupon:created | coupon:deactivated
 *   blog:published | blog:unpublished
 *   delivery:feeUpdated | delivery:assigned
 *   notification:new | notification:read
 */

import { EventEmitter, setMaxListeners } from "events"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RealtimeEvent {
  /** Event name (e.g., "product:created", "order:shipped") */
  event: string
  /** Payload — the entity that changed (product, order, banner, etc.) */
  data: unknown
  /** ISO timestamp */
  timestamp: string
  /** Who triggered the event (admin name, or "system") */
  source?: string
}

export type EventListener = (event: RealtimeEvent) => void

// ─── Singleton Event Bus ─────────────────────────────────────────────────────

/**
 * Global event bus — a single EventEmitter shared across the entire process.
 *
 * In Next.js standalone mode, the server runs in a single process, so
 * module-level singletons persist across requests. This means an admin
 * action in one request can emit an event that an SSE connection in
 * another request receives.
 *
 * For multi-process deployments (e.g., behind a load balancer), you would
 * replace this with Redis Pub/Sub. But for a single-process standalone
 * Next.js app, this is sufficient and has zero external dependencies.
 */
const globalForEventBus = globalThis as unknown as {
  __freedomEventBus?: EventEmitter
}

const eventBus: EventEmitter =
  globalForEventBus.__freedomEventBus ??
  (() => {
    const bus = new EventEmitter()
    // Allow many listeners (one per connected SSE client)
    // without hitting the 11-listener warning.
    setMaxListeners(100, bus)
    return bus
  })()

// Persist on globalThis so HMR in dev mode doesn't create duplicate buses
if (!globalForEventBus.__freedomEventBus) {
  globalForEventBus.__freedomEventBus = eventBus
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Emit a real-time event to all connected SSE clients.
 *
 * Called by admin API routes after a successful mutation (create/update/delete).
 * Also called by the order/payment webhook handlers.
 *
 * Usage:
 *   emitRealtimeEvent("product:created", product, { source: adminUser.name })
 */
export function emitRealtimeEvent(
  event: string,
  data: unknown,
  options?: { source?: string }
): void {
  const payload: RealtimeEvent = {
    event,
    data,
    timestamp: new Date().toISOString(),
    source: options?.source ?? "system",
  }

  // Emit on the next tick so we never block the admin API response
  setImmediate(() => {
    eventBus.emit("realtime", payload)
  })
}

/**
 * Subscribe to all real-time events.
 * Used by the SSE endpoint to stream events to connected browsers.
 *
 * Returns an unsubscribe function — call it when the SSE connection closes
 * to prevent memory leaks.
 */
export function subscribeToRealtimeEvents(listener: EventListener): () => void {
  eventBus.on("realtime", listener)
  return () => {
    eventBus.off("realtime", listener)
  }
}

/**
 * Get the current number of connected SSE clients.
 * Useful for debugging / admin dashboard "live viewers" count.
 */
export function getListenerCount(): number {
  return eventBus.listenerCount("realtime")
}
