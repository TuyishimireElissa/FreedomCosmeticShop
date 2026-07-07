/**
 * GET /api/delivery/calculate?district=Gasabo&orderTotal=25000
 *
 * Returns full delivery calculation including:
 *   - Zone, fee, delivery time
 *   - Free delivery check
 *   - Amount needed for free delivery
 *   - User-friendly message
 */
import { NextResponse } from "next/server"
import { calculateDelivery } from "@/server/services/delivery.service"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const district = searchParams.get("district")
  const orderTotalStr = searchParams.get("orderTotal")

  if (!district) {
    return NextResponse.json(
      { error: "district parameter is required" },
      { status: 400 }
    )
  }

  const orderTotal = orderTotalStr ? Number(orderTotalStr) : 0

  if (isNaN(orderTotal) || orderTotal < 0) {
    return NextResponse.json(
      { error: "orderTotal must be a valid number" },
      { status: 400 }
    )
  }

  const calculation = calculateDelivery(district, orderTotal)

  return NextResponse.json(calculation)
}
