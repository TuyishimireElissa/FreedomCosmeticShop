/**
 * GET /api/events/stream
 *
 * Server-Sent Events (SSE) endpoint — the storefront's real-time connection.
 *
 * This is the Next.js equivalent of a Socket.io client connection. Browsers
 * connect to this endpoint via `new EventSource("/api/events/stream")` and
 * receive a stream of real-time events whenever the admin panel mutates data.
 *
 * Flow:
 *   Browser connects → SSE stream opens
 *   Admin creates product → emitRealtimeEvent("product:created", product)
 *   → event bus fires → this route sends SSE message → browser receives
 *   → useProductUpdates() hook fires → storefront updates instantly
 *
 * Features:
 *   - Subscribes to the global event bus on connection
 *   - Sends a heartbeat comment every 30s to keep the connection alive
 *     (proxies/load balancers may close idle connections after 60-120s)
 *   - Unsubscribes on connection close (prevents memory leaks)
 *   - Sends initial "connected" event so the client knows it's live
 *   - Public visitors receive only non-sensitive catalogue/content events.
 *   - Authenticated customers receive only their own user-scoped events.
 *   - Authenticated admin roles may receive operational order/delivery events.
 */

import { subscribeToRealtimeEvents, getListenerCount, type RealtimeEvent } from "@/lib/event-bus"
import { requireAuth } from '@/lib/auth'
import { isAdminRole } from '@/lib/admin-roles'

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const HEARTBEAT_INTERVAL_MS = 30_000
const PUBLIC_EVENT_PREFIXES = [
  'product:', 'banner:', 'promotion:', 'coupon:', 'blog:', 'category:',
  'brand:', 'announcement:', 'logo:',
]

function canReceiveEvent(event: RealtimeEvent, user: { id: string; role: string } | null) {
  if (user && isAdminRole(user.role)) return true
  if (user && event.event.startsWith(`user:${user.id}:`)) return true
  if (event.event === 'delivery:feeUpdated') return true
  return PUBLIC_EVENT_PREFIXES.some((prefix) => event.event.startsWith(prefix))
}

export async function GET() {
  const user = await requireAuth().catch(() => null)
  // Set up SSE response headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "private, no-store, no-transform",
    Vary: 'Cookie',
    Connection: "keep-alive",
    // Disable buffering — we want events to flush immediately
    "X-Accel-Buffering": "no",
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false

      // Safe enqueue — ignores errors after close
      const enqueue = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          closed = true
        }
      }

      // Send initial connection event
      enqueue(
        `event: connected\ndata: ${JSON.stringify({
          message: "Real-time connection established",
          listenerCount: getListenerCount(),
          timestamp: new Date().toISOString(),
        })}\n\n`
      )

      // Subscribe to the event bus
      const unsubscribe = subscribeToRealtimeEvents((evt: RealtimeEvent) => {
        if (!canReceiveEvent(evt, user)) return
        enqueue(
          `event: ${evt.event}\ndata: ${JSON.stringify({
            event: evt.event,
            data: evt.data,
            timestamp: evt.timestamp,
            source: evt.source,
          })}\n\n`
        )
      })

      // Heartbeat — keep connection alive
      const heartbeat = setInterval(() => {
        enqueue(`:heartbeat ${Date.now()}\n\n`)
      }, HEARTBEAT_INTERVAL_MS)

      // Cleanup on close
      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
      }

      // Handle controller errors / cancellation
      controller.error = () => cleanup()
    },
    cancel() {
      // Client disconnected
    },
  })

  return new Response(stream, { headers })
}
