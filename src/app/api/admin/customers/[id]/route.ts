export const dynamic = 'force-dynamic'

/**
 * /api/admin/customers/[id]
 *
 * GET    — Fetch customer details + order history
 * PATCH  — Block/unblock customer (toggle isDeleted)
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { DESTRUCTIVE_OPERATIONS, requireDestructiveOperation } from "@/lib/permissions"
import { broadcastLoyaltyEvent, broadcastCustomerEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN")
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
    let adminUser = await requireRole("SUPER_ADMIN", "ADMIN")
    const { id } = await params
    const body = await req.json()
    const { action } = body as {
      action: "block" | "unblock" | "add_points" | "subtract_points"
      points?: number
      reason?: string
    }
    if (!(["block", "unblock", "add_points", "subtract_points"] as const).includes(action)) {
      return NextResponse.json({ error: "Invalid customer action" }, { status: 400 })
    }
    if (action === "block") {
      adminUser = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.CUSTOMER_DISABLE)
    }

    const customer = await db.user.findFirst({
      where: { id, role: "CUSTOMER" },
    })
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // ---- Loyalty points adjustment (with ledger entry) ----
    if (action === "add_points" || action === "subtract_points") {
      const delta = Number(body.points) || 0
      if (delta <= 0) {
        return NextResponse.json(
          { error: "Points must be a positive integer" },
          { status: 400 }
        )
      }
      const signedDelta = action === "add_points" ? delta : -delta
      const newBalance = Math.max(0, customer.loyaltyPoints + signedDelta)
      const reason = (body.reason || "Admin adjustment").toString().slice(0, 200)

      // Update user balance + create ledger entry atomically
      const [updated, ledger] = await db.$transaction([
        db.user.update({
          where: { id },
          data: { loyaltyPoints: newBalance },
        }),
        db.loyaltyPoints.create({
          data: {
            userId: id,
            points: signedDelta,
            type: "ADJUSTMENT",
            reason,
            balanceAfter: newBalance,
          },
        }),
      ])

      // ─── Section 5: Real-time loyalty broadcast ───────────────────
      // Notify the customer's browser that their points balance changed
      // so the account dashboard + header points display update live.
      await broadcastLoyaltyEvent(
        action === "add_points" ? "earned" : "redeemed",
        {
          userId: id,
          points: signedDelta,
          balance: newBalance,
          reason,
        },
        { source: adminUser.name }
      )

      return NextResponse.json({
        success: true,
        customer: {
          id: updated.id,
          loyaltyPoints: updated.loyaltyPoints,
        },
        ledger: {
          id: ledger.id,
          points: ledger.points,
          balanceAfter: ledger.balanceAfter,
        },
      })
    }

    // ---- Block / unblock ----
    const isDeleted = action === "block"
    const updated = await db.user.update({
      where: { id },
      data: {
        isDeleted,
        deletedAt: isDeleted ? new Date() : null,
      },
    })

    // ─── Section 9: Real-time customer block/unblock broadcast ──────
    // Notify the customer's browser so they get logged out immediately
    // if blocked, or see a reactivation toast if unblocked.
    await broadcastCustomerEvent(
      isDeleted ? "blocked" : "unblocked",
      {
        userId: id,
        userName: updated.name,
      },
      { source: adminUser.name }
    )

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: isDeleted ? "CUSTOMER_BLOCK" : "CUSTOMER_UNBLOCK",
      entityType: "CUSTOMER",
      entityId: id,
      description: `${isDeleted ? "Blocked" : "Unblocked"} customer: ${updated.name}`,
      req,
    }).catch(() => {})

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
