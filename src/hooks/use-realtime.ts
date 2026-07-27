"use client"

/**
 * use-realtime — client hooks for real-time admin → storefront sync.
 *
 * These hooks connect to the SSE endpoint (/api/events/stream) and dispatch
 * events to the appropriate handlers. When an admin creates/updates/deletes
 * a product, order, banner, etc., the storefront updates instantly without
 * a page refresh.
 *
 * Architecture:
 *   useRealtimeEvents() — the master hook, manages a single EventSource
 *     connection for the entire page. Should be mounted once in the root
 *     layout. Dispatches all events to registered listeners.
 *
 *   useProductUpdates(handler) — filtered for product:created/updated/deleted
 *   useOrderUpdates(handler) — filtered for order:new/confirmed/shipped/etc.
 *   useBannerUpdates(handler) — filtered for banner:created/updated/deleted
 *   usePromotionUpdates(handler) — filtered for promotion:started/ended
 *   useCouponUpdates(handler) — filtered for coupon:created/deactivated
 *   useCartUpdates(handler) — filtered for product:outOfStock/priceChange
 *   useDeliveryUpdates(handler) — filtered for delivery:assigned/feeUpdated
 *
 * Usage:
 *   // In the root layout (mounted once):
 *   useRealtimeEvents()
 *
 *   // In a product listing component:
 *   useProductUpdates((event, product) => {
 *     if (event === "product:created") {
 *       setProducts(prev => [product, ...prev])
 *     }
 *   })
 */

import { useEffect, useRef } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RealtimeEvent {
  event: string
  data: unknown
  timestamp: string
  source?: string
}

type EventHandler = (event: string, data: unknown) => void

// ─── Global EventSource management ───────────────────────────────────────────

/**
 * Singleton EventSource — we only want ONE SSE connection per browser tab,
 * shared across all hooks. This avoids opening dozens of connections when
 * multiple components subscribe to different event types.
 */

let eventSource: EventSource | null = null
let connectionCount = 0
const listeners = new Set<EventHandler>()

function getEventSource(): EventSource {
  if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
    eventSource = new EventSource("/api/events/stream")

    eventSource.onopen = () => {
      console.debug("[realtime] SSE connected")
    }

    eventSource.onerror = () => {
      console.debug("[realtime] SSE error — browser will auto-reconnect")
    }

    // Generic message handler — dispatches ALL named events to listeners
    eventSource.onmessage = () => {
      // Default message (no event type) — skip heartbeats
    }

    // We need to listen for each named event type.
    // Since we can't know all event types ahead of time, we use a trick:
    // add a listener for the "message" event + re-parse.
    // But EventSource only fires named events for `event:` lines.
    // So instead, we override addEventListener to catch all.
  }
  return eventSource
}

/**
 * Register a catch-all listener that receives ALL SSE events.
 * The hook infrastructure below uses this to filter by event type.
 */
function addGlobalListener(handler: EventHandler): () => void {
  listeners.add(handler)
  connectionCount++

  // If this is the first listener, open the EventSource
  const source = getEventSource()

  // We need to listen for ALL event types. Since EventSource dispatches
  // named events, we attach a listener for each known event name.
  // But new event types might appear — so we also listen for "message".
  const knownEvents = [
    "connected",
    "product:created", "product:updated", "product:deleted",
    "product:stockLow", "product:outOfStock", "product:priceChange",
    "product:featured", "product:onSale",
    "order:new", "order:confirmed", "order:processing",
    "order:shipped", "order:delivered", "order:cancelled",
    "payment:confirmed", "payment:failed", "payment:refunded",
    "banner:created", "banner:updated", "banner:deleted",
    "promotion:started", "promotion:ended",
    "coupon:created", "coupon:updated", "coupon:deactivated", "coupon:deleted",
    "blog:published", "blog:unpublished", "blog:updated",
    "category:created", "category:updated", "category:deactivated",
    "brand:created", "brand:updated", "brand:featured",
    "delivery:feeUpdated", "delivery:assigned", "delivery:updated",
    "announcement:updated",
  ]

  const wrappedHandler = (e: MessageEvent) => {
    try {
      const parsed = JSON.parse(e.data) as RealtimeEvent
      listeners.forEach((listener) => {
        try {
          listener(parsed.event, parsed.data)
        } catch (err) {
          console.error("[realtime] Listener error:", err)
        }
      })
    } catch {
      // Ignore parse errors (heartbeats, etc.)
    }
  }

  // Attach to all known events + generic "message"
  knownEvents.forEach((eventName) => {
    source.addEventListener(eventName, wrappedHandler as EventListener)
  })
  source.addEventListener("message", wrappedHandler as EventListener)

  // Return cleanup
  return () => {
    knownEvents.forEach((eventName) => {
      source.removeEventListener(eventName, wrappedHandler as EventListener)
    })
    source.removeEventListener("message", wrappedHandler as EventListener)
    listeners.delete(handler)
    connectionCount--

    // If no more listeners, close the connection
    if (connectionCount <= 0 && eventSource) {
      eventSource.close()
      eventSource = null
      connectionCount = 0
    }
  }
}

// ─── Master hook — mount once in root layout ─────────────────────────────────

