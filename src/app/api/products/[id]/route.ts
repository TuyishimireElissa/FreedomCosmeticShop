/**
 * GET /api/products/[id] - with fallback
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { fallbackProducts } from "@/lib/fallbackData"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    try {
      const product = await db.product.findFirst({
        where: {
          OR: [{ id }, { slug: id }],
          isActive: true,
          isDeleted: false,
        },
        include: { category: true, brand: true },
      })

      if (product) {
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

        const serializeProduct = (p: typeof product) => ({
          ...p,
          images: JSON.parse(p.images) as string[],
          skinType: p.skinType ? (JSON.parse(p.skinType) as string[]) : null,
          shades: p.shades ? (JSON.parse(p.shades) as string[]) : null,
          ingredients: p.ingredients ? (JSON.parse(p.ingredients) as string[]) : null,
        })

        const serializedRelated = related.map((p: any) => ({
          ...p,
          images: JSON.parse(p.images) as string[],
          skinType: p.skinType ? (JSON.parse(p.skinType) as string[]) : null,
          shades: p.shades ? (JSON.parse(p.shades) as string[]) : null,
          ingredients: p.ingredients ? (JSON.parse(p.ingredients) as string[]) : null,
        }))

        return NextResponse.json({
          product: serializeProduct(product),
          related: serializedRelated,
          _source: "database",
        })
      }
    } catch (dbErr) {
      console.warn("DB product fetch failed, trying fallback:", dbErr)
    }

    // Fallback search
    const fallbackProduct = fallbackProducts.find(p => p.id === id || p.slug === id)
    if (!fallbackProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    const relatedFallback = fallbackProducts.filter(p => p.categoryId === fallbackProduct.categoryId && p.id !== fallbackProduct.id).slice(0, 4)

    return NextResponse.json({
      product: fallbackProduct,
      related: relatedFallback,
      _source: "fallback",
    })
  } catch (error) {
    console.error("Failed to fetch product:", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
