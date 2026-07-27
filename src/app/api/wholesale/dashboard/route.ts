export const dynamic = 'force-dynamic'

/** GET /api/wholesale/dashboard — wholesale customer dashboard data */
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getWholesaleDashboard } from "@/server/services/wholesale"

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (user.wholesaleStatus !== "APPROVED") {
      return NextResponse.json({ error: "Wholesale account not approved" }, { status: 403 })
    }

    const dashboard = await getWholesaleDashboard(user.id)
    return NextResponse.json(dashboard)
  } catch (error) {
    console.error("Wholesale dashboard error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 })
  }
}
