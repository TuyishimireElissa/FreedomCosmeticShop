/**
 * GET /api/delivery/sectors/:district
 *
 * Returns all sectors for a given district.
 */
import { NextResponse } from "next/server"
import { getSectorsByDistrict } from "@/server/services/delivery.service"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ district: string }> }
) {
  const { district } = await params
  const sectors = getSectorsByDistrict(district)

  if (sectors.length === 0) {
    return NextResponse.json(
      { error: `No sectors found for district: ${district}` },
      { status: 404 }
    )
  }

  return NextResponse.json({ district, sectors })
}
