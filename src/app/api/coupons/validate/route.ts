/**
 * POST /api/coupons/validate
 *
 * Validates a coupon code and returns the discount details.
 *
 * Body: { code, subtotal }
 *
 * Returns:
 *   - 200: { valid: true, coupon: {...}, discountAmount, message }
 *   - 400: { valid: false, error: "..." }
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { code, subtotal } = body as { code: string; subtotal: number }

    if (!code || typeof subtotal !== "number" || subtotal < 0) {
      return NextResponse.json(
        { valid: false, error: "Code and subtotal are required" },
        { status: 400 }
      )
    }

    const coupon = await db.coupon.findFirst({
      where: {
        code: code.toUpperCase().trim(),
        isActive: true,
      },
    })

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: "Invalid coupon code" },
        { status: 400 }
      )
    }

    const now = new Date()

    // Check validity window
    if (coupon.startsAt && coupon.startsAt > now) {
      return NextResponse.json(
        { valid: false, error: "This coupon is not yet active" },
        { status: 400 }
      )
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      return NextResponse.json(
        { valid: false, error: "This coupon has expired" },
        { status: 400 }
      )
    }

    // Check usage limits
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { valid: false, error: "This coupon has reached its usage limit" },
        { status: 400 }
      )
    }

    // Check minimum order
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum order of RWF ${coupon.minOrderAmount.toLocaleString()} required for this coupon`,
        },
        { status: 400 }
      )
    }

    // Calculate discount
    let discountAmount = 0
    if (coupon.type === "PERCENTAGE") {
      discountAmount = Math.round((subtotal * coupon.value) / 100)
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
      }
    } else if (coupon.type === "FIXED") {
      discountAmount = coupon.value
    } else if (coupon.type === "FREE_SHIPPING") {
      // Free shipping — discountAmount = delivery fee (calculated at checkout)
      discountAmount = 0 // Will be applied to delivery fee
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
      },
      discountAmount,
      freeShipping: coupon.type === "FREE_SHIPPING",
      message:
        coupon.type === "PERCENTAGE"
          ? `${coupon.value}% off applied!`
          : coupon.type === "FIXED"
          ? `RWF ${coupon.value.toLocaleString()} off applied!`
          : "Free shipping applied!",
    })
  } catch (error) {
    console.error("Coupon validation error:", error)
    return NextResponse.json(
      { valid: false, error: "Failed to validate coupon" },
      { status: 500 }
    )
  }
}
