export const dynamic = 'force-dynamic'

/** GET /api/wholesale/invoices — list wholesale invoices with details */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (user.wholesaleStatus !== "APPROVED") {
      return NextResponse.json({ error: "Wholesale account not approved" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get("id")

    if (invoiceId) {
      // Return single invoice with full details
      const invoice = await db.wholesaleInvoice.findFirst({
        where: { id: invoiceId, userId: user.id },
        include: {
          order: {
            include: {
              items: true,
            },
          },
        },
      })

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }

      return NextResponse.json({ invoice })
    }

    // Return all invoices
    const invoices = await db.wholesaleInvoice.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: "desc" },
      include: {
        order: {
          select: { orderNumber: true, status: true },
        },
      },
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error("Invoices fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
  }
}
