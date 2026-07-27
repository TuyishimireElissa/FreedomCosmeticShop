export const dynamic = 'force-dynamic'

/** POST /api/admin/wholesale/credit-payment — record a credit payment for a wholesale customer */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { DESTRUCTIVE_OPERATIONS, requireDestructiveOperation } from "@/lib/permissions"
import { updateCreditBalance, sendWholesaleSms } from "@/server/services/wholesale"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"
import { WHOLESALE_CONFIG } from "@/lib/wholesale-config"

const PaymentSchema = z.object({
  userId: z.string(),
  amount: z.number().int().min(1),
  invoiceId: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  try {
    const adminUser = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PAYMENT_STATUS_CHANGE)
    if (!WHOLESALE_CONFIG.credit.enabled) {
      return NextResponse.json({ error: "Wholesale credit payments are disabled" }, { status: 409 })
    }
    const body = await req.json()
    const parsed = PaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const { userId, amount, invoiceId, notes } = parsed.data

    // Verify user is wholesale
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, businessName: true, wholesaleStatus: true },
    })
    if (!user || user.wholesaleStatus !== "APPROVED") {
      return NextResponse.json({ error: "User is not an approved wholesale customer" }, { status: 400 })
    }

    // Update credit balance
    await updateCreditBalance(
      userId,
      amount,
      "CREDIT",
      notes || `Payment received${invoiceId ? ` for invoice` : ""}`,
      undefined
    )

    // If invoice specified, mark as paid
    let invoice: { invoiceNumber: string } | null = null
    if (invoiceId) {
      const found = await db.wholesaleInvoice.findUnique({ where: { id: invoiceId } })
      if (found && !found.isPaid) {
        await db.wholesaleInvoice.update({
          where: { id: invoiceId },
          data: { isPaid: true, paidAt: new Date() },
        })
        invoice = { invoiceNumber: found.invoiceNumber }
      } else if (found) {
        invoice = { invoiceNumber: found.invoiceNumber }
      }
    }

    // Send SMS
    const credit = await db.wholesaleCredit.findUnique({ where: { userId } })
    const remaining = credit?.usedCredit || 0
    await sendWholesaleSms(user.phone, "payment_received", {
      amount,
      invoice: invoice?.invoiceNumber || "N/A",
      remaining,
    })

    // Audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "PAYMENT_REFUND",
      entityType: "PAYMENT",
      entityId: userId,
      description: `Recorded credit payment of ${amount} RWF from ${user.businessName || user.name}${invoice ? ` (${invoice.invoiceNumber})` : ""}`,
      req,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Payment of ${amount} RWF recorded`,
      remainingBalance: remaining,
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error("Credit payment error:", error)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
