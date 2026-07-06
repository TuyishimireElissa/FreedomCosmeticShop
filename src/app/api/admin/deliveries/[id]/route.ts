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
import { requireRole } from "@/lib/auth"
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
    await requireRole("ADMIN")
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
