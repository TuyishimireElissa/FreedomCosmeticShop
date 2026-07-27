"use client"

/**
 * RealTimeNotifications — polls for new orders + alerts.
 *
 * Features:
 *   - Polls /api/admin/notifications every 30 seconds
 *   - Plays a sound when a new order arrives
 *   - Shows a toast notification with order details
 *   - Badge counter in the admin header
 *   - Low stock alert
 *   - Payment received alert
 *   - Can be muted/unmuted
 *
 * Sound: Uses a simple Web Audio API beep (no audio file needed).
 */

import { useEffect, useState, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Bell,
  BellOff,
  Package,
  AlertTriangle,
  X,
} from "lucide-react"

interface NotificationData {
  newOrdersCount: number
  newOrders: {
    id: string
    orderNumber: string
    customerName: string
    total: number
    createdAt: string
    itemCount: number
  }[]
  lowStockCount: number
  pendingPayments: number
  timestamp: string
}

const POLL_INTERVAL_MS = 30 * 1000 // 30 seconds

/**
 * Play a simple beep sound using the Web Audio API.
 * No audio file needed — generates the tone programmatically.
 */
function playBeep(frequency: number = 800, duration: number = 200) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration / 1000)
  } catch {
    // Audio not supported — silently ignore
  }
}

export function RealTimeNotifications() {
  const { toast } = useToast()
  const [muted, setMuted] = useState(false)
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString())
  const [newOrdersCount, setNewOrdersCount] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [showBanner, setShowBanner] = useState(false)
  const [bannerData, setBannerData] = useState<NotificationData | null>(null)
  const lastCheckRef = useRef(lastCheck)
  const mutedRef = useRef(muted)

  // Keep refs in sync
  useEffect(() => {
    lastCheckRef.current = lastCheck
  }, [lastCheck])

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/notifications?since=${encodeURIComponent(lastCheckRef.current)}`)
      if (!res.ok) return
      const data: NotificationData = await res.json()

      // Update counts
      setNewOrdersCount(data.newOrdersCount)
      setLowStockCount(data.lowStockCount)

      // New orders detected
      if (data.newOrdersCount > 0 && data.newOrders.length > 0) {
        if (!mutedRef.current) {
          playBeep(880, 300) // Higher pitch for new orders
        }

        // Show toast for each new order (max 3 to avoid spam)
        data.newOrders.slice(0, 3).forEach((order) => {
          toast({
            title: " New order!",
            description: `${order.orderNumber} — ${order.customerName} (${order.itemCount} items)`,
          })
        })

        // Show banner
        setBannerData(data)
        setShowBanner(true)
      }

      // Low stock alert
      if (data.lowStockCount > 0 && data.lowStockCount !== lowStockCount) {
        if (!mutedRef.current) {
          playBeep(440, 200) // Lower pitch for low stock
        }
        toast({
          title: " Low stock alert",
          description: `${data.lowStockCount} products need restocking.`,
          variant: "destructive",
        })
      }

      // Update last check timestamp
      setLastCheck(data.timestamp)
    } catch {
      // Network error — silently ignore (will retry next poll)
    }
  }, [toast, lowStockCount])

  // Start polling
  useEffect(() => {
    // Initial poll after 5 seconds (let page settle)
    const initialTimer = setTimeout(poll, 5000)

    // Then poll every 30 seconds
    const interval = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [poll])

  const handleDismissBanner = () => {
    setShowBanner(false)
    setNewOrdersCount(0)
  }

  const totalAlerts = newOrdersCount + (lowStockCount > 0 ? 1 : 0)

  return (
    <>
      {/* Mute/unmute button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative gap-1.5"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute notifications" : "Mute notifications"}
      >
        {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        <span className="hidden sm:inline">{muted ? "Muted" : "Alerts"}</span>
        {totalAlerts > 0 && !muted && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {totalAlerts}
          </span>
        )}
      </Button>

      {/* New order banner (slides in from top) */}
      {showBanner && bannerData && (
        <div className="fixed inset-x-0 top-16 z-50 mx-auto max-w-2xl px-4">
          <div className="animate-in slide-in-from-top-4 rounded-2xl border-2 border-primary bg-card p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Package className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">
                    {bannerData.newOrdersCount} new order{bannerData.newOrdersCount !== 1 ? "s" : ""}!
                  </p>
                  {bannerData.newOrders[0] && (
                    <p className="text-sm text-muted-foreground">
                      Latest: {bannerData.newOrders[0].orderNumber} from{" "}
                      {bannerData.newOrders[0].customerName}
                    </p>
                  )}
                  {bannerData.lowStockCount > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {bannerData.lowStockCount} low stock alerts
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDismissBanner}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
