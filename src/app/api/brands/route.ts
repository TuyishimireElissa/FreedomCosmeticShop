/**
 * GET /api/brands
 *
 * Returns active brands for the brand carousel.
 * Sorted alphabetically by name.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const brands = await db.brand.findMany({
      where: { isActive: true, isDeleted: false },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: { where: { isActive: true, isDeleted: false } } } },
      },
    })

    // Only return brands that have at least 1 active product
    const brandsWithProducts = brands.filter((b) => b._count.products > 0)

    return NextResponse.json({ brands: brandsWithProducts })
  } catch (error) {
    console.error("Failed to fetch brands:", error)
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    )
  }
}
