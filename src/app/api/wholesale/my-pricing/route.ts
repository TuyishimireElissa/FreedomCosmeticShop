export const dynamic = 'force-dynamic'

/** GET /api/wholesale/my-pricing — get wholesale prices for all products (approved only) */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { getWholesaleTiers } from "@/server/services/wholesale"

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    // Verify approved wholesale
    if (user.wholesaleStatus !== "APPROVED" && user.userType !== "WHOLESALE" && user.userType !== "BOTH") {
      return NextResponse.json({ error: "Wholesale account not approved" }, { status: 403 })
    }

    const products = await db.product.findMany({
      where: { isDeleted: false, isActive: true, wholesaleActive: true },
      select: {
        id: true, name: true, slug: true, price: true, images: true,
        stock: true, minWholesaleQty: true, category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    })

    const extraDiscount = user.wholesaleDiscount || 0

    const priced = await Promise.all(
      products.map(async (p) => {
        const tiers = await getWholesaleTiers(p.id)
        const bestTier = tiers[tiers.length - 1] // Last tier = best price
        const bestPrice = bestTier
          ? Math.round(bestTier.pricePerUnit * (1 - extraDiscount / 100))
          : p.price
        const images = JSON.parse(p.images) as string[]
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          retailPrice: p.price,
          wholesaleFrom: bestPrice,
          savings: p.price - bestPrice,
          savingsPercent: p.price > 0 ? Math.round(((p.price - bestPrice) / p.price) * 100) : 0,
          stock: p.stock,
          minWholesaleQty: p.minWholesaleQty,
          image: images[0] || null,
          category: p.category?.name || null,
          tiers,
        }
      })
    )

    return NextResponse.json({ products: priced, extraDiscount })
  } catch (error) {
    console.error("Wholesale pricing error:", error)
    return NextResponse.json({ error: "Failed to fetch pricing" }, { status: 500 })
  }
}
