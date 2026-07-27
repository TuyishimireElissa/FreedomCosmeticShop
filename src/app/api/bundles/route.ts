export const dynamic = 'force-dynamic'

import { BundleType, Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateBundleFacts } from '@/lib/bundle-pricing'

const BUNDLE_TYPES = new Set(Object.values(BundleType))

const BUNDLE_PRODUCT_SELECT = {
  id: true, name: true, slug: true, price: true, stock: true, volume: true, images: true,
  productImages: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1, select: { url: true, publicId: true, altText: true, altTextRw: true, isPrimary: true } },
} satisfies Prisma.ProductSelect

function legacyImages(value: string) { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] } }

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type')?.toUpperCase()
    const featured = request.nextUrl.searchParams.get('featured') === 'true'
    const concern = request.nextUrl.searchParams.get('concern')?.trim()
    if (type && !BUNDLE_TYPES.has(type as BundleType)) return NextResponse.json({ success: false, error: 'Invalid bundle type' }, { status: 400 })
    const bundles = await prisma.bundle.findMany({
      where: { isActive: true, deletedAt: null, ...(type ? { bundleType: type as BundleType } : {}), ...(featured ? { isFeatured: true } : {}), ...(concern ? { targetConcern: concern } : {}) },
      include: { products: { include: { product: { select: BUNDLE_PRODUCT_SELECT } }, orderBy: { stepOrder: 'asc' } } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    })
    const data = bundles.map((bundle) => {
      const facts = calculateBundleFacts(bundle.bundlePrice, bundle.products)
      return { ...bundle, ...facts, products: bundle.products.map((item) => ({ ...item, isInStock: item.product.stock >= item.quantity, product: { ...item.product, images: legacyImages(item.product.images) } })) }
    })
    const response = NextResponse.json({ success: true, data })
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Bundles API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load bundles' }, { status: 500 })
  }
}
