/** GET /api/admin/wholesale/customers — list all approved wholesale customers */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN")
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""

    const where: Record<string, unknown> = {
      wholesaleStatus: "APPROVED",
      isDeleted: false,
    }
    if (search) {
      where.OR = [
        { businessName: { contains: search } },
        { businessPhone: { contains: search } },
        { name: { contains: search } },
      ]
    }

    const customers = await db.user.findMany({
      where,
      orderBy: { wholesaleApprovedAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        businessName: true,
        businessType: true,
        businessPhone: true,
        businessDistrict: true,
        tinNumber: true,
        wholesaleApprovedAt: true,
        wholesaleDiscount: true,
        createdAt: true,
        _count: { select: { orders: { where: { orderType: "WHOLESALE" } } } },
      },
    })

    // Get credit + revenue for each customer
    const enriched = await Promise.all(
      customers.map(async (c) => {
        const credit = await db.wholesaleCredit.findUnique({ where: { userId: c.id } })
        const revenueAgg = await db.order.aggregate({
          where: { userId: c.id, orderType: "WHOLESALE", status: { not: "CANCELLED" } },
          _sum: { total: true },
        })
        return {
          ...c,
          credit: credit
            ? { limit: credit.creditLimit, used: credit.usedCredit, available: credit.availableCredit }
            : null,
          totalRevenue: revenueAgg._sum.total || 0,
          orderCount: c._count.orders,
        }
      })
    )

    return NextResponse.json({ customers: enriched })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}
