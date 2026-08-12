export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { expandSearchQuery, parsePriceFromQuery, removePriceExpression } from '@/lib/search-vocabulary'
import { findMatchingProductIds } from '@/lib/search-match'
import { getCloudinaryUrl } from '@/lib/cloudinary-images'

function legacyPrimaryImage(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const query = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 120)
    if (query.length < 2) return NextResponse.json({ success: true, data: { suggestions: [] }, suggestions: [], products: [], categories: [], brands: [] })

    const price = parsePriceFromQuery(query)
    // Autocomplete fires on every debounced keystroke, so it gets the
    // tightest budget in the app. The old 12-terms x 9-fields ILIKE list
    // measured 2.2s live; the trigram statement below replaces it.
    const terms = expandSearchQuery(removePriceExpression(query, price))
    if (terms.length === 0) return NextResponse.json({ success: true, data: { suggestions: [] }, suggestions: [], products: [], categories: [], brands: [] })
    const productMatches = terms.flatMap((term) => [
      { name: { contains: term, mode: 'insensitive' as const } },
      { shortDescription: { contains: term, mode: 'insensitive' as const } },
      { ingredients: { contains: term, mode: 'insensitive' as const } },
      { ingredientsRw: { contains: term, mode: 'insensitive' as const } },
      { expectedResults: { contains: term, mode: 'insensitive' as const } },
      { expectedResultsRw: { contains: term, mode: 'insensitive' as const } },
      { shade: { contains: term, mode: 'insensitive' as const } },
      { brand: { name: { contains: term, mode: 'insensitive' as const } } },
      { category: { name: { contains: term, mode: 'insensitive' as const } } },
    ])

    // Resolve product matches with the trigram statement when possible; fall
    // back to the ILIKE OR list if pg_trgm is unavailable. Same reasoning as
    // /api/products — see src/lib/search-match.ts.
    let matchedIds: string[] | null = null
    try {
      const match = await findMatchingProductIds(terms, query)
      matchedIds = match ? match.ids : null
    } catch (error) {
      console.error('Trigram suggestions failed, falling back to ILIKE:', error)
      matchedIds = null
    }

    const productWhere = matchedIds
      ? { isActive: true, isDeleted: false, stock: { gt: 0 }, id: { in: matchedIds.length > 0 ? matchedIds : ['__no_match__'] } }
      : { isActive: true, isDeleted: false, stock: { gt: 0 }, OR: productMatches }

    const [products, categories, brands] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        take: 6,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: true,
          productImages: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
            select: { url: true, publicId: true, altText: true, altTextRw: true },
          },
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.category.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          products: { some: { isActive: true, isDeleted: false, stock: { gt: 0 } } },
          OR: terms.flatMap((term) => [{ name: { contains: term, mode: 'insensitive' as const } }, { slug: { contains: term, mode: 'insensitive' as const } }]),
        },
        take: 3,
        select: { id: true, name: true, slug: true },
      }),
      prisma.brand.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          products: { some: { isActive: true, isDeleted: false, stock: { gt: 0 } } },
          OR: terms.flatMap((term) => [{ name: { contains: term, mode: 'insensitive' as const } }, { slug: { contains: term, mode: 'insensitive' as const } }]),
        },
        take: 3,
        select: { id: true, name: true, slug: true },
      }),
    ])

    const suggestions = products.map((product) => {
      const structured = product.productImages[0]
      const imageUrl = structured?.publicId ? getCloudinaryUrl(structured.publicId, 'THUMBNAIL') : structured?.url || legacyPrimaryImage(product.images)
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: imageUrl,
        imageUrl,
        imageAlt: structured?.altText || product.name,
        imageAltRw: structured?.altTextRw || null,
        brand: product.brand?.name || null,
        brandName: product.brand?.name || null,
        categoryName: product.category?.name || null,
      }
    })
    const response = NextResponse.json({ success: true, data: { suggestions }, suggestions, products: suggestions, categories, brands })
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json({ success: false, data: { suggestions: [] }, suggestions: [], products: [], categories: [], brands: [] }, { status: 500 })
  }
}
