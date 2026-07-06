/**
 * Wishlist API — authenticated user wishlist.
 *
 * GET    /api/wishlist — get user's wishlist
 * POST   /api/wishlist — add product to wishlist (body: { productId })
 * DELETE /api/wishlist — remove product (body: { productId })
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

const ProductIdSchema = z.object({ productId: z.string().min(1) })

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const wishlist = await db.wishlist.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true,
            rating: true,
            reviewsCount: true,
            brand: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const serialized = wishlist.map((w) => ({
      id: w.id,
      productId: w.productId,
      createdAt: w.createdAt,
      product: {
        ...w.product,
        images: JSON.parse(w.product.images),
      },
    }))

    return NextResponse.json({ wishlist: serialized })
  } catch (error) {
    console.error("Wishlist GET error:", error)
    return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = ProductIdSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    // Check if already in wishlist
    const existing = await db.wishlist.findUnique({
      where: { userId_productId: { userId: user.id, productId: parsed.data.productId } },
    })
    if (existing) {
      return NextResponse.json({ success: true, message: "Already in wishlist" })
    }

    await db.wishlist.create({
      data: { userId: user.id, productId: parsed.data.productId },
    })

    return NextResponse.json({ success: true, message: "Added to wishlist" }, { status: 201 })
  } catch (error) {
    console.error("Wishlist POST error:", error)
    return NextResponse.json({ error: "Failed to add to wishlist" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = ProductIdSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    await db.wishlist.deleteMany({
      where: { userId: user.id, productId: parsed.data.productId },
    })

    return NextResponse.json({ success: true, message: "Removed from wishlist" })
  } catch (error) {
    console.error("Wishlist DELETE error:", error)
    return NextResponse.json({ error: "Failed to remove from wishlist" }, { status: 500 })
  }
}
