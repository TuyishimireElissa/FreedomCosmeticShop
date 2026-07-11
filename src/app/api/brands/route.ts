/**
 * GET /api/brands - with fallback for Vercel deployment
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { fallbackBrands, fallbackProducts } from "@/lib/fallbackData"

export async function GET() {
  try {
    try {
      const brands = await db.brand.findMany({
        where: { isActive: true, isDeleted: false },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { products: { where: { isActive: true, isDeleted: false } } } },
        },
      })
      const brandsWithProducts = brands.filter((b) => b._count.products > 0)
      if (brandsWithProducts.length === 0) {
        const mapped = fallbackBrands.map(b => ({
          ...b,
          _count: { products: fallbackProducts.filter(p => p.brandId === b.id).length }
        }))
        return NextResponse.json({ brands: mapped, _source: "fallback-empty" })
      }
      return NextResponse.json({ brands: brandsWithProducts, _source: "database" })
    } catch (dbError) {
      console.warn("Brands DB failed, fallback:", dbError)
      const mapped = fallbackBrands.map(b => ({
        ...b,
        _count: { products: fallbackProducts.filter(p => p.brandId === b.id).length }
      }))
      return NextResponse.json({ brands: mapped, _source: "fallback-error" })
    }
  } catch (error) {
    console.error("Failed to fetch brands:", error)
    return NextResponse.json({ brands: fallbackBrands, _source: "fallback-exception" })
  }
}
