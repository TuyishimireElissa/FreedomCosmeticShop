/**
 * /api/admin/coupons/[id]
 *
 * PUT    — Update a coupon
 * DELETE — Delete a coupon
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { z } from "zod"

const UpdateCouponSchema = z.object({
  code: z.string().min(3).max(50).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]).optional(),
  value: z.number().int().min(0).optional(),
  minOrderAmount: z.number().int().min(0).optional().nullable(),
  maxDiscountAmount: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  usageLimitPerUser: z.number().int().min(1).optional(),
  startsAt: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  endsAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  isActive: z.boolean().optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
    const { id } = await params
    const body = await req.json()

    const parsed = UpdateCouponSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid coupon data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    // Check uniqueness if code is changing
    if (parsed.data.code && parsed.data.code.toUpperCase() !== existing.code) {
      const codeExists = await db.coupon.findFirst({
        where: { code: parsed.data.code.toUpperCase(), id: { not: id } },
      })
      if (codeExists) {
        return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 })
      }
    }

    const data: Record<string, unknown> = { ...parsed.data }
    if (data.code) data.code = (data.code as string).toUpperCase()

    const updated = await db.coupon.update({ where: { id }, data })
    return NextResponse.json({ coupon: updated })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Coupon update error:", error)
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
    const { id } = await params

    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    await db.coupon.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Coupon delete error:", error)
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 })
  }
}
