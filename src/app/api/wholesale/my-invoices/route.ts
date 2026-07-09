/** GET /api/wholesale/my-invoices — get all wholesale invoices */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const invoices = await db.wholesaleInvoice.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: "desc" },
      include: {
        order: {
          select: { orderNumber: true, status: true },
        },
      },
    })

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderNumber: inv.order.orderNumber,
        orderStatus: inv.order.status,
        businessName: inv.businessName,
        subtotal: inv.subtotal,
        tax: inv.tax,
        discount: inv.discount,
        totalAmount: inv.totalAmount,
        paymentTerms: inv.paymentTerms,
        dueDate: inv.dueDate,
        isPaid: inv.isPaid,
        paidAt: inv.paidAt,
        issuedAt: inv.issuedAt,
        notes: inv.notes,
      })),
    })
  } catch (error) {
    console.error("Invoices fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
  }
}
