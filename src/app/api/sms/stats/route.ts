/**
 * GET /api/sms/stats
 *
 * Returns SMS queue stats + delivery stats for the admin dashboard.
 * Admin only.
 */
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { getQueueStats, getQueueItems } from "@/server/services/sms-queue"
import { getDeliveryStats } from "@/server/services/sms"

export async function GET() {
  try {
    await requireRole("ADMIN")

    const queueStats = getQueueStats()
    const deliveryStats = getDeliveryStats()
    const recentItems = getQueueItems(20)

    return NextResponse.json({
      queue: queueStats,
      delivery: deliveryStats,
      recent: recentItems,
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("SMS stats error:", error)
    return NextResponse.json({ error: "Failed to fetch SMS stats" }, { status: 500 })
  }
}
