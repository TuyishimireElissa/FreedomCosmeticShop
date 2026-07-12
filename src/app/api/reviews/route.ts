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
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

const CreateReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
  skinType: z.string().optional(),
  shadeUsed: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "50")))

    const reviews = await db.review.findMany({
      where: {
        ...(productId ? { productId } : {}),
        isApproved: true,
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

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json(
        { error: "Please log in to leave a review" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const parsed = CreateReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid review data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Verify product exists
    const product = await db.product.findFirst({
      where: { id: parsed.data.productId, isActive: true, isDeleted: false },
    })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check if user already reviewed this product
    const existing = await db.review.findFirst({
      where: { productId: parsed.data.productId, userId: user.id },
    })
    if (existing) {
      return NextResponse.json(
        { error: "You've already reviewed this product" },
        { status: 400 }
      )
    }

    // Create review (auto-approve in dev)
    const review = await db.review.create({
      data: {
        productId: parsed.data.productId,
        userId: user.id,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        body: parsed.data.body || null,
        skinType: parsed.data.skinType || null,
        shadeUsed: parsed.data.shadeUsed || null,
        photos: JSON.stringify([]),
        isApproved: process.env.NODE_ENV !== "production",
      },
    })

    // Update product's denormalized rating + reviewsCount
    const allReviews = await db.review.findMany({
      where: {
        productId: parsed.data.productId,
        isApproved: true,
        isDeleted: false,
      },
      select: { rating: true },
    })
    const newCount = allReviews.length
    const newAvg =
      newCount > 0
        ? allReviews.reduce((s, r) => s + r.rating, 0) / newCount
        : 0
    await db.product.update({
      where: { id: parsed.data.productId },
      data: {
        rating: Math.round(newAvg * 10) / 10,
        reviewsCount: newCount,
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error("Failed to create review:", error)
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    )
  }
}
