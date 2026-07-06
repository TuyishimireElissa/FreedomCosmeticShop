/**
 * /api/admin/customers/[id]
 *
 * GET    — Fetch customer details + order history
 * PATCH  — Block/unblock customer (toggle isDeleted)
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
    const { id } = await params

    const customer = await db.user.findFirst({
      where: { id, role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        loyaltyPoints: true,
        isDeleted: true,
        addresses: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Fetch order history
    const orders = await db.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      include: { items: true, payments: true },
      take: 50,
    })

    const totalSpent = orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.total, 0)

    return NextResponse.json({
      customer,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt,
        itemCount: o.items.length,
        paymentMethod: o.payments[0]?.method || "COD",
        paymentStatus: o.payments[0]?.status || "PENDING",
        items: o.items,
      })),
      stats: {
        totalOrders: orders.length,
        totalSpent,
        completedOrders: orders.filter((o) => o.status === "DELIVERED").length,
        cancelledOrders: orders.filter((o) => o.status === "CANCELLED").length,
      },
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Customer details error:", error)
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
    const { id } = await params
    const body = await req.json()
    const { action } = body as { action: "block" | "unblock" }

    const customer = await db.user.findFirst({
      where: { id, role: "CUSTOMER" },
    })
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const isDeleted = action === "block"
    const updated = await db.user.update({
      where: { id },
      data: {
        isDeleted,
        deletedAt: isDeleted ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      customer: {
        id: updated.id,
        isDeleted: updated.isDeleted,
      },
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Customer update error:", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}
