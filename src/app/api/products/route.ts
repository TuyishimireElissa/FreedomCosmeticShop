/**
 * GET /api/products
 *
 * Query params:
 *   - category: category slug
 *   - brand: brand slug
 *   - search: free-text search
 *   - featured: "true"
 *   - sort: "newest" | "price-asc" | "price-desc" | "rating" | "best-selling"
 *   - minPrice / maxPrice: integer RWF
 *   - skinType: ALL | OILY | DRY | COMBINATION | SENSITIVE | NORMAL
 *   - minRating: 1-5
 *   - inStock: "true" to only show products with stock > 0
 *   - page: page number (1-indexed, default 1)
 *   - pageSize: items per page (default 24, max 100)
 *
 * Returns:
 *   { products, pagination: { page, pageSize, total, totalPages, hasMore } }
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const brand = searchParams.get("brand")
    const search = searchParams.get("search")?.trim() || ""
    const featured = searchParams.get("featured") === "true"
    const sort = searchParams.get("sort") || "newest"
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const skinType = searchParams.get("skinType")
    const minRating = searchParams.get("minRating")
    const inStock = searchParams.get("inStock") === "true"
    const page = Math.max(1, Number(searchParams.get("page") || "1"))
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") || "24"))
    )

    // Build the where clause
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isDeleted: false,
    }

    if (category && category !== "all") {
      where.category = { slug: category }
    }
    if (brand) {
      where.brand = { slug: brand }
    }
    if (featured) {
      where.featured = true
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
    if (skinType) {
      where.skinType = { contains: skinType }
    }
    if (minRating) {
      where.rating = { gte: Number(minRating) }
    }
    if (inStock) {
      where.stock = { gt: 0 }
    }

    // Build the orderBy
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price-asc"
        ? { price: "asc" }
        : sort === "price-desc"
        ? { price: "desc" }
        : sort === "rating"
        ? { rating: "desc" }
        : sort === "best-selling"
        ? { reviewsCount: "desc" }
        : { createdAt: "desc" }

    // Get total count for pagination
    const total = await db.product.count({ where })
    const totalPages = Math.ceil(total / pageSize)

    const products = await db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true, brand: true },
    })

    // Deserialize JSON fields
    const serialized = products.map((p) => ({
      ...p,
      images: JSON.parse(p.images) as string[],
      skinType: p.skinType ? (JSON.parse(p.skinType) as string[]) : null,
      shades: p.shades ? (JSON.parse(p.shades) as string[]) : null,
      ingredients: p.ingredients ? (JSON.parse(p.ingredients) as string[]) : null,
    }))

    return NextResponse.json({
      products: serialized,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}
