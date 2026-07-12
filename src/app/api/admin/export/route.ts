export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/export?type=orders|products|customers&format=csv
 *
 * Exports data as CSV for download.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const headerLine = headers.join(",")
  const dataLines = rows.map((r) => r.map(escapeCsvField).join(","))
  return [headerLine, ...dataLines].join("\n")
}

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "MANAGER")

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "orders"

    let csv = ""
    let filename = ""

    if (type === "orders") {
      filename = `orders-${new Date().toISOString().split("T")[0]}.csv`
      const orders = await db.order.findMany({
        orderBy: { createdAt: "desc" },
        include: { items: true, payments: true },
        take: 5000,
      })

      const headers = [
        "Order Number",
        "Date",
        "Customer Name",
        "Phone",
        "Email",
        "Province",
        "District",
        "Address",
        "Items",
        "Subtotal",
        "Discount",
        "Delivery Fee",
        "Total",
        "Payment Method",
        "Payment Status",
        "Order Status",
      ]

      const rows = orders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toISOString(),
        o.customerName,
        o.customerPhone,
        o.customerEmail || "",
        o.province,
        o.district || "",
        o.address,
        o.items.length,
        o.subtotal,
        o.discountAmount,
        o.deliveryFee,
        o.total,
        o.payments[0]?.method || "COD",
        o.payments[0]?.status || "PENDING",
        o.status,
      ])

      csv = toCsv(headers, rows)
    } else if (type === "products") {
      filename = `products-${new Date().toISOString().split("T")[0]}.csv`
      const products = await db.product.findMany({
        where: { isDeleted: false },
        include: { category: true, brand: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      })

      const headers = [
        "Name",
        "SKU",
        "Category",
        "Brand",
        "Price",
        "Compare At",
        "Stock",
        "Rating",
        "Reviews",
        "Featured",
        "Active",
        "Created At",
      ]

      const rows = products.map((p) => [
        p.name,
        p.sku || "",
        p.category?.name || "",
        p.brand?.name || "",
        p.price,
        p.compareAt || "",
        p.stock,
        p.rating,
        p.reviewsCount,
        p.featured ? "Yes" : "No",
        p.isActive ? "Yes" : "No",
        new Date(p.createdAt).toISOString(),
      ])

      csv = toCsv(headers, rows)
    } else if (type === "customers") {
      filename = `customers-${new Date().toISOString().split("T")[0]}.csv`
      const customers = await db.user.findMany({
        where: { role: "CUSTOMER" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          loyaltyPoints: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        take: 5000,
      })

      const headers = ["Name", "Phone", "Email", "Loyalty Points", "Orders", "Joined"]

      const rows = customers.map((c) => [
        c.name,
        c.phone,
        c.email || "",
        c.loyaltyPoints,
        c._count.orders,
        new Date(c.createdAt).toISOString(),
      ])

      csv = toCsv(headers, rows)
    } else if (type === "payments") {
      filename = `payments-${new Date().toISOString().split("T")[0]}.csv`
      const payments = await db.payment.findMany({
        orderBy: { initiatedAt: "desc" },
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              customerPhone: true,
            },
          },
        },
        take: 5000,
      })

      const headers = [
        "TXN ID",
        "Provider TXN ID",
        "Date",
        "Order Number",
        "Customer Name",
        "Customer Phone",
        "Method",
        "Amount",
        "Status",
        "Phone Used",
        "Card Last4",
        "Card Brand",
        "Failure Reason",
      ]

      const rows = payments.map((p) => [
        p.id,
        p.providerTransactionId || "",
        new Date(p.initiatedAt).toISOString(),
        p.order?.orderNumber || "",
        p.order?.customerName || "",
        p.order?.customerPhone || "",
        p.method,
        p.amount,
        p.status,
        p.phoneNumber || "",
        p.cardLast4 || "",
        p.cardBrand || "",
        p.failureReason || "",
      ])

      csv = toCsv(headers, rows)
    } else if (type === "analytics") {
      // Summary CSV — pulls the same data as /api/admin/analytics?range=<range>
      // and lays it out as a flat CSV report.
      const rangeParam = searchParams.get("range") || "month"

      // Compute range start (mirror analytics route logic)
      const nowDate = new Date()
      let rangeStart: Date
      switch (rangeParam) {
        case "today":
          rangeStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
          break
        case "week": {
          const ws = new Date(nowDate)
          const d = nowDate.getDay()
          const diff = d === 0 ? 6 : d - 1
          ws.setDate(nowDate.getDate() - diff)
          ws.setHours(0, 0, 0, 0)
          rangeStart = ws
          break
        }
        case "year":
          rangeStart = new Date(nowDate.getFullYear(), 0, 1)
          break
        case "month":
        default:
          rangeStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)
      }

      const [rangeAgg, paidAgg, deliveredAgg, newCustCount, totalProducts, lowStockCount] = await Promise.all([
        db.order.aggregate({
          where: { createdAt: { gte: rangeStart }, status: { not: "CANCELLED" } },
          _sum: { total: true },
          _count: true,
        }),
        db.payment.aggregate({
          where: { status: "PAID", initiatedAt: { gte: rangeStart } },
          _sum: { amount: true },
          _count: true,
        }),
        db.order.count({
          where: { createdAt: { gte: rangeStart }, status: "DELIVERED" },
        }),
        db.user.count({
          where: { role: "CUSTOMER", createdAt: { gte: rangeStart }, isDeleted: false },
        }),
        db.product.count({ where: { isDeleted: false } }),
        db.product.count({ where: { isDeleted: false, stock: { lte: 5 } } }),
      ])

      // Repeat customer rate
      const customerOrderCounts = await db.order.groupBy({
        by: ["userId"],
        _count: true,
        where: {
          createdAt: { gte: rangeStart },
          status: { not: "CANCELLED" },
          userId: { not: null },
        },
      })
      const uniqueCust = customerOrderCounts.length
      const repeatCust = customerOrderCounts.filter((c) => c._count >= 2).length
      const repeatRate = uniqueCust > 0 ? Math.round((repeatCust / uniqueCust) * 100) : 0

      const totalRevenue = rangeAgg._sum.total || 0
      const totalOrders = rangeAgg._count
      const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

      filename = `analytics-${rangeParam}-${new Date().toISOString().split("T")[0]}.csv`
      const headers = ["Metric", "Value"]
      const rows: (string | number)[][] = [
        ["Report Range", rangeParam],
        ["Range Start", rangeStart.toISOString()],
        ["Range End", nowDate.toISOString()],
        ["Generated At", new Date().toISOString()],
        [""],
        ["Total Revenue (RWF)", totalRevenue],
        ["Total Orders", totalOrders],
        ["Average Order Value (RWF)", aov],
        ["Paid Payments Count", paidAgg._count],
        ["Paid Payments Amount (RWF)", paidAgg._sum.amount || 0],
        ["Delivered Orders", deliveredAgg],
        ["New Customers", newCustCount],
        ["Unique Customers (in range)", uniqueCust],
        ["Repeat Customers (>=2 orders)", repeatCust],
        ["Repeat Customer Rate (%)", repeatRate],
        [""],
        ["Total Products", totalProducts],
        ["Low Stock Products", lowStockCount],
      ]

      csv = toCsv(headers, rows)
    } else {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export" }, { status: 500 })
  }
}
