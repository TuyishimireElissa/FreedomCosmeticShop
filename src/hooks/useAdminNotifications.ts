"use client"

/**
 * useAdminNotifications — real-time admin notifications.
 *
 * Features:
 *   - Polls /api/admin/analytics every 30 seconds for new orders
 *   - Plays a sound when a new order arrives
 *   - Shows a toast notification
 *   - Tracks the last order count to detect new orders
 *   - Returns the list of recent notifications
 */

import { useEffect, useState, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

interface Notification {
  id: string
  type: "new_order" | "low_stock" | "payment"
  title: string
  message: string
  timestamp: number
}

const POLL_INTERVAL = 30000 // 30 seconds
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

  const checkForNewOrders = useCallback(async () => {
    if (!enabled) return

    try {
      const res = await fetch("/api/admin/analytics?range=month")
      if (!res.ok) return
      const data = await res.json()
      const currentCount = data.totalOrders

      // Skip the first check (initial load)
      if (!initializedRef.current) {
        lastOrderCountRef.current = currentCount
        initializedRef.current = true
        return
      }

      // Check for new orders
      if (lastOrderCountRef.current !== null && currentCount > lastOrderCountRef.current) {
        const newCount = currentCount - lastOrderCountRef.current
        playSound()

        const notification: Notification = {
          id: `notif-${Date.now()}`,
          type: "new_order",
          title: "New order received!",
          message: `${newCount} new order${newCount > 1 ? "s" : ""} just came in.`,
          timestamp: Date.now(),
        }

        setNotifications((prev) => [notification, ...prev].slice(0, 20))

        toast({
          title: notification.title,
          description: notification.message,
        })
      }

      // Check for low stock
      if (data.lowStockProducts?.length > 0 && data.lowStockProducts.length > (lastOrderCountRef.current === currentCount ? 0 : -1)) {
        // Only alert once per session for low stock
      }

      lastOrderCountRef.current = currentCount
    } catch (e) {
      console.error("Notification check failed:", e)
    }
  }, [enabled, playSound, toast])

  useEffect(() => {
    // Initial check
    void checkForNewOrders()

    // Poll every 30 seconds
    const interval = setInterval(checkForNewOrders, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [checkForNewOrders])

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
