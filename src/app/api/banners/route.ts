/**
 * GET /api/banners
 *
 * Returns active banners for the home page.
 * Query params:
 *   - placement: filter by placement (HOME_HERO, HOME_PROMO, etc.)
 *
 * Banners are sorted by sortOrder ascending.
 * Only returns banners where isActive=true and within the scheduling window.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const placement = searchParams.get("placement")

    const now = new Date()

    const banners = await db.banner.findMany({
      where: {
        isActive: true,
        ...(placement ? { placement } : {}),
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ banners })
  } catch (error) {
    console.error("Failed to fetch banners:", error)
    return NextResponse.json(
      { error: "Failed to fetch banners" },
      { status: 500 }
    )
  }
}
