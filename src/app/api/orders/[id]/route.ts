/**
 * GET /api/orders/[id]
 * Returns a single order by id (or order number) including its items.
 *
 * PATCH /api/orders/[id]
 * Updates an order's status. Body: { status: "PENDING" | "CONFIRMED" | ... }
 * Also updates paymentStatus if provided in body.
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
] as const

const VALID_PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const

const PatchSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
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
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ order })
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
    })
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const updated = await db.order.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        paymentStatus: parsed.data.paymentStatus,
      },
      include: { items: true },
    })

    return NextResponse.json({ order: updated })
  } catch (error) {
    console.error("Failed to update order:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}
