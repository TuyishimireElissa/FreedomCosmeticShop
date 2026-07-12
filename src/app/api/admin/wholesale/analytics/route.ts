export const dynamic = 'force-dynamic'

/** GET /api/admin/wholesale/analytics — wholesale revenue + customer analytics */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET() {
  try {
    await requireRole("ADMIN")

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      wholesaleRevenue,
      retailRevenue,
      wholesaleOrderCount,
      retailOrderCount,
      topCustomers,
      topProducts,
      creditOverview,
      businessTypes,
    ] = await Promise.all([
      db.order.aggregate({
        where: { orderType: "WHOLESALE", status: { not: "CANCELLED" }, createdAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      db.order.aggregate({
        where: { orderType: "RETAIL", status: { not: "CANCELLED" }, createdAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      db.order.count({
        where: { orderType: "WHOLESALE", createdAt: { gte: monthStart } },
      }),
      db.order.count({
        where: { orderType: "RETAIL", createdAt: { gte: monthStart } },
      }),
      // Top 10 wholesale customers by revenue
      db.order.groupBy({
        by: ["userId"],
        where: { orderType: "WHOLESALE", status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
      // Top wholesale products
      db.orderItem.groupBy({
        by: ["productId"],
        where: { order: { orderType: "WHOLESALE" } },
        _sum: { quantity: true },
        _count: true,
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
      // Credit overview
      db.wholesaleCredit.aggregate({
        _sum: { creditLimit: true, usedCredit: true, availableCredit: true },
      }),
      // Business type distribution
      db.user.groupBy({
        by: ["businessType"],
        where: { wholesaleStatus: "APPROVED", isDeleted: false },
        _count: true,
      }),
    ])

    // Enrich top customers with names
    const topCustomerIds = topCustomers.filter((c) => c.userId).map((c) => c.userId!)
    const customerData = await db.user.findMany({
      where: { id: { in: topCustomerIds } },
      select: { id: true, businessName: true, name: true },
    })
    const customerMap = new Map(customerData.map((c) => [c.id, c]))

    // Enrich top products with names
    const topProductIds = topProducts.filter((p) => p.productId).map((p) => p.productId!)
    const productData = await db.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true },
    })
    const productMap = new Map(productData.map((p) => [p.id, p]))

    const totalRevenue = (wholesaleRevenue._sum.total || 0) + (retailRevenue._sum.total || 0)
    const wholesalePct = totalRevenue > 0 ? Math.round(((wholesaleRevenue._sum.total || 0) / totalRevenue) * 100) : 0

    return NextResponse.json({
      thisMonth: {
        wholesaleRevenue: wholesaleRevenue._sum.total || 0,
        retailRevenue: retailRevenue._sum.total || 0,
        wholesalePct,
        wholesaleOrders: wholesaleOrderCount,
        retailOrders: retailOrderCount,
        avgWholesaleOrder: wholesaleOrderCount > 0 ? Math.round((wholesaleRevenue._sum.total || 0) / wholesaleOrderCount) : 0,
      },
      topCustomers: topCustomers.map((c) => {
        const cust = c.userId ? customerMap.get(c.userId) : null
        return {
          userId: c.userId,
          businessName: cust?.businessName || cust?.name || "Unknown",
          revenue: c._sum.total || 0,
          orderCount: c._count,
        }
      }),
      topProducts: topProducts.map((p) => {
        const prod = p.productId ? productMap.get(p.productId) : null
        return {
          productId: p.productId,
          name: prod?.name || "Unknown",
          totalSold: p._sum.quantity || 0,
          orderCount: p._count,
        }
      }),
      credit: {
        totalLimit: creditOverview._sum.creditLimit || 0,
        totalUsed: creditOverview._sum.usedCredit || 0,
        totalAvailable: creditOverview._sum.availableCredit || 0,
      },
      businessTypes: businessTypes.map((b) => ({
        type: b.businessType || "OTHER",
        count: b._count,
      })),
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
