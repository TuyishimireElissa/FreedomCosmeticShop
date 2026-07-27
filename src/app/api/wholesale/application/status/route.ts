export const dynamic = 'force-dynamic'

/** GET /api/wholesale/application/status — check own application status */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const application = await db.wholesaleApplication.findUnique({
      where: { userId: user.id },
    })

    if (!application) {
      return NextResponse.json({ hasApplication: false, status: null })
    }

    return NextResponse.json({
      hasApplication: true,
      status: application.status,
      application: {
        id: application.id,
        businessName: application.businessName,
        appliedAt: application.appliedAt,
        reviewedAt: application.reviewedAt,
        rejectionReason: application.rejectionReason,
        reviewNotes: application.reviewNotes,
      },
    })
  } catch (error) {
    console.error("Application status error:", error)
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}
