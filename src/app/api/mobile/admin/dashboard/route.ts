/**
 * GET /api/mobile/admin/dashboard
 *
 * Mobile-optimized admin dashboard data — compact payload for the
 * mobile admin mini-panel. Returns only the essentials needed for
 * quick actions on the go.
 *
 * Requires ADMIN/STAFF/MANAGER role (JWT auth via cookies).
 *
 * Returns:
 *   - todayRevenue, todayOrderCount
 *   - pendingOrders (last 10, with quick-confirm data)
 *   - lowStockProducts (top 5)
 *   - recentOrders (last 5)
 *   - liveVisitorCount
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, PERMISSIONS } from "@/lib/permissions"
import { getLiveStats } from "@/lib/live-stats"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ORDERS_READ)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Fetch all data in parallel
    const [
      todayRevenueAgg,
      todayOrderCount,
      pendingOrders,
      lowStockProducts,
      recentOrders,
      liveStats,
    ] = await Promise.all([
      db.order.aggregate({
        where: { createdAt: { gte: todayStart }, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      db.order.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.order.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: { select: { name: true, quantity: true } },
          payments: { select: { method: true, status: true }, take: 1 },
        },
      }),
      db.product.findMany({
        where: { isDeleted: false, isActive: true, stock: { lte: 5 } },
        select: { id: true, name: true, stock: true, images: true },
        orderBy: { stock: "asc" },
        take: 5,
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          status: true,
          createdAt: true,
        },
      }),
      Promise.resolve(getLiveStats()),
    ])

    // Serialize low stock images
    const lowStock = lowStockProducts.map((p) => ({
      ...p,
      image: JSON.parse(p.images)[0] || null,
      images: undefined,
    }))

    return NextResponse.json({
      summary: {
        todayRevenue: todayRevenueAgg._sum.total || 0,
        todayOrderCount,
        pendingCount: pendingOrders.length,
        lowStockCount: lowStock.length,
        activeVisitors: liveStats.activeVisitors,
      },
      pendingOrders: pendingOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        total: o.total,
        createdAt: o.createdAt,
        paymentMethod: o.payments[0]?.method || "COD",
        itemCount: o.items.length,
        items: o.items.slice(0, 3).map((i) => `${i.name} ×${i.quantity}`).join(", "),
      })),
      lowStock,
      recentOrders,
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Mobile admin dashboard error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 })
  }
}
