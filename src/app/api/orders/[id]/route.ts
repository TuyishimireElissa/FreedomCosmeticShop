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

    return NextResponse.json({ order: serializedOrder })
  } catch (error) {
    console.error("Failed to update order:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}
