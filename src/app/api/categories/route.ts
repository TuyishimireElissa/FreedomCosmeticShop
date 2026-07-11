/**
 * GET /api/categories
 * Returns all product categories - with fallback for Vercel deployment
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { fallbackCategories } from "@/lib/fallbackData"

export async function GET() {
  try {
    try {
      const categories = await db.category.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: { select: { products: true } },
        },
      })
      if (categories.length === 0) {
        console.log("DB categories empty, using fallback")
        return NextResponse.json({ categories: fallbackCategories, _source: "fallback-empty" })
      }
      return NextResponse.json({ categories, _source: "database" })
    } catch (dbError) {
      console.warn("DB categories failed, using fallback:", dbError)
      return NextResponse.json({ categories: fallbackCategories, _source: "fallback-db-error" })
    }
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    return NextResponse.json({ categories: fallbackCategories, _source: "fallback-exception" })
  }
}
