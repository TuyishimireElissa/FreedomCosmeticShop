/**
 * GET /api/products/[id]
 * Returns a single product by id or slug.
 *
 * Also returns related products (same category, excluding current).
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Match by id OR slug
    const product = await db.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
      },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Fetch up to 4 related products from the same category
    const related = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
      },
      take: 4,
      orderBy: { rating: "desc" },
    })

    const serialized = {
      ...product,
      images: JSON.parse(product.images) as string[],
    }
    const serializedRelated = related.map((p) => ({
      ...p,
      images: JSON.parse(p.images) as string[],
    }))

    return NextResponse.json({
      product: serialized,
      related: serializedRelated,
    })
  } catch (error) {
    console.error("Failed to fetch product:", error)
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    )
  }
}
