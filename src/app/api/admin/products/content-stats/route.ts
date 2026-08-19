export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/products/content-stats
 *
 * Phase 4 of the content-infrastructure project: live completeness numbers
 * for the 23 product content fields, the products-needing-work list, the
 * priority suggestions, and a CSV export of the missing-content report.
 *
 * Query params:
 *   format=csv  -> returns the missing-content report as text/csv
 *
 * Admin-only (products.read). Live data, no caching.
 * All counting rules live in src/lib/product-content.ts so the dashboard,
 * the CSV and the tests share one definition of "complete".
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'
import {
  computeContentStatus,
  computeFieldTable,
  csvCell,
  firstLegacyImage,
} from '@/lib/product-content'

const STATUS_SELECT = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  images: true,
  brandId: true,
  categoryId: true,
  skinType: true,
  hairType: true,
  nameRw: true,
  shortDescription: true,
  shortDescriptionRw: true,
  description: true,
  descriptionRw: true,
  ingredients: true,
  ingredientsRw: true,
  howToUse: true,
  howToUseRw: true,
  expectedResults: true,
  expectedResultsRw: true,
  warnings: true,
  warningsRw: true,
  suitableFor: true,
  uniqueSellingPoints: true,
  seoKeywords: true,
  seoKeywordsRw: true,
  whatsappShareText: true,
  weightGrams: true,
  category: { select: { slug: true, name: true, nameRw: true } },
  brand: { select: { name: true } },
} as const

export async function GET(req: Request) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_READ)
    const url = new URL(req.url)
    const format = url.searchParams.get('format')

    // Demand proxy: units across non-cancelled orders (no order is paid or
    // delivered yet, so this is the strongest real purchase signal).
    const [products, demand] = await Promise.all([
      prisma.product.findMany({
        where: { isDeleted: false },
        select: STATUS_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { status: { not: 'CANCELLED' } } },
        _sum: { quantity: true },
      }),
    ])

    const unitsByProduct = new Map<string, number>(
      demand.map((row) => [row.productId, row._sum.quantity || 0]),
    )

    const rows = products.map((product) => {
      const status = computeContentStatus(product)
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        category: product.category.slug,
        categoryName: product.category.name,
        brand: product.brand?.name || null,
        image: firstLegacyImage(product.images),
        units: unitsByProduct.get(product.id) || 0,
        present: status.present,
        missing: status.missing,
        presentCount: status.presentCount,
        missingCount: status.missingCount,
        isComplete: status.isComplete,
        criticalMissing: status.criticalMissing,
        rwMissing: status.rwMissing,
      }
    })

    const totals = {
      total: rows.length,
      complete: rows.filter((row) => row.isComplete).length,
      partial: rows.filter((row) => !row.isComplete).length,
      missingCritical: rows.filter((row) => row.criticalMissing.length > 0).length,
    }

    const fields = computeFieldTable(products)

    const priorities = {
      bestSellersIncomplete: rows
        .filter((row) => !row.isComplete && row.units > 0)
        .sort((left, right) => right.units - left.units)
        .slice(0, 10),
      missingCritical: rows
        .filter((row) => row.criticalMissing.length > 0)
        .slice(0, 10),
      missingKinyarwanda: rows
        .filter((row) => row.rwMissing.length > 0)
        .sort((left, right) => right.rwMissing.length - left.rwMissing.length || right.units - left.units)
        .slice(0, 10),
    }

    if (format === 'csv') {
      const header = ['name', 'slug', 'sku', 'category', 'brand', 'missing_count', 'present_count', 'missing_fields', 'present_fields']
      const lines = rows.map((row) => [
        row.name,
        row.slug,
        row.sku,
        row.categoryName,
        row.brand,
        row.missingCount,
        row.presentCount,
        row.missing.join('; '),
        row.present.join('; '),
      ].map(csvCell).join(','))
      const csv = [header.join(','), ...lines].join('\n')
      const date = new Date().toISOString().slice(0, 10)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="product-content-status-${date}.csv"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const response = NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        totals,
        fields,
        products: rows,
        priorities,
      },
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: (error as { statusCode: number }).statusCode },
      )
    }
    console.error('Content stats error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load content status' }, { status: 500 })
  }
}
