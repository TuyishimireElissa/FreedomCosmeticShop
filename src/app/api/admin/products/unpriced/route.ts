export const dynamic = 'force-dynamic'

/**
 * The unpriced product list, for the WhatsApp pricing dashboard and for the
 * father's signed mobile page.
 *
 * Read-only. Returns only what those two screens need — name, slug, SKU and one
 * photo. No cost price, no supplier, no margin: the signed-link caller is not
 * an admin and must not receive commercially sensitive fields just because they
 * happen to live on the same row.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'
import { quickPriceTokenFromRequest, verifyQuickPriceToken } from '@/lib/quick-price-token'

function firstJsonImage(value: string | null): string | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const claims = await verifyQuickPriceToken(quickPriceTokenFromRequest(request))
    if (!claims) await requirePermission(PERMISSIONS.PRODUCTS_READ)

    const products = await prisma.product.findMany({
      where: { isActive: true, isDeleted: false, price: { lte: 0 } },
      select: {
        slug: true,
        name: true,
        nameRw: true,
        sku: true,
        images: true,
        category: { select: { slug: true } },
        productImages: {
          select: { url: true },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
        },
      },
      orderBy: [{ category: { slug: 'asc' } }, { name: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: {
        total: products.length,
        products: products.map((product) => ({
          slug: product.slug,
          name: product.name,
          nameRw: product.nameRw,
          sku: product.sku,
          category: product.category?.slug ?? null,
          // ProductImage is the storefront's source of truth and covers 94 of
          // 97; the JSON column is the fallback for the rest.
          imageUrl: product.productImages[0]?.url ?? firstJsonImage(product.images),
        })),
      },
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: (error as { statusCode: number }).statusCode },
      )
    }
    console.error('Unpriced products error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load unpriced products' }, { status: 500 })
  }
}
