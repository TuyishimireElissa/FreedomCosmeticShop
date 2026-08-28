export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PUBLIC_PRODUCT_CARD_SELECT, getRealUnitSales, serializePublicProductCard } from '@/lib/public-product'
import { buildFilterClauses, parseProductFilters, resolveSearchClause } from '@/lib/product-filters'
import { resolveSearchFallback, type FallbackReason } from '@/lib/search-fallback'
import { recordSearch } from '@/server/services/search-analytics'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const requestedPage = Number(params.get('page') || 1)
    const pageSize = Number(params.get('pageSize') || params.get('limit') || 12)
    if (!Number.isInteger(requestedPage) || requestedPage < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48) {
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

    /**
     * Clamp the page to the last one that actually has rows.
     *
     * THE BUG THIS FIXES. `page` was honoured verbatim, so any request past
     * the end returned zero rows while still reporting the true total.
     * Measured live on 2026-08-13:
     *
     *     ?pageSize=12&page=5&category=haircare
     *        -> rows 0, total 5, totalPages 1
     *
     * The grid then hit its `products.length === 0` branch and rendered
     * "No products match your filters" directly beneath a header reading
     * "5 products found" — a blank shelf and a contradiction.
     *
     * HOW A REAL SHOPPER GOT THERE. Filter state lives in the URL by design,
     * so a shared or bookmarked link, or the back button, can carry a deep
     * `page` into a smaller result set. The low-data toggle does it too:
     * pageSize 8 page 12 returns 8 rows, but switching to pageSize 12 makes
     * page 12 past the end of 106 products. ProductsPageClient has a reset
     * effect for that switch, but it only fires when isLowData changes during
     * a session — it cannot help a page loaded directly at ?page=12.
     *
     * Clamping here fixes every entry point at once, server-side, without
     * changing the component, the filter hook or the URL contract. An
     * over-range page now shows the last real page instead of nothing.
     *
     * `total === 0` is left on page 1 deliberately: a genuinely empty result
     * SHOULD render the empty state, and Math.ceil(0 / 12) would clamp to 0
     * and break the skip arithmetic below.
     */
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(requestedPage, totalPages)

    /**
     * ZERO-RESULT FALLBACK — never a dead end.
     *
     * When a search term found nothing, walk the ladder in search-fallback
     * (trigram → phonetic → category → popular) and return the closest
     * products anyway, marked with `fallback.reason` so the UI can explain
     * that these are similar items, not exact matches. Non-search filters
     * (category/brand/price/inStock) still apply: `and` excludes the search
     * clause but keeps everything else.
     */
    let fallbackReason: FallbackReason | null = null
    // Same row shape every branch produces: the public card select.
    type PublicCardRow = Awaited<ReturnType<typeof prisma.product.findMany<{ select: typeof PUBLIC_PRODUCT_CARD_SELECT }>>>[number]
    let rows: PublicCardRow[] | null = null
    if (search && total === 0) {
      const fallback = await resolveSearchFallback(searchableText || search)
      if (fallback && fallback.ids.length > 0) {
        const fallbackRows = await prisma.product.findMany({
          where: { AND: [...and, { id: { in: fallback.ids } }] },
          select: PUBLIC_PRODUCT_CARD_SELECT,
        })
        const order = new Map(fallback.ids.map((id, index) => [id, index]))
        const ordered = fallbackRows.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
        if (ordered.length > 0) {
          rows = ordered
          fallbackReason = fallback.reason
        }
      }
    }

    if (!rows) {
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
    }
    const resolvedRows = rows ?? []

    const sales = await getRealUnitSales(resolvedRows.map((product) => product.id))
    const products = resolvedRows.map((product) => serializePublicProductCard(product, sales.get(product.id) || 0))
    // With a fallback, the "total" the client sees is the shelf it actually
    // receives (one page of closest matches), not the zero the search got.
    const effectiveTotal = fallbackReason ? products.length : total
    const pagination = { page, pageSize, total: effectiveTotal, totalPages: effectiveTotal === 0 ? 0 : totalPages, hasMore: page * pageSize < effectiveTotal }
    const filters = { category, brand, minPrice: effectiveMinPrice, maxPrice: effectiveMaxPrice, skinType, hairType, inStock: params.get('inStock') === 'true', sort, shade, minRating: minRatingParam }

    if (search && page === 1) {
      await recordSearch({ request, query: search, resultCount: effectiveTotal, sessionId: params.get('sessionId'), filters: filters as Prisma.InputJsonValue })
        .catch((error) => console.error('Search analytics write failed:', error))
    }

    const response = NextResponse.json({ success: true, data: { products, pagination, total: effectiveTotal, pages: pagination.totalPages, query: search, filters, hasResults: effectiveTotal > 0, fallback: fallbackReason ? { applied: true, reason: fallbackReason } : null }, products, pagination })
    // Product images, prices, and stock must reflect admin changes immediately.
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}
