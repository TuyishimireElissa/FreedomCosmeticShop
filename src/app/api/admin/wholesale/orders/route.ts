export const dynamic = 'force-dynamic'

/** GET /api/admin/wholesale/orders — list all wholesale orders */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "STAFF", "MANAGER")
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "all"
    const search = searchParams.get("search") || ""

    const where: Prisma.OrderWhereInput = { orderType: "WHOLESALE" }
    if (status !== "all") where.status = status
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ]
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        items: { select: { name: true, quantity: true, price: true } },
        payments: { select: { method: true, status: true }, take: 1 },
        wholesaleInvoice: { select: { invoiceNumber: true, isPaid: true, dueDate: true } },
      },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
