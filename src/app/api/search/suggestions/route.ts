/**
 * GET /api/search/suggestions?q=query
 *
 * Returns up to 8 product name suggestions for autocomplete.
 * Also returns up to 3 category matches + 3 brand matches.
 *
 * Response:
 *   {
 *     products: [{ id, name, slug, price, image, brand }],
 *     categories: [{ id, name, slug }],
 *     brands: [{ id, name, slug }]
 *   }
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim() || ""

    if (q.length < 2) {
      return NextResponse.json({ products: [], categories: [], brands: [] })
    }

    const [products, categories, brands] = await Promise.all([
      db.product.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          OR: [
            { name: { contains: q } },
            { brand: { name: { contains: q } } },
            { shortDescription: { contains: q } },
          ],
        },
        take: 8,
        orderBy: { rating: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: true,
          brand: { select: { name: true } },
        },
      }),
      db.category.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          OR: [{ name: { contains: q } }, { slug: { contains: q } }],
        },
        take: 3,
        select: { id: true, name: true, slug: true },
      }),
      db.brand.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          OR: [{ name: { contains: q } }, { slug: { contains: q } }],
        },
        take: 3,
        select: { id: true, name: true, slug: true },
      }),
    ])

    const serializedProducts = products.map((p) => ({
      ...p,
      image: JSON.parse(p.images)[0] || null,
      images: undefined,
      brand: p.brand?.name || null,
    }))

    return NextResponse.json({
      products: serializedProducts,
      categories,
      brands,
    })
  } catch (error) {
    console.error("Search suggestions error:", error)
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    )
  }
}
