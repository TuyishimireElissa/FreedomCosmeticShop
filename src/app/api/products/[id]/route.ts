/**
 * GET /api/products/[id]
 * Returns a single product by id or slug, including its category, brand,
 * and up to 4 related products from the same category.
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
        isDeleted: false,
      },
      include: { category: true, brand: true },
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
        isDeleted: false,
      },
      take: 4,
      orderBy: { rating: "desc" },
      include: { brand: true },
    })

    // Deserialize JSON fields
    const serializeProduct = (p: typeof product) => ({
      ...p,
      images: JSON.parse(p.images) as string[],
      skinType: p.skinType ? (JSON.parse(p.skinType) as string[]) : null,
      shades: p.shades ? (JSON.parse(p.shades) as string[]) : null,
      ingredients: p.ingredients ? (JSON.parse(p.ingredients) as string[]) : null,
    })

    const serializedRelated = related.map((p) => ({
      ...p,
      images: JSON.parse(p.images) as string[],
      skinType: p.skinType ? (JSON.parse(p.skinType) as string[]) : null,
      shades: p.shades ? (JSON.parse(p.shades) as string[]) : null,
      ingredients: p.ingredients ? (JSON.parse(p.ingredients) as string[]) : null,
    }))

    return NextResponse.json({
      product: serializeProduct(product),
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
