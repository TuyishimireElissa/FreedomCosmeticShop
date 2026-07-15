export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { HairType, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PUBLIC_PRODUCT_SELECT, getRealUnitSales, serializePublicProduct } from '@/lib/public-product'
import { expandSearchQuery, parsePriceFromQuery, removePriceExpression } from '@/lib/search-vocabulary'
import { recordSearch } from '@/server/services/search-analytics'

const SKIN_TYPES = new Set(['ALL', 'OILY', 'DRY', 'COMBINATION', 'SENSITIVE', 'NORMAL'])
const HAIR_TYPES = new Set(['NATURAL', 'RELAXED', 'WAVY', 'CURLY', 'COILY', 'ALL_HAIR'])

function numericParam(value: string | null) {
  if (value === null || value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const page = Number(params.get('page') || 1)
    const pageSize = Number(params.get('pageSize') || params.get('limit') || 24)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48) {
      return NextResponse.json({ success: false, error: 'Invalid pagination' }, { status: 400 })
    }

    const search = (params.get('search') || params.get('q') || '').trim().slice(0, 200)
    const category = params.get('category')?.trim() || undefined
    const brand = params.get('brand')?.trim() || undefined
    const skinType = params.get('skinType')?.trim().toUpperCase() || undefined
    const hairType = params.get('hairType')?.trim().toUpperCase() || undefined
    const shade = params.get('shade')?.trim() || undefined
    const minPriceParam = numericParam(params.get('minPrice'))
    const maxPriceParam = numericParam(params.get('maxPrice'))
    const minRatingParam = numericParam(params.get('minRating'))
    if (minPriceParam === null || maxPriceParam === null || minRatingParam === null) {
      return NextResponse.json({ success: false, error: 'Invalid numeric filter' }, { status: 400 })
    }
    if (skinType && !SKIN_TYPES.has(skinType)) return NextResponse.json({ success: false, error: 'Invalid skin type' }, { status: 400 })
    if (hairType && !HAIR_TYPES.has(hairType)) return NextResponse.json({ success: false, error: 'Invalid hair type' }, { status: 400 })

    const sort = params.get('sort') || (search ? 'relevance' : 'newest')
    const priceSearch = parsePriceFromQuery(search)
    const searchableText = removePriceExpression(search, priceSearch)
    const expandedTerms = expandSearchQuery(searchableText)
    const effectiveMinPrice = minPriceParam ?? priceSearch?.minPrice
    const effectiveMaxPrice = maxPriceParam ?? priceSearch?.maxPrice
    if (effectiveMinPrice !== undefined && effectiveMaxPrice !== undefined && effectiveMinPrice > effectiveMaxPrice) {
      return NextResponse.json({ success: false, error: 'Minimum price cannot exceed maximum price' }, { status: 400 })
    }

    const and: Prisma.ProductWhereInput[] = [{ isActive: true, isDeleted: false }]
    if (category && category !== 'all') and.push({ category: { OR: [{ slug: category }, { name: { contains: category, mode: 'insensitive' } }] } })
    if (brand && brand !== 'all') and.push({ brand: { OR: [{ slug: brand }, { name: { contains: brand, mode: 'insensitive' } }] } })
    if (params.get('featured') === 'true') and.push({ featured: true })
    if (params.get('inStock') === 'true') and.push({ stock: { gt: 0 } })
    if (skinType) and.push({ OR: [{ skinType: { contains: skinType } }, { skinType: { contains: 'ALL' } }] })
    if (hairType) and.push({ OR: [{ hairType: hairType as HairType }, { hairType: 'ALL_HAIR' }] })
    if (shade) and.push({ OR: [{ shade: { contains: shade, mode: 'insensitive' } }, { shades: { contains: shade, mode: 'insensitive' } }] })
    if (minRatingParam !== undefined) and.push({ rating: { gte: Math.min(5, minRatingParam) } })
    if (effectiveMinPrice !== undefined || effectiveMaxPrice !== undefined) {
      and.push({ price: { ...(effectiveMinPrice !== undefined ? { gte: effectiveMinPrice } : {}), ...(effectiveMaxPrice !== undefined ? { lte: effectiveMaxPrice } : {}) } })
    }

    if (expandedTerms.length > 0) {
      and.push({
        OR: expandedTerms.flatMap((term) => [
          { name: { contains: term, mode: 'insensitive' as const } },
          { shortDescription: { contains: term, mode: 'insensitive' as const } },
          { description: { contains: term, mode: 'insensitive' as const } },
          { sku: { contains: term, mode: 'insensitive' as const } },
          { ingredients: { contains: term, mode: 'insensitive' as const } },
          { ingredientsRw: { contains: term, mode: 'insensitive' as const } },
          { expectedResults: { contains: term, mode: 'insensitive' as const } },
          { expectedResultsRw: { contains: term, mode: 'insensitive' as const } },
          { howToUse: { contains: term, mode: 'insensitive' as const } },
          { howToUseRw: { contains: term, mode: 'insensitive' as const } },
          { shade: { contains: term, mode: 'insensitive' as const } },
          { shades: { contains: term, mode: 'insensitive' as const } },
          { undertone: { contains: term, mode: 'insensitive' as const } },
          { countryOfOrigin: { contains: term, mode: 'insensitive' as const } },
          { brand: { name: { contains: term, mode: 'insensitive' as const } } },
          { category: { name: { contains: term, mode: 'insensitive' as const } } },
        ]),
      })
    }

    const where: Prisma.ProductWhereInput = { AND: and }
    const total = await prisma.product.count({ where })
    let rows
    if (sort === 'best-selling' || sort === 'best_selling') {
      const matching = await prisma.product.findMany({ where, select: { id: true } })
      const allSales = await getRealUnitSales(matching.map((product) => product.id))
      const pageIds = matching.map((product) => product.id)
        .sort((left, right) => (allSales.get(right) || 0) - (allSales.get(left) || 0))
        .slice((page - 1) * pageSize, page * pageSize)
      const unorderedRows = await prisma.product.findMany({ where: { id: { in: pageIds } }, select: PUBLIC_PRODUCT_SELECT })
      const positions = new Map(pageIds.map((id, index) => [id, index]))
      rows = unorderedRows.sort((left, right) => (positions.get(left.id) ?? 0) - (positions.get(right.id) ?? 0))
    } else {
      const orderBy: Prisma.ProductOrderByWithRelationInput[] = sort === 'price-asc' || sort === 'price_asc'
        ? [{ price: 'asc' }]
        : sort === 'price-desc' || sort === 'price_desc'
          ? [{ price: 'desc' }]
          : sort === 'rating'
            ? [{ rating: 'desc' }, { createdAt: 'desc' }]
            : sort === 'relevance' && search
              ? [{ featured: 'desc' }, { createdAt: 'desc' }]
              : [{ createdAt: 'desc' }]
      rows = await prisma.product.findMany({ where, select: PUBLIC_PRODUCT_SELECT, orderBy, skip: (page - 1) * pageSize, take: pageSize })
    }

    const sales = await getRealUnitSales(rows.map((product) => product.id))
    const products = rows.map((product) => serializePublicProduct(product, sales.get(product.id) || 0))
    const pagination = { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total }
    const filters = { category, brand, minPrice: effectiveMinPrice, maxPrice: effectiveMaxPrice, skinType, hairType, inStock: params.get('inStock') === 'true', sort, shade, minRating: minRatingParam }

    if (search && page === 1) {
      await recordSearch({ request, query: search, resultCount: total, sessionId: params.get('sessionId'), filters: filters as Prisma.InputJsonValue })
        .catch((error) => console.error('Search analytics write failed:', error))
    }

    const response = NextResponse.json({ success: true, data: { products, pagination, total, pages: pagination.totalPages, query: search, filters, hasResults: total > 0 }, products, pagination })
    response.headers.set('Cache-Control', search ? 'private, no-store' : 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}
