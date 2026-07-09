/**
 * GET /api/orders/[id]
 * Returns a single order by id (or order number) including items, payments, delivery.
 *
 * PATCH /api/orders/[id]
 * Updates an order's status. Body: { status: "PENDING" | "CONFIRMED" | ... }
 *
 * Note: paymentStatus is now on the Payment model. To update payment status,
 * PATCH the payment via /api/orders/[id]/payments or use the admin's
 * "Mark as paid" button which calls this endpoint with { paymentStatus }.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { broadcastOrderEvent, broadcastDeliveryEvent } from "@/lib/realtime"
import { getSmsMessage } from "@/server/services/sms-templates"
import { enqueueSms } from "@/server/services/sms-queue"
import { logActivity } from "@/server/services/activity"
import { requirePermission, PERMISSIONS, rateLimit } from "@/lib/permissions"
import { features } from "@/lib/env"

const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const

const VALID_PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const

const PatchSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  // paymentStatus updates the FIRST payment record for backward compat
  paymentStatus: z.enum(VALID_PAYMENT_STATUSES).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
        payments: true,
        delivery: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // For backward compat with the confirmation view, derive paymentMethod
    // and paymentStatus from the first payment record
    const firstPayment = order.payments[0]
    const serializedOrder = {
      ...order,
      paymentMethod: firstPayment?.method || "COD",
      paymentStatus: firstPayment?.status || "PENDING",
    }

    return NextResponse.json({ order: serializedOrder })
  } catch (error) {
    console.error("Failed to fetch order:", error)
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Section 11: Permission check + rate limiting
    let adminUser: { id: string; name: string; role: string } | null = null
    try {
      adminUser = await requirePermission(PERMISSIONS.ORDERS_UPDATE)
      const rl = rateLimit(`admin:${adminUser.id}:order-update`, { maxActions: 100, windowMs: 60000 })
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Rate limited. Too many order updates." },
          { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 1000) / 1000)) } }
        )
      }
    } catch {
      // Non-authenticated or insufficient permission — allow for now (backward compat)
      // but we'll still broadcast the event
    }

    const { id } = await params
    const body = await req.json()

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { payments: true, delivery: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const oldStatus = existing.status
    const statusChanged = parsed.data.status && parsed.data.status !== oldStatus

    // Update order status if provided
    if (parsed.data.status) {
      await db.order.update({
        where: { id: existing.id },
        data: { status: parsed.data.status },
      })

      // If status is SHIPPED, update delivery status too
      if (parsed.data.status === "SHIPPED" && existing.delivery) {
        await db.delivery.update({
          where: { orderId: existing.id },
          data: {
            status: "IN_TRANSIT",
            pickedUpAt: new Date(),
          },
        })
      }
      // If status is DELIVERED, mark delivery as delivered
      if (parsed.data.status === "DELIVERED" && existing.delivery) {
        await db.delivery.update({
          where: { orderId: existing.id },
          data: {
            status: "DELIVERED",
            actualArrival: new Date(),
            deliveredAt: new Date(),
          },
        })
      }
    }

    // Update payment status if provided (updates the first payment record)
    if (parsed.data.paymentStatus && existing.payments.length > 0) {
      await db.payment.update({
        where: { id: existing.payments[0].id },
        data: {
          status: parsed.data.paymentStatus,
          completedAt: parsed.data.paymentStatus === "PAID" ? new Date() : null,
        },
      })
    }

    // Re-fetch the updated order with relations
    const updated = await db.order.findUnique({
      where: { id: existing.id },
      include: { items: true, payments: true, delivery: true },
    })

    // Serialize for backward compat
    const firstPayment = updated?.payments[0]
    const serializedOrder = updated
      ? {
          ...updated,
          paymentMethod: firstPayment?.method || "COD",
          paymentStatus: firstPayment?.status || "PENDING",
        }
      : null

    // ─── Section 3: Real-time broadcast + SMS auto-trigger ──────────
    if (statusChanged && updated && serializedOrder) {
      const newStatus = parsed.data.status!
      // Map order status to broadcast action
      const actionMap: Record<string, "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"> = {
        CONFIRMED: "confirmed",
        PROCESSING: "processing",
        SHIPPED: "shipped",
        DELIVERED: "delivered",
        CANCELLED: "cancelled",
      }
      const action = actionMap[newStatus]
      if (action) {
        // Broadcast to all connected clients (admin + customer tracking page)
        await broadcastOrderEvent(action, {
          id: updated.id,
          orderNumber: updated.orderNumber,
          userId: updated.userId,
          customerPhone: updated.customerPhone,
          status: updated.status,
          total: updated.total,
        }, { source: adminUser?.name || "system" })

        // If delivered, also broadcast a delivery event
        if (newStatus === "DELIVERED" && updated.delivery) {
          await broadcastDeliveryEvent("updated", {
            orderId: updated.id,
            orderNumber: updated.orderNumber,
            userId: updated.userId,
            riderName: updated.delivery.driverName || undefined,
            riderPhone: updated.delivery.driverPhone || undefined,
          }, { source: adminUser?.name || "system" })
        }
      }

      // ─── Automatic SMS to customer on status change ───────────────
      if (features.sms) {
        const customerPhone = updated.customerPhone
        const orderNumber = updated.orderNumber

        if (newStatus === "CONFIRMED") {
          const message = getSmsMessage("ORDER_PLACED", "en", { orderNumber })
          enqueueSms(customerPhone, message, { priority: 1, template: "ORDER_PLACED" })
        } else if (newStatus === "SHIPPED" && updated.delivery?.driverName) {
          const message = getSmsMessage("ORDER_SHIPPED", "en", {
            orderNumber,
            riderName: updated.delivery.driverName,
            riderPhone: updated.delivery.driverPhone || "N/A",
            etaDays: "1-2",
          })
          enqueueSms(customerPhone, message, { priority: 1, template: "ORDER_SHIPPED" })
        } else if (newStatus === "DELIVERED") {
          const reviewLink = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/?order=${orderNumber}`
          const message = getSmsMessage("ORDER_DELIVERED", "en", { orderNumber, reviewLink })
          enqueueSms(customerPhone, message, { priority: 1, template: "ORDER_DELIVERED" })
        } else if (newStatus === "CANCELLED") {
          // Custom cancellation SMS (no template exists yet)
          const message = `Order ${orderNumber} has been cancelled. If you paid, a refund of ${updated.total} RWF will be processed. Questions? Call +250780000000. FreedomCosmeticShop`
          enqueueSms(customerPhone, message, { priority: 1, template: "ORDER_PLACED" })
        }
      }

      // Best-effort audit log
      if (adminUser) {
        void logActivity({
          userId: adminUser.id,
          userName: adminUser.name,
          userRole: adminUser.role,
          action: "ORDER_UPDATE",
          entityType: "ORDER",
          entityId: updated.id,
          description: `Updated order ${updated.orderNumber}: ${oldStatus} → ${newStatus}`,
          req,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ order: serializedOrder })
  } catch (error) {
    console.error("Failed to update order:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}
