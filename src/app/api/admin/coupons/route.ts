/**
 * /api/admin/coupons
 *
 * GET  — List all coupons
 * POST — Create a new coupon
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { z } from "zod"

const CreateCouponSchema = z.object({
  code: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.number().int().min(0),
  minOrderAmount: z.number().int().min(0).optional().nullable(),
  maxDiscountAmount: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  usageLimitPerUser: z.number().int().min(1).default(1),
  startsAt: z.string().transform((s) => new Date(s)),
  endsAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  isActive: z.boolean().default(true),
})

export async function GET() {
  try {
    await requireRole("ADMIN")

    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ coupons })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Coupons list error:", error)
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN")
    const body = await req.json()

    const parsed = CreateCouponSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid coupon data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Check if code is unique
    const existing = await db.coupon.findFirst({
      where: { code: parsed.data.code.toUpperCase() },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Coupon code already exists" },
        { status: 400 }
      )
    }

    const coupon = await db.coupon.create({
      data: {
        ...parsed.data,
        code: parsed.data.code.toUpperCase(),
        appliesToAllProducts: true,
        categoryIds: "[]",
        productIds: "[]",
      },
    })

    return NextResponse.json({ coupon }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Coupon create error:", error)
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 })
  }
}
