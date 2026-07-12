export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/deliveries/[id]
 *
 * Update a delivery — assign rider, update status, add notes.
 *
 * Body:
 *   - driverName?: string
 *   - driverPhone?: string
 *   - vehiclePlate?: string
 *   - status?: "PENDING" | "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "FAILED"
 *   - notes?: string
 *   - trackingCode?: string
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, PERMISSIONS, rateLimit } from "@/lib/permissions"
import { broadcastDeliveryEvent, broadcastOrderEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const UpdateDeliverySchema = z.object({
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  vehiclePlate: z.string().optional(),
  status: z
    .enum(["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED"])
    .optional(),
  notes: z.string().optional(),
  trackingCode: z.string().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Section 11: Permission check + rate limiting
    const adminUser = await requirePermission(PERMISSIONS.DELIVERIES_UPDATE)
    const rl = rateLimit(`admin:${adminUser.id}:delivery-update`, { maxActions: 60, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limited. Too many delivery updates." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 1000) / 1000)) } }
      )
    }
    const { id } = await params
    const body = await req.json()

    const parsed = UpdateDeliverySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.delivery.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = { ...parsed.data }

    // Auto-set timestamps based on status
    if (parsed.data.status === "ASSIGNED" && !existing.assignedAt) {
      data.assignedAt = new Date()
    }
    if (parsed.data.status === "PICKED_UP" && !existing.pickedUpAt) {
      data.pickedUpAt = new Date()
    }
    if (parsed.data.status === "DELIVERED") {
      data.deliveredAt = new Date()
      data.actualArrival = new Date()
    }

    const updated = await db.delivery.update({
      where: { id },
      data,
      include: { order: true },
    })

    // If delivery is delivered, update the order status too
    if (parsed.data.status === "DELIVERED" && updated.order.status !== "DELIVERED") {
      await db.order.update({
        where: { id: updated.orderId },
        data: { status: "DELIVERED" },
      })
    }

    // ─── Section 7: Real-time broadcast ──────────────────────────────
    // Determine if this is a rider assignment (driverName was just set)
    const wasRiderAssigned =
      parsed.data.driverName && !existing.driverName && parsed.data.status === "ASSIGNED"

    if (wasRiderAssigned) {
      // Rider just assigned — emit 'assigned' event to the customer
      await broadcastDeliveryEvent("assigned", {
        orderId: updated.orderId,
        orderNumber: updated.order.orderNumber,
        userId: updated.order.userId,
        riderName: updated.driverName || undefined,
        riderPhone: updated.driverPhone || undefined,
      }, { source: adminUser.name })
    } else {
      // General delivery update (status change, notes, etc.)
      await broadcastDeliveryEvent("updated", {
        orderId: updated.orderId,
        orderNumber: updated.order.orderNumber,
        userId: updated.order.userId,
        riderName: updated.driverName || undefined,
        riderPhone: updated.driverPhone || undefined,
      }, { source: adminUser.name })
    }

    // If the delivery status changed to DELIVERED, also broadcast an order event
    // so the customer's tracking page + order list update live
    if (parsed.data.status === "DELIVERED") {
      await broadcastOrderEvent("delivered", {
        id: updated.order.id,
        orderNumber: updated.order.orderNumber,
        userId: updated.order.userId,
        customerPhone: updated.order.customerPhone,
        status: "DELIVERED",
        total: updated.order.total,
      }, { source: adminUser.name })
    }

    // Best-effort audit log
    const changes: string[] = []
    if (parsed.data.driverName) changes.push(`rider: ${parsed.data.driverName}`)
    if (parsed.data.status) changes.push(`status: ${existing.status} → ${parsed.data.status}`)
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "DELIVERY_UPDATE",
      entityType: "DELIVERY",
      entityId: updated.id,
      description: `Updated delivery for ${updated.order.orderNumber}: ${changes.join(", ") || "no changes"}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ delivery: updated })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Delivery update error:", error)
    return NextResponse.json({ error: "Failed to update delivery" }, { status: 500 })
  }
}
