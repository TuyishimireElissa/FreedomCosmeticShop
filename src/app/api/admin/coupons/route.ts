/**
 * /api/admin/coupons
 *
 * GET  — List all coupons
 * POST — Create a new coupon
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { broadcastCouponEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
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
      include: {
        orders: {
          where: { status: { not: "CANCELLED" } },
          select: { total: true },
        },
      },
    })

    // Compute revenue generated per coupon (sum of non-cancelled order totals)
    const serialized = coupons.map((c) => {
      const revenueGenerated = c.orders.reduce((sum, o) => sum + o.total, 0)
      const { orders: _orders, ...couponFields } = c
      return {
        ...couponFields,
        revenueGenerated,
        redemptionCount: c.usedCount,
      }
    })

    return NextResponse.json({ coupons: serialized })
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
    const adminUser = await requireRole("ADMIN")
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
        code: parsed.data.code.toUpperCase(),
        description: parsed.data.description,
        type: parsed.data.type!,
        value: parsed.data.value!,
        minOrderAmount: parsed.data.minOrderAmount,
        maxDiscountAmount: parsed.data.maxDiscountAmount,
        usageLimit: parsed.data.usageLimit,
        usageLimitPerUser: parsed.data.usageLimitPerUser ?? 1,
        startsAt: parsed.data.startsAt!,
        endsAt: parsed.data.endsAt,
        isActive: parsed.data.isActive ?? true,
        appliesToAllProducts: true,
        categoryIds: "[]",
        productIds: "[]",
      },
    })

    // ─── Section 5: Real-time broadcast ──────────────────────────────
    // Notify storefront that a new coupon is available — customers can
    // use it immediately at checkout.
    await broadcastCouponEvent("created", {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      isActive: coupon.isActive,
    }, { source: adminUser.name })

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "COUPON_CREATE",
      entityType: "COUPON",
      entityId: coupon.id,
      description: `Created coupon: ${coupon.code} (${coupon.type === "PERCENTAGE" ? `${coupon.value}%` : coupon.type === "FIXED" ? `${coupon.value} RWF` : "Free shipping"})`,
      req,
    }).catch(() => {})

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
