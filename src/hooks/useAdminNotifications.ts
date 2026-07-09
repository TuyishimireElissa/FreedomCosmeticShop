"use client"

/**
 * useAdminNotifications — real-time admin notifications.
 *
 * Section 8: Enhanced with real-time SSE event integration.
 *
 * Features:
 *   - Polls /api/admin/analytics every 30 seconds for new orders (fallback)
 *   - listens to real-time SSE events for INSTANT notifications:
 *     - order:new → 🔔 New order alert + sound
 *     - payment:confirmed → 💳 Payment confirmed
 *     - payment:failed → ❌ Payment failed
 *     - product:stockLow → ⚠️ Low stock warning
 *     - product:outOfStock → 🚨 Out of stock
 *   - Plays a sound when a new order arrives
 *   - Shows a toast notification
 *   - Returns the list of recent notifications
 *   - Dismiss / clearAll actions
 */

import { useEffect, useState, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { useOrderUpdates, usePaymentUpdates, useProductUpdates } from "@/hooks/use-realtime"
import { formatRWF } from "@/lib/format"

interface Notification {
  id: string
  type: "new_order" | "low_stock" | "out_of_stock" | "payment_confirmed" | "payment_failed" | "info"
  title: string
  message: string
  timestamp: number
  link?: string
}

const POLL_INTERVAL = 30000 // 30 seconds (fallback)
const SOUND_URL = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==" // Minimal beep

export function useAdminNotifications() {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [enabled, setEnabled] = useState(true)
  const lastOrderCountRef = useRef<number | null>(null)
  const initializedRef = useRef(false)

  const playSound = useCallback(() => {
    try {
      const audio = new Audio(SOUND_URL)
      audio.volume = 0.3
      void audio.play().catch(() => {
        // Autoplay blocked — user needs to interact first
      })
    } catch {
      // Audio not available
    }
  }, [])

  const addNotification = useCallback((notif: Omit<Notification, "id" | "timestamp">) => {
    const fullNotif: Notification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    }
    setNotifications((prev) => [fullNotif, ...prev].slice(0, 20))
  }, [])

  // ─── Polling fallback (every 30s) ──────────────────────────────────
  const checkForNewOrders = useCallback(async () => {
    if (!enabled) return

    try {
      const res = await fetch("/api/admin/analytics?range=month")
      if (!res.ok) return
      const data = await res.json()
      const currentCount = data.revenue?.rangeCount ?? 0

      if (!initializedRef.current) {
        lastOrderCountRef.current = currentCount
        initializedRef.current = true
        return
      }

      if (lastOrderCountRef.current !== null && currentCount > lastOrderCountRef.current) {
        // Polling detected a new order — but the SSE hook below will handle
        // the sound + notification. Just update the count.
        lastOrderCountRef.current = currentCount
      }
    } catch {
      // ignore
    }
  }, [enabled])

  useEffect(() => {
    void checkForNewOrders()
    const interval = setInterval(checkForNewOrders, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [checkForNewOrders])

  // ─── Section 8: Real-time SSE event listeners ──────────────────────

  // New order → play sound + notification + toast
  useOrderUpdates((event, data) => {
    if (!enabled) return
    if (event !== "order:new") return

    const o = data as { orderNumber: string; total: number; customerName?: string }
    playSound()
    addNotification({
      type: "new_order",
      title: "🛒 New order!",
      message: `${o.orderNumber} — ${o.customerName || "Customer"} — ${formatRWF(o.total)}`,
    })
    toast({
      title: "🛒 New order received!",
      description: `${o.orderNumber} — ${formatRWF(o.total)}`,
    })
  })

  // Order status changes (from other admins) → notification (no sound)
  useOrderUpdates((event, data) => {
    if (!enabled) return
    if (event === "order:new") return

    const o = data as { orderNumber: string; status: string }
    const statusLabels: Record<string, string> = {
      confirmed: "✅ Confirmed",
      processing: "📦 Processing",
      shipped: "🚚 Shipped",
      delivered: "🎉 Delivered",
      cancelled: "❌ Cancelled",
    }
    const action = event.replace("order:", "")
    const label = statusLabels[action]
    if (label) {
      addNotification({
        type: "info",
        title: `Order ${o.orderNumber}`,
        message: `Status changed to: ${label}`,
      })
    }
  })

  // Payment events → notification
  usePaymentUpdates((event, data) => {
    if (!enabled) return
    const p = data as { orderNumber: string; amount: number; method: string }

    if (event === "payment:confirmed") {
      addNotification({
        type: "payment_confirmed",
        title: "💳 Payment confirmed",
        message: `${p.orderNumber} — ${formatRWF(p.amount)} via ${p.method}`,
      })
    } else if (event === "payment:failed") {
      addNotification({
        type: "payment_failed",
        title: "❌ Payment failed",
        message: `${p.orderNumber} — ${formatRWF(p.amount)} via ${p.method}`,
      })
    }
  })

  // Product stock events → notification
  useProductUpdates((event, data) => {
    if (!enabled) return
    const p = data as { name: string; stock: number; threshold?: number }

    if (event === "product:stockLow") {
      addNotification({
        type: "low_stock",
        title: "⚠️ Low stock",
        message: `${p.name} — only ${p.stock} left (threshold: ${p.threshold || 5})`,
      })
    } else if (event === "product:outOfStock") {
      addNotification({
        type: "out_of_stock",
        title: "🚨 Out of stock",
        message: `${p.name} is now out of stock`,
      })
    }
  })

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    enabled,
    setEnabled,
    dismiss,
    clearAll,
  }
}
