"use client"

/**
 * useLiveStats — polls /api/admin/live-stats every 5 seconds.
 *
 * Returns real-time data for the admin dashboard:
 *   - activeVisitors: number of connected storefront visitors
 *   - todayRevenue: live revenue ticker
 *   - todayOrderCount: live order count
 *   - liveEvents: recent activity feed (orders, payments, stock alerts)
 *
 * Used by:
 *   - AdminView header revenue ticker
 *   - AdminOverview live activity widget
 */

import { useState, useEffect, useCallback } from "react"

export interface LiveEvent {
  id: string
  type: "order" | "payment" | "product" | "visitor" | "system"
  title: string
  message: string
  timestamp: string
}

export interface LiveStats {
  activeVisitors: number
  todayRevenue: number
  todayOrderCount: number
  liveEvents: LiveEvent[]
}

const POLL_INTERVAL = 5000 // 5 seconds

export function useLiveStats(): LiveStats & { loading: boolean } {
  const [stats, setStats] = useState<LiveStats>({
    activeVisitors: 0,
    todayRevenue: 0,
    todayOrderCount: 0,
    liveEvents: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/live-stats")
      if (!res.ok) return
      const data = await res.json()
      setStats(data)
    } catch {
      // ignore — will retry on next interval
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchStats])

  return { ...stats, loading }
}
