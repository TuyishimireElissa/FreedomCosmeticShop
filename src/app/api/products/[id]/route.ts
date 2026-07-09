/**
 * GET /api/products/[id]
 * Returns a single product by id or slug, including its category, brand,
 * and up to 4 related products from the same category.
 *
 * Section 2: Also returns wholesale pricing tiers if the requesting user
 * is an approved wholesale customer.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { getWholesaleTiers } from "@/server/services/wholesale"

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

    // ─── Section 2: Add wholesale pricing if user is approved wholesale ───
    let wholesalePricing: {
      isWholesale: boolean
      tiers: Array<{ pricePerUnit: number; minQty: number; maxQty: number | null; discountPercent: number; label: string }>
      extraDiscount: number
      minWholesaleQty: number
    } | null = null
    try {
      const user = await requireAuth()
      if (
        user &&
        (user.userType === "WHOLESALE" || user.userType === "BOTH") &&
        user.wholesaleStatus === "APPROVED" &&
        product.wholesaleActive
      ) {
        const tiers = await getWholesaleTiers(product.id)
        const extraDiscount = user.wholesaleDiscount || 0
        wholesalePricing = {
          isWholesale: true,
          tiers: tiers.map((t) => ({
            ...t,
            pricePerUnit: extraDiscount > 0
              ? Math.round(t.pricePerUnit * (1 - extraDiscount / 100))
              : t.pricePerUnit,
          })),
          extraDiscount,
          minWholesaleQty: product.minWholesaleQty,
        }
      }
    } catch {
      // Not authenticated — retail pricing only (no wholesale)
    }

    return NextResponse.json({
      product: {
        ...serializeProduct(product),
        wholesalePricing,
      },
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
