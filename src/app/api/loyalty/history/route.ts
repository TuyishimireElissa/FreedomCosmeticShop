/**
 * Loyalty History API — user's loyalty transaction history.
 *
 * GET /api/loyalty/history — list of all point transactions
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const history = await db.loyaltyPoints.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ history })
  } catch (error) {
    console.error("Loyalty history error:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
