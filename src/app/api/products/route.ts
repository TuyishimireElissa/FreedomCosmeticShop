export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PUBLIC_PRODUCT_CARD_SELECT, getRealUnitSales, serializePublicProductCard } from '@/lib/public-product'
import { buildFilterClauses, parseProductFilters, resolveSearchClause } from '@/lib/product-filters'
import { recordSearch } from '@/server/services/search-analytics'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const page = Number(params.get('page') || 1)
    const pageSize = Number(params.get('pageSize') || params.get('limit') || 12)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48) {
      return NextResponse.json({ success: false, error: 'Invalid pagination' }, { status: 400 })
    }

    const parsed = parseProductFilters(params)
    if (!parsed.ok || !parsed.filters) return NextResponse.json({ success: false, error: parsed.error || 'Invalid filter' }, { status: 400 })
    const parsedFilters = parsed.filters
    const { search, searchableText, expandedTerms, category, brand, skinType, hairType, shade, minRating: minRatingParam, sort } = parsedFilters
    const effectiveMinPrice = parsedFilters.minPrice
    const effectiveMaxPrice = parsedFilters.maxPrice

    // Filter clauses and search resolution both come from src/lib/product-filters
    // so that /api/search/facets counts the SAME predicate this list returns.
    // If the two ever diverge the sidebar promises "Skincare (12)" and the grid
    // shows 9.
    const and = buildFilterClauses(parsedFilters)
    const { clause: searchClause, match: searchMatch } = await resolveSearchClause(expandedTerms, searchableText || search)
    if (searchClause) and.push(searchClause)

    const where: Prisma.ProductWhereInput = { AND: and }
    const total = await prisma.product.count({ where })
    let rows
    if (sort === 'best-selling' || sort === 'best_selling') {
      const matching = await prisma.product.findMany({ where, select: { id: true } })
      const allSales = await getRealUnitSales(matching.map((product) => product.id))
      const pageIds = matching.map((product) => product.id)
        .sort((left, right) => (allSales.get(right) || 0) - (allSales.get(left) || 0))
        .slice((page - 1) * pageSize, page * pageSize)
      const unorderedRows = await prisma.product.findMany({ where: { id: { in: pageIds } }, select: PUBLIC_PRODUCT_CARD_SELECT })
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

      if (searchMatch && (sort === 'relevance' || !sort) && search) {
        // Preserve the trigram ranking. `IN (...)` returns rows in whatever
        // order Postgres finds them, so paginate over the ranked id list and
        // re-sort the fetched page back into that order — otherwise the best
        // match could land on page 3.
        const pageIds = searchMatch.ids.slice((page - 1) * pageSize, page * pageSize)
        const unordered = pageIds.length > 0
          ? await prisma.product.findMany({ where: { AND: [...and, { id: { in: pageIds } }] }, select: PUBLIC_PRODUCT_CARD_SELECT })
          : []
        rows = unordered.sort((left, right) => (searchMatch!.rank.get(left.id) ?? 0) - (searchMatch!.rank.get(right.id) ?? 0))
      } else {
        rows = await prisma.product.findMany({ where, select: PUBLIC_PRODUCT_CARD_SELECT, orderBy, skip: (page - 1) * pageSize, take: pageSize })
      }
    }

    const sales = await getRealUnitSales(rows.map((product) => product.id))
    const products = rows.map((product) => serializePublicProductCard(product, sales.get(product.id) || 0))
    const pagination = { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total }
    const filters = { category, brand, minPrice: effectiveMinPrice, maxPrice: effectiveMaxPrice, skinType, hairType, inStock: params.get('inStock') === 'true', sort, shade, minRating: minRatingParam }

    if (search && page === 1) {
      await recordSearch({ request, query: search, resultCount: total, sessionId: params.get('sessionId'), filters: filters as Prisma.InputJsonValue })
        .catch((error) => console.error('Search analytics write failed:', error))
    }

    const response = NextResponse.json({ success: true, data: { products, pagination, total, pages: pagination.totalPages, query: search, filters, hasResults: total > 0 }, products, pagination })
    // Product images, prices, and stock must reflect admin changes immediately.
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}
