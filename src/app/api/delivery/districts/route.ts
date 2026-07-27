/**
 * GET /api/delivery/districts
 *
 * Returns all 30 Rwanda districts grouped by province.
 */
import { NextResponse } from "next/server"
import { RWANDA_DISTRICTS, RWANDA_PROVINCES } from "@/lib/rwanda-locations"

export async function GET() {
  const provinces = RWANDA_PROVINCES.map((province) => ({
    province,
    districts: RWANDA_DISTRICTS[province],
  }))

  return NextResponse.json({ provinces })
}
