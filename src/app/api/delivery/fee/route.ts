export const dynamic = 'force-dynamic'

/**
 * Delivery Fee API — calculate delivery fee for a district.
 *
 * GET /api/delivery/fee?district=Gasabo — returns { fee, deliveryTime, province }
 */
import { NextResponse } from "next/server"
import { DELIVERY_FEES, DELIVERY_TIMES } from "@/lib/format"
import { DISTRICT_TO_PROVINCE_MAP } from "@/lib/rwanda-locations"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const district = searchParams.get("district")

  if (!district) {
    return NextResponse.json(
      { error: "district parameter is required" },
      { status: 400 }
    )
  }

  const province = DISTRICT_TO_PROVINCE_MAP[district] || "Kigali City"
  const fee = DELIVERY_FEES[province] ?? 3000
  const deliveryTime = DELIVERY_TIMES[province] || "3-5 business days"

  return NextResponse.json({
    district,
    province,
    fee,
    deliveryTime,
  })
}
