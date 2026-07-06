/**
 * Delivery Zones API — returns all Rwanda delivery zones with fees.
 *
 * GET /api/delivery/zones — all provinces with their fees + delivery times
 */
import { NextResponse } from "next/server"
import { DELIVERY_FEES, DELIVERY_TIMES } from "@/lib/format"

export async function GET() {
  const zones = Object.entries(DELIVERY_FEES).map(([province, fee]) => ({
    province,
    fee,
    deliveryTime: DELIVERY_TIMES[province] || "3-5 business days",
  }))

  return NextResponse.json({ zones })
}
