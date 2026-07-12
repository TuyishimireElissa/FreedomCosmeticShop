export const dynamic = 'force-dynamic'

/** PUT /api/admin/wholesale/applications/[id]/approve — approve a wholesale application */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { sendWholesaleSms } from "@/server/services/wholesale"
import { broadcastNotificationEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const ApproveSchema = z.object({
  creditLimit: z.number().int().min(0).default(500000),
  paymentTerms: z.number().int().min(7).max(90).default(30),
  specialDiscount: z.number().int().min(0).max(50).default(0),
  notes: z.string().max(500).optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole("ADMIN")
    const { id } = await params
    const body = await req.json()
    const parsed = ApproveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const application = await db.wholesaleApplication.findUnique({ where: { id } })
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }
    if (application.status === "APPROVED") {
      return NextResponse.json({ error: "Already approved" }, { status: 400 })
    }

    // Update application + user + create credit account in transaction
    await db.$transaction([
      db.wholesaleApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
          reviewNotes: parsed.data.notes || null,
        },
      }),
      db.user.update({
        where: { id: application.userId },
        data: {
          userType: "WHOLESALE",
          wholesaleStatus: "APPROVED",
          wholesaleApprovedAt: new Date(),
          wholesaleApprovedBy: adminUser.id,
          wholesaleLimit: parsed.data.creditLimit,
          wholesaleDiscount: parsed.data.specialDiscount,
        },
      }),
      db.wholesaleCredit.upsert({
        where: { userId: application.userId },
        create: {
          userId: application.userId,
          creditLimit: parsed.data.creditLimit,
          usedCredit: 0,
          availableCredit: parsed.data.creditLimit,
          paymentTermDays: parsed.data.paymentTerms,
        },
        update: {
          creditLimit: parsed.data.creditLimit,
          availableCredit: parsed.data.creditLimit,
          paymentTermDays: parsed.data.paymentTerms,
        },
      }),
    ])

    // Send approval SMS
    await sendWholesaleSms(application.businessPhone, "application_approved", {
      name: application.businessName,
    })

    // Notify customer
    await db.notification.create({
      data: {
        userId: application.userId,
        type: "PROMOTION",
        title: "🎉 Wholesale Account Approved!",
        body: `Your wholesale account is approved! Credit limit: ${parsed.data.creditLimit} RWF. Shop now and save up to 30%!`,
        linkType: "URL",
        linkUrl: "/?view=wholesale",
      },
    })
    void broadcastNotificationEvent("new", {
      id: `approval-${id}`,
      userId: application.userId,
      type: "wholesale_approved",
      title: "🎉 Wholesale Account Approved!",
    }, { source: adminUser.name }).catch(() => {})

    // Audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "CUSTOMER",
      entityId: application.userId,
      description: `Approved wholesale application for ${application.businessName} (credit: ${parsed.data.creditLimit} RWF)`,
      req,
    }).catch(() => {})

    return NextResponse.json({ success: true, message: "Application approved" })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error("Approve error:", error)
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 })
  }
}
