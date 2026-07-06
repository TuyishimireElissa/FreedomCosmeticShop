/**
 * GET /api/admin/notifications
 *
 * Returns new orders since the last check (for real-time notifications).
 *
 * Query params:
 *   - since: ISO date string — only return orders after this timestamp
 *
 * Returns:
 *   - newOrders: count of new orders since timestamp
 *   - newOrdersList: details of the 5 most recent new orders
 *   - lowStockCount: number of low-stock products
 *   - pendingPayments: count of pending payments
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN")

    const { searchParams } = new URL(req.url)
    const sinceParam = searchParams.get("since")
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 5 * 60 * 1000) // Default: last 5 min

    // New orders since timestamp
    const newOrders = await db.order.findMany({
      where: { createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: true },
    })

    // Low stock count
    const lowStockCount = await db.product.count({
      where: {
        isDeleted: false,
        isActive: true,
        stock: { lte: 5 },
      },
    })

    // Pending payments count
    const pendingPayments = await db.payment.count({
      where: { status: "PENDING" },
    })

    // Total new orders count
    const newOrdersCount = await db.order.count({
      where: { createdAt: { gt: since } },
    })

    return NextResponse.json({
      newOrdersCount,
      newOrders: newOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: o.total,
        createdAt: o.createdAt,
        itemCount: o.items.length,
      })),
      lowStockCount,
      pendingPayments,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Notifications error:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}
