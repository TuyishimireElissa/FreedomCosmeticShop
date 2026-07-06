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
