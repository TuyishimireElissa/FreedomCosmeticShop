/**
 * GET /api/admin/stats
 *
 * Returns analytics for the admin dashboard:
 *   - Total products, active products, low stock count, out of stock count
 *   - Total orders, pending orders, revenue (delivered)
 *   - Total customers
 *   - Top selling products (by OrderItem quantity)
 *   - Recent orders (last 5)
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET() {
  try {
    await requireRole("ADMIN")

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalCustomers,
      topProductsRaw,
      recentOrders,
    ] = await Promise.all([
      db.product.count({ where: { isDeleted: false } }),
      db.product.count({ where: { isDeleted: false, isActive: true } }),
      db.product.count({
        where: {
          isDeleted: false,
          stock: { gt: 0, lte: 5 },
        },
      }),
      db.product.count({
        where: { isDeleted: false, stock: 0 },
      }),
      db.order.count(),
      db.order.count({ where: { status: "PENDING" } }),
      db.order.count({ where: { status: "DELIVERED" } }),
      db.user.count({ where: { isDeleted: false, role: "CUSTOMER" } }),
      // Top selling products
      db.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { items: true },
      }),
    ])

    // Fetch product details for top products
    const topProductIds = topProductsRaw
      .filter((t) => t.productId)
      .map((t) => t.productId!)
    const topProductsData = await db.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, slug: true, price: true, images: true },
    })
    const topProducts = topProductsRaw
      .map((t) => {
        const p = topProductsData.find((pd) => pd.id === t.productId)
        if (!p) return null
        return {
          ...p,
          image: JSON.parse(p.images)[0] || null,
          images: undefined,
          totalSold: t._sum.quantity,
        }
      })
      .filter(Boolean)

    // Calculate revenue from delivered orders
    const deliveredOrdersData = await db.order.findMany({
      where: { status: "DELIVERED" },
      select: { total: true },
    })
    const revenue = deliveredOrdersData.reduce((sum, o) => sum + o.total, 0)

    return NextResponse.json({
      products: {
        total: totalProducts,
        active: activeProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        delivered: deliveredOrders,
        revenue,
      },
      customers: {
        total: totalCustomers,
      },
      topProducts,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
        itemCount: o.items.length,
      })),
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
