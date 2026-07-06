/**
 * POST /api/sms/abandoned-cart
 *
 * Track cart activity for abandoned cart detection.
 * Called by the frontend when items are added/updated in the cart.
 *
 * Body: { userId, phone, itemCount, cartValue }
 *
 * Also called when an order is placed (to clear tracking):
 * Body: { userId, clear: true }
 */
import { NextResponse } from "next/server"
import { trackCartActivity, clearCartTracking } from "@/server/services/sms-scheduler"
import { z } from "zod"

const TrackCartSchema = z.object({
  userId: z.string(),
  phone: z.string().optional(),
  itemCount: z.number().int().min(0).optional(),
  cartValue: z.number().min(0).optional(),
  clear: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = TrackCartSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { userId, phone, itemCount, cartValue, clear } = parsed.data

    if (clear) {
      clearCartTracking(userId)
      return NextResponse.json({ success: true, message: "Cart tracking cleared" })
    }

    if (!phone || itemCount === undefined || cartValue === undefined) {
      return NextResponse.json({ error: "phone, itemCount, and cartValue required" }, { status: 400 })
    }

    trackCartActivity(userId, phone, itemCount, cartValue)
    return NextResponse.json({ success: true, message: "Cart activity tracked" })
  } catch (error) {
    console.error("Abandoned cart tracking error:", error)
    return NextResponse.json({ error: "Failed to track cart" }, { status: 500 })
  }
}
