export const dynamic = 'force-dynamic'

/**
 * Loyalty Points API — get user's current points balance.
 *
 * GET /api/loyalty/points — returns { points, expiringSoon }
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { loyaltyPoints: true },
    })

    // Check for points expiring in the next 30 days
    const expiringSoon = await db.loyaltyPoints.findMany({
      where: {
        userId: user.id,
        type: "EARNED",
        expiresAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { points: true, expiresAt: true },
    })

    const expiringPoints = expiringSoon.reduce((sum, p) => sum + p.points, 0)

    return NextResponse.json({
      points: dbUser?.loyaltyPoints || 0,
      expiringPoints,
      expiringCount: expiringSoon.length,
    })
  } catch (error) {
    console.error("Loyalty points error:", error)
    return NextResponse.json({ error: "Failed to fetch points" }, { status: 500 })
  }
}
