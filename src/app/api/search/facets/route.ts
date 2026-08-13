export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildFilterClauses, parseProductFilters, resolveSearchClause } from '@/lib/product-filters'

/**
 * Available filter values for the CURRENT query.
 *
 * The Alibaba pattern: filter options and their counts reflect what is
 * actually reachable from where the shopper already is, so no option ever
 * leads to an empty page.
 *
 * ONE DELIBERATE EXCEPTION — each facet omits its OWN dimension. Picking
 * "Skincare" must not reduce the category list to just Skincare, or the
 * shopper can never switch to Fragrance without clearing filters first. So
 * the category counts are computed with the category filter dropped, brand
 * counts with brand dropped, and so on. Price range is likewise computed
 * without the price filter, otherwise the slider would collapse onto whatever
 * range is already selected.
 *
 * Counts come from groupBy, not from N per-value counts: 6 categories would
 * otherwise be 6 round trips to Frankfurt.
 *
 * WHAT THIS ENDPOINT DOES NOT RETURN, AND WHY
 *
 * `colors` is absent. The brief specifies a colour facet, but the Product
 * model has no colour field, no tags field, and `shadeHex` is NULL on all 106
 * live products. Returning an empty `colors: []` would invite the UI to render
 * seven swatches that each match nothing. Owner decision on 2026-08-13: skip
 * colour entirely until the data exists. Documented in SEARCH_FACETS.md.
 *
 * `brands` IS returned but will be near-empty: only 2 of 106 live products
 * have a brand. The UI is expected to hide a facet with fewer than 2 distinct
 * values rather than show a one-option filter.
 */
export async function GET(request: NextRequest) {
  try {
    const parsed = parseProductFilters(request.nextUrl.searchParams)
    if (!parsed.ok || !parsed.filters) return NextResponse.json({ success: false, error: parsed.error || 'Invalid filter' }, { status: 400 })
    const filters = parsed.filters

    const { clause: searchClause } = await resolveSearchClause(filters.expandedTerms, filters.searchableText || filters.search)
    const withSearch = (base: Prisma.ProductWhereInput[]): Prisma.ProductWhereInput =>
      ({ AND: searchClause ? [...base, searchClause] : base })

    const categoryWhere = withSearch(buildFilterClauses(filters, 'category'))
    const brandWhere = withSearch(buildFilterClauses(filters, 'brand'))
    const skinWhere = withSearch(buildFilterClauses(filters, 'skinType'))
    const priceWhere = withSearch(buildFilterClauses(filters, 'price'))
    const exactWhere = withSearch(buildFilterClauses(filters))

    const [categoryGroups, brandGroups, skinRows, priceAggregate, total] = await Promise.all([
      prisma.product.groupBy({ by: ['categoryId'], where: categoryWhere, _count: { _all: true } }),
      prisma.product.groupBy({ by: ['brandId'], where: brandWhere, _count: { _all: true } }),
      prisma.product.findMany({ where: skinWhere, select: { skinType: true } }),
      prisma.product.aggregate({ where: priceWhere, _min: { price: true }, _max: { price: true } }),
      prisma.product.count({ where: exactWhere }),
    ])

    const categoryIds = categoryGroups.map((group) => group.categoryId)
    const brandIds = brandGroups.map((group) => group.brandId).filter((id): id is string => Boolean(id))
    const [categoryRows, brandRows] = await Promise.all([
      categoryIds.length
        ? prisma.category.findMany({ where: { id: { in: categoryIds }, isActive: true }, select: { id: true, name: true, slug: true } })
        : Promise.resolve([]),
      brandIds.length
        ? prisma.brand.findMany({ where: { id: { in: brandIds } }, select: { id: true, name: true, slug: true } })
        : Promise.resolve([]),
    ])

    const categoryById = new Map(categoryRows.map((row) => [row.id, row]))
    const categories = categoryGroups
      .map((group) => {
        const row = categoryById.get(group.categoryId)
        // An inactive category is hidden from /api/categories, so it must not
        // appear as a filter option either.
        return row ? { id: row.id, name: row.name, slug: row.slug, count: group._count._all } : null
      })
      .filter((entry): entry is { id: string; name: string; slug: string; count: number } => entry !== null)
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))

    const brandById = new Map(brandRows.map((row) => [row.id, row]))
    const brands = brandGroups
      .map((group) => {
        const row = group.brandId ? brandById.get(group.brandId) : undefined
        return row ? { id: row.id, name: row.name, slug: row.slug, count: group._count._all } : null
      })
      .filter((entry): entry is { id: string; name: string; slug: string; count: number } => entry !== null)
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))

    // skinType is a JSON array in a text column ('["OILY","DRY"]'), not an
    // enum column, so it cannot be grouped in SQL. 106 rows of one short
    // string is cheap to fold in memory; a groupBy would return one bucket
    // per distinct JSON string instead of per skin type.
    const skinCounts = new Map<string, number>()
    for (const row of skinRows) {
      if (!row.skinType) continue
      let values: unknown
      try {
        values = JSON.parse(row.skinType)
      } catch {
        continue
      }
      if (!Array.isArray(values)) continue
      for (const value of values) {
        if (typeof value !== 'string') continue
        const key = value.trim().toUpperCase()
        if (!key) continue
        skinCounts.set(key, (skinCounts.get(key) || 0) + 1)
      }
    }
    const skinTypes = [...skinCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))

    const response = NextResponse.json({
      success: true,
      data: {
        categories,
        brands,
        skinTypes,
        priceRange: { min: priceAggregate._min.price ?? 0, max: priceAggregate._max.price ?? 0 },
        total,
        // Stated explicitly so a client cannot mistake "no colour data" for
        // "colour facet failed to load".
        colors: [],
        colorsAvailable: false,
      },
    })
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Search facets API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load filters' }, { status: 500 })
  }
}
