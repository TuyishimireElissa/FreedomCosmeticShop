export const dynamic = 'force-dynamic'

/** PUT /api/admin/wholesale/applications/[id]/reject — reject a wholesale application */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { sendWholesaleSms } from "@/server/services/wholesale"
import { broadcastNotificationEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const RejectSchema = z.object({
  reason: z.string().min(5).max(500),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole("ADMIN")
    const { id } = await params
    const body = await req.json()
    const parsed = RejectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Reason required", details: parsed.error.flatten() }, { status: 400 })
    }

    const application = await db.wholesaleApplication.findUnique({ where: { id } })
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    await db.$transaction([
      db.wholesaleApplication.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
          rejectionReason: parsed.data.reason,
        },
      }),
      db.user.update({
        where: { id: application.userId },
        data: {
          wholesaleStatus: "REJECTED",
          userType: "RETAIL",
        },
      }),
    ])

    await sendWholesaleSms(application.businessPhone, "application_rejected", {
      reason: parsed.data.reason,
    })

    await db.notification.create({
      data: {
        userId: application.userId,
        type: "SYSTEM",
        title: "Wholesale Application Update",
        body: `Your wholesale application was not approved. Reason: ${parsed.data.reason}`,
      },
    })
    void broadcastNotificationEvent("new", {
      id: `rejection-${id}`,
      userId: application.userId,
      type: "wholesale_rejected",
      title: "Wholesale application not approved",
    }, { source: adminUser.name }).catch(() => {})

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "CUSTOMER",
      entityId: application.userId,
      description: `Rejected wholesale application for ${application.businessName}: ${parsed.data.reason}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ success: true, message: "Application rejected" })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 })
  }
}
