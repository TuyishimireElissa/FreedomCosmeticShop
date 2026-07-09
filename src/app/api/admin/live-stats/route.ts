/**
 * GET /api/admin/live-stats
 *
 * Returns real-time stats for the admin dashboard:
 *   - activeVisitors: number of connected SSE clients (storefront visitors)
 *   - todayRevenue: revenue from payment:confirmed events since process start
 *   - todayOrderCount: count of order:new events since process start
 *   - liveEvents: last 50 real-time events (orders, payments, stock alerts)
 *
 * The admin dashboard polls this endpoint every 5 seconds for the
 * live activity widget + revenue ticker.
 */
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { getLiveStats } from "@/lib/live-stats"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF", "MANAGER")
    const stats = getLiveStats()
    return NextResponse.json(stats)
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Live stats error:", error)
    return NextResponse.json({ error: "Failed to fetch live stats" }, { status: 500 })
  }
}
