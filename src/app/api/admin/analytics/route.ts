/**
 * GET /api/admin/analytics
 *
 * Returns comprehensive analytics data for the admin dashboard.
 *
 * Query params:
 *   - range: "today" | "week" | "month" | "year" (default: "month")
 *
 * Returns:
 *   - Revenue summary (today, week, month, year)
 *   - Revenue over time (daily data points for line chart)
 *   - Order status breakdown
 *   - Payment method breakdown
 *   - Top selling products
 *   - Orders by district
 *   - Sales by category
 *   - New customers count
 *   - Low stock alerts
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"

function getRangeStart(range: string): Date {
  const now = new Date()
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case "week": {
      const weekStart = new Date(now)
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1 // Monday as start
      weekStart.setDate(now.getDate() - diff)
      weekStart.setHours(0, 0, 0, 0)
      return weekStart
    }
    case "year":
      return new Date(now.getFullYear(), 0, 1)
    case "month":
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN")

    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "month"

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now)
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    weekStart.setDate(now.getDate() - diff)
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const rangeStart = getRangeStart(range)

    // ─── Revenue summary ──────────────────────────────────────────────
    const [todayOrders, weekOrders, monthOrders, yearOrders, rangeOrders] = await Promise.all([
      db.order.aggregate({
        where: { createdAt: { gte: todayStart }, status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      }),
      db.order.aggregate({
        where: { createdAt: { gte: weekStart }, status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      }),
      db.order.aggregate({
        where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      }),
      db.order.aggregate({
        where: { createdAt: { gte: yearStart }, status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      }),
      db.order.aggregate({
        where: { createdAt: { gte: rangeStart }, status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      }),
    ])

    // ─── Revenue over time (daily for the selected range) ─────────────
    const rangeOrdersRaw = await db.order.findMany({
      where: { createdAt: { gte: rangeStart }, status: { not: "CANCELLED" } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    // Group by day
    const revenueByDay = new Map<string, { date: string; revenue: number; orders: number }>()
    for (const o of rangeOrdersRaw) {
      const dateKey = o.createdAt.toISOString().slice(0, 10) // YYYY-MM-DD
      const existing = revenueByDay.get(dateKey) || { date: dateKey, revenue: 0, orders: 0 }
      existing.revenue += o.total
      existing.orders += 1
      revenueByDay.set(dateKey, existing)
    }

    const revenueOverTime = Array.from(revenueByDay.values()).map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString("en-RW", {
        month: "short",
        day: "numeric",
      }),
    }))

    // ─── Order status breakdown ───────────────────────────────────────
    const statusBreakdown = await db.order.groupBy({
      by: ["status"],
      _count: true,
      where: { createdAt: { gte: rangeStart } },
    })

    // ─── Payment method breakdown ─────────────────────────────────────
    const paymentBreakdown = await db.payment.groupBy({
      by: ["method"],
      _count: true,
      _sum: { amount: true },
      where: {
        status: "PAID",
        initiatedAt: { gte: rangeStart },
      },
    })

    // ─── Top selling products ─────────────────────────────────────────
    const topItems = await db.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      _count: true,
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    })

    const topProductIds = topItems.filter((t) => t.productId).map((t) => t.productId!)
    const topProductsData = await db.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, slug: true, price: true, images: true, categoryId: true },
    })

    const topProducts = topItems
      .map((t) => {
        const p = topProductsData.find((pd) => pd.id === t.productId)
        if (!p) return null
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image: JSON.parse(p.images)[0] || null,
          totalSold: t._sum.quantity,
          orderCount: t._count,
          revenue: t._sum.quantity * p.price,
        }
      })
      .filter(Boolean)

    // ─── Orders by district ───────────────────────────────────────────
    const districtOrders = await db.order.groupBy({
      by: ["district"],
      _count: true,
      _sum: { total: true },
      where: { createdAt: { gte: rangeStart }, status: { not: "CANCELLED" } },
      orderBy: { _count: "desc" },
      take: 10,
    })

    const ordersByDistrict = districtOrders
      .filter((d) => d.district)
      .map((d) => ({
        district: d.district,
        orders: d._count,
        revenue: d._sum.total || 0,
      }))

    // ─── Sales by category ────────────────────────────────────────────
    const categorySalesRaw = await db.orderItem.findMany({
      where: {
        order: { createdAt: { gte: rangeStart }, status: { not: "CANCELLED" } },
      },
      select: {
        quantity: true,
        price: true,
        product: { select: { category: { select: { name: true } } } },
      },
    })

    const categoryMap = new Map<string, { revenue: number; quantity: number }>()
    for (const item of categorySalesRaw) {
      const catName = item.product?.category?.name || "Uncategorized"
      const existing = categoryMap.get(catName) || { revenue: 0, quantity: 0 }
      existing.revenue += item.price * item.quantity
      existing.quantity += item.quantity
      categoryMap.set(catName, existing)
    }

    const salesByCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue)

    // ─── New customers ────────────────────────────────────────────────
    const newCustomers = await db.user.count({
      where: {
        role: "CUSTOMER",
        createdAt: { gte: rangeStart },
        isDeleted: false,
      },
    })

    // ─── Low stock alerts ─────────────────────────────────────────────
    const lowStockProducts = await db.product.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        stock: { lte: 5 },
      },
      select: {
        id: true,
        name: true,
        stock: true,
        lowStockThreshold: true,
        images: true,
      },
      orderBy: { stock: "asc" },
      take: 10,
    })

    const lowStock = lowStockProducts.map((p) => ({
      ...p,
      image: JSON.parse(p.images)[0] || null,
      images: undefined,
    }))

    // ─── Recent orders ────────────────────────────────────────────────
    const recentOrders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: true, payments: true },
    })

    return NextResponse.json({
      revenue: {
        today: todayOrders._sum.total || 0,
        todayCount: todayOrders._count,
        week: weekOrders._sum.total || 0,
        weekCount: weekOrders._count,
        month: monthOrders._sum.total || 0,
        monthCount: monthOrders._count,
        year: yearOrders._sum.total || 0,
        yearCount: yearOrders._count,
        range: rangeOrders._sum.total || 0,
        rangeCount: rangeOrders._count,
      },
      revenueOverTime,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      paymentBreakdown: paymentBreakdown.map((p) => ({
        method: p.method,
        count: p._count,
        amount: p._sum.amount || 0,
      })),
      topProducts,
      ordersByDistrict,
      salesByCategory,
      newCustomers,
      lowStock,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
        itemCount: o.items.length,
        paymentMethod: o.payments[0]?.method || "COD",
        paymentStatus: o.payments[0]?.status || "PENDING",
      })),
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
