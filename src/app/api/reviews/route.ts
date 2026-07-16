export const dynamic = 'force-dynamic'

/**
 * /api/reviews
 *
 * GET /api/reviews?productId=xxx
 *   Returns approved reviews for a product, sorted by helpfulVotes desc.
 *
 * POST /api/reviews
 *   Creates a new review. Body:
 *     { productId, rating, title?, body?, skinType?, shadeUsed? }
 *   Requires authentication (user must be logged in).
 *   Reviews are created with isApproved=false (pending moderation).
 *   In dev, reviews are auto-approved for immediate display.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "50")))

    const reviews = await db.review.findMany({
      where: {
        ...(productId ? { productId } : {}),
        isApproved: true,
        isVerified: true,
        isHidden: false,
        isDeleted: false,
      },
      orderBy: [{ helpfulVotes: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        user: { select: { name: true, avatar: true } },
        product: { select: { name: true, slug: true } },
      },
    })

    // Deserialize photos
    const serialized = reviews.map((r) => ({
      ...r,
      photos: r.photos ? JSON.parse(r.photos) : [],
    }))

    // Compute rating distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const r of serialized) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5]++
    }
    const total = serialized.length
    const avg = total > 0
      ? serialized.reduce((sum, r) => sum + r.rating, 0) / total
      : 0

    return NextResponse.json({
      reviews: serialized,
      stats: {
        total,
        average: Math.round(avg * 10) / 10,
        distribution,
      },
    })
  } catch (error) {
    console.error("Failed to fetch reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    )
  }
}

export async function POST() {
  // The legacy endpoint cannot prove delivery or order ownership. Keep it
  // closed so unverified reviews can never enter the public review funnel.
  return NextResponse.json(
    { success: false, error: 'VERIFIED_ORDER_REQUIRED', submitAt: '/api/reviews/submit' },
    { status: 410 },
  )
}
