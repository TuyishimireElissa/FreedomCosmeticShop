/**
 * GET /api/admin/customers
 *
 * List all customers with order count + total spending.
 *
 * Query params:
 *   - search: search by name, phone, or email
 *   - page: page number (default 1)
 *   - pageSize: items per page (default 50)
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN")

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() || ""
    const page = Math.max(1, Number(searchParams.get("page") || "1"))
    const pageSize = Math.min(
      200,
      Math.max(1, Number(searchParams.get("pageSize") || "50"))
    )

    const where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
      isDeleted: false,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const [customers, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          createdAt: true,
          loyaltyPoints: true,
          isDeleted: true,
          _count: {
            select: {
              orders: { where: { status: { not: "CANCELLED" } } },
            },
          },
          orders: {
            where: { status: { not: "CANCELLED" } },
            select: { total: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ])

    // Calculate total spending per customer
    const customerIds = customers.map((c) => c.id)
    const spendingData = await db.order.groupBy({
      by: ["userId"],
      _sum: { total: true },
      where: {
        userId: { in: customerIds },
        status: { not: "CANCELLED" },
      },
    })

    const spendingMap = new Map(spendingData.map((s) => [s.userId, s._sum.total || 0]))

    const serialized = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      createdAt: c.createdAt,
      loyaltyPoints: c.loyaltyPoints,
      orderCount: c._count.orders,
      totalSpent: spendingMap.get(c.id) || 0,
      lastOrderDate: c.orders[0]?.createdAt || null,
    }))

    return NextResponse.json({
      customers: serialized,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin customers error:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}
