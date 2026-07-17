export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/wholesale/send-reminder
 *
 * Section 8: Send payment reminder SMS to wholesale customers.
 *
 * Body:
 *   { userId: string, type: "due" | "overdue", invoiceId?: string }
 *
 * Sends the appropriate SMS template (payment_due or payment_overdue)
 * to the customer's phone. Also creates an admin notification.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { sendWholesaleSms } from "@/server/services/wholesale"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"
import { WHOLESALE_CONFIG } from "@/lib/wholesale-config"

const ReminderSchema = z.object({
  userId: z.string(),
  type: z.enum(["due", "overdue"]),
  invoiceId: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN")
    if (!WHOLESALE_CONFIG.credit.enabled) {
      return NextResponse.json({ error: "Wholesale credit reminders are disabled" }, { status: 409 })
    }
    const body = await req.json()
    const parsed = ReminderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const { userId, type, invoiceId } = parsed.data

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        businessName: true,
        wholesaleStatus: true,
      },
    })

    if (!user || user.wholesaleStatus !== "APPROVED") {
      return NextResponse.json({ error: "Customer not found or not approved" }, { status: 404 })
    }

    // Get invoice details if invoiceId provided
    let invoice: { invoiceNumber: string; totalAmount: number; dueDate: Date | null } | null = null
    if (invoiceId) {
      const found = await db.wholesaleInvoice.findUnique({
        where: { id: invoiceId },
        select: { invoiceNumber: true, totalAmount: true, dueDate: true },
      })
      if (found) invoice = found
    }

    // Get credit balance
    const credit = await db.wholesaleCredit.findUnique({ where: { userId } })
    const outstanding = credit?.usedCredit || 0

    // Send the appropriate SMS
    await sendWholesaleSms(
      user.phone,
      type === "due" ? "payment_due" : "payment_overdue",
      {
        invoice: invoice?.invoiceNumber || "N/A",
        amount: invoice?.totalAmount || outstanding,
        dueDate: invoice?.dueDate
          ? new Date(invoice.dueDate).toLocaleDateString("en-RW")
          : "immediately",
        momoNumber: "078 XXX XXXX",
      }
    )

    // Create a notification for the customer
    await db.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: type === "due" ? "Payment Due Reminder" : "⚠️ Overdue Payment",
        body:
          type === "due"
            ? `Your invoice ${invoice?.invoiceNumber || ""} of ${invoice?.totalAmount || outstanding} RWF is due. Please pay to MTN MoMo: 078 XXX XXXX`
            : `URGENT: Your payment of ${outstanding} RWF is overdue. Please pay immediately to avoid account suspension.`,
      },
    })

    // Audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SMS_SEND",
      entityType: "CUSTOMER",
      entityId: userId,
      description: `Sent ${type} payment reminder to ${user.businessName || user.name} (${outstanding} RWF outstanding)`,
      req,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `${type === "due" ? "Due" : "Overdue"} reminder sent to ${user.businessName || user.name}`,
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error("Send reminder error:", error)
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 })
  }
}
