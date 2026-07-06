/**
 * GET /api/products
 *
 * Query params:
 *   - category: category slug (optional)
 *   - search: free-text search on name/brand name/description (optional)
 *   - featured: "true" to return only featured products (optional)
 *   - sort: "newest" | "price-asc" | "price-desc" | "rating"  (default: "newest")
 *   - minPrice: integer RWF (optional)
 *   - maxPrice: integer RWF (optional)
 *   - brand: brand slug (optional)
 *   - skinType: filter by skin type (optional)
 *   - limit: number (optional, default 50)
 *
 * Returns a list of products with their category and brand.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")?.trim() || ""
    const featured = searchParams.get("featured") === "true"
    const sort = searchParams.get("sort") || "newest"
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const brandSlug = searchParams.get("brand")
    const skinType = searchParams.get("skinType")
    const limit = Math.min(Number(searchParams.get("limit") || "50"), 200)

    // Build the where clause
    const where: Prisma.ProductWhereInput = { isActive: true, isDeleted: false }

    if (category && category !== "all") {
      where.category = { slug: category }
    }
    if (featured) {
      where.featured = true
    }
    if (brandSlug) {
      where.brand = { slug: brandSlug }
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { name: { contains: search } } },
        { description: { contains: search } },
        { shortDescription: { contains: search } },
      ]
    }
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = Number(minPrice)
      if (maxPrice) where.price.lte = Number(maxPrice)
    }
    // skinType stored as JSON string in SQLite — filter with contains
    if (skinType) {
      where.skinType = { contains: skinType }
    }

    // Build the orderBy
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price-asc"
        ? { price: "asc" }
        : sort === "price-desc"
        ? { price: "desc" }
        : sort === "rating"
        ? { rating: "desc" }
        : { createdAt: "desc" }

    const products = await db.product.findMany({
      where,
      orderBy,
      take: limit,
      include: { category: true, brand: true },
    })

    // Deserialize JSON fields (SQLite stores arrays as strings)
    const serialized = products.map((p) => ({
      ...p,
      images: JSON.parse(p.images) as string[],
      skinType: p.skinType ? (JSON.parse(p.skinType) as string[]) : null,
      shades: p.shades ? (JSON.parse(p.shades) as string[]) : null,
      ingredients: p.ingredients ? (JSON.parse(p.ingredients) as string[]) : null,
    }))

    return NextResponse.json({ products: serialized, count: serialized.length })
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}
