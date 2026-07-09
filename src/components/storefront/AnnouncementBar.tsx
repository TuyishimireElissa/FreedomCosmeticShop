"use client"

/**
 * AnnouncementBar — top bar with free delivery + coupon announcement.
 *
 * Features:
 *   - Black background, white text
 *   - Close button (X) to dismiss (saved in localStorage)
 *   - Shows: "FREE DELIVERY on orders above 50,000 RWF | Use code BEAUTY20 for 20% off"
 *
 * This sits ABOVE the header (very top of page).
 */

import { useState, useEffect } from "react"
import { X, Truck, Sparkles } from "lucide-react"

const STORAGE_KEY = "freedom-announcement-dismissed"

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if user dismissed it
    const dismissed = localStorage.getItem(STORAGE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dismissed) setVisible(true)
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, "true")
  }

  if (!visible) return null

  return (
    <div className="relative z-50 flex items-center justify-center bg-foreground px-4 py-2 text-background">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs sm:text-sm">
        <span className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5" />
          FREE DELIVERY on orders above 50,000 RWF
        </span>
        <span className="hidden text-background/50 sm:inline">|</span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Use code <strong className="font-bold">BEAUTY20</strong> for 20% off your first order! 🎉
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-background/70 hover:bg-background/10 hover:text-background"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