/**
 * useRealtimeEvents — establishes the SSE connection.
 *
 * Mount this ONCE in the root layout (app/page.tsx or layout.tsx).
 * It opens the EventSource connection and keeps it alive for the
 * entire page session. Individual components then use the filtered
 * hooks below (useProductUpdates, etc.) to listen for specific events.
 */
export function useRealtimeEvents(): void {
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const handler: EventHandler = () => {
      // The master hook doesn't do anything with events itself —
      // it just keeps the connection alive. Individual filtered hooks
      // register their own listeners via addGlobalListener.
    }

    unsubscribeRef.current = addGlobalListener(handler)

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])
}

// ─── Filtered hooks ──────────────────────────────────────────────────────────

/**
 * Filter helper — listens for events matching a prefix.
 *
 * Example: filterByPrefix("product:") fires for "product:created",
 * "product:updated", "product:deleted", etc.
 */
function useFilteredEvents(
  prefixes: string[],
  handler: EventHandler
): void {
  const handlerRef = useRef(handler)

  // Update ref inside useEffect (not during render) to comply with
  // React 19's stricter ref-during-render rule
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const wrapped: EventHandler = (event, data) => {
      if (prefixes.some((prefix) => event.startsWith(prefix))) {
        handlerRef.current(event, data)
      }
    }

    const unsubscribe = addGlobalListener(wrapped)
    return unsubscribe
  }, [prefixes.join(",")]) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * useProductUpdates — fires when any product event arrives.
 * Events: product:created, product:updated, product:deleted,
 *         product:stockLow, product:outOfStock, product:priceChange,
 *         product:featured, product:onSale
 */
export function useProductUpdates(handler: EventHandler): void {
  useFilteredEvents(["product:"], handler)
}

/**
 * useOrderUpdates — fires when any order event arrives.
 * Events: order:new, order:confirmed, order:processing,
 *         order:shipped, order:delivered, order:cancelled
 */
export function useOrderUpdates(handler: EventHandler): void {
  useFilteredEvents(["order:"], handler)
}

/**
 * usePaymentUpdates — fires when any payment event arrives.
 * Events: payment:confirmed, payment:failed, payment:refunded
 */
export function usePaymentUpdates(handler: EventHandler): void {
  useFilteredEvents(["payment:"], handler)
}

/**
 * useBannerUpdates — fires when any banner event arrives.
 * Events: banner:created, banner:updated, banner:deleted
 */
export function useBannerUpdates(handler: EventHandler): void {
  useFilteredEvents(["banner:"], handler)
}

/**
 * usePromotionUpdates — fires when any promotion/coupon event arrives.
 * Events: promotion:started, promotion:ended,
 *         coupon:created, coupon:updated, coupon:deactivated, coupon:deleted
 */
export function usePromotionUpdates(handler: EventHandler): void {
  useFilteredEvents(["promotion:", "coupon:"], handler)
}

/**
 * useCartUpdates — fires when cart-relevant product changes occur.
 * Events: product:outOfStock, product:priceChange, product:deleted
 */
export function useCartUpdates(handler: EventHandler): void {
  useFilteredEvents(
    ["product:outOfStock", "product:priceChange", "product:deleted"],
    handler
  )
}

/**
 * useDeliveryUpdates — fires when delivery events arrive.
 * Events: delivery:feeUpdated, delivery:assigned, delivery:updated
 */
export function useDeliveryUpdates(handler: EventHandler): void {
  useFilteredEvents(["delivery:"], handler)
}

/**
 * useBlogUpdates — fires when blog events arrive.
 * Events: blog:published, blog:unpublished, blog:updated
 */
export function useBlogUpdates(handler: EventHandler): void {
  useFilteredEvents(["blog:"], handler)
}

/**
 * useCategoryUpdates — fires when category events arrive.
 * Events: category:created, category:updated, category:deactivated
 */
export function useCategoryUpdates(handler: EventHandler): void {
  useFilteredEvents(["category:"], handler)
}

/**
 * useAnnouncementUpdates — fires when the announcement bar changes.
 * Events: announcement:updated
 */
export function useAnnouncementUpdates(handler: EventHandler): void {
  useFilteredEvents(["announcement:"], handler)
}

/**
 * useUserEvents — fires when events specific to a user arrive.
 * Events: user:<userId>:order:*, user:<userId>:payment:*,
 *         user:<userId>:delivery:*, user:<userId>:notification:*,
 *         user:<userId>:loyalty:*
 */
export function useUserEvents(userId: string | null | undefined, handler: EventHandler): void {
  useFilteredEvents(
    userId ? [`user:${userId}:`] : [],
    handler
  )
}

// ─── Connection status hook ──────────────────────────────────────────────────

/**
 * useRealtimeStatus — returns the current SSE connection status.
 * Useful for showing a "Live" / "Reconnecting" indicator in the UI.
 */
export function useRealtimeStatus(): "connecting" | "connected" | "disconnected" {
  // Simple version — in a real app you'd track this with state
  // For now, return "connected" if the EventSource exists and is open
  if (typeof window === "undefined") return "connecting"
  if (!eventSource) return "disconnected"
  if (eventSource.readyState === EventSource.OPEN) return "connected"
  if (eventSource.readyState === EventSource.CONNECTING) return "connecting"
  return "disconnected"
}
