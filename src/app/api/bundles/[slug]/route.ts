export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateBundleFacts } from '@/lib/bundle-pricing'

function legacyImages(value: string) { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] } }

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const bundle = await prisma.bundle.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true, name: true, slug: true, description: true, price: true, stock: true, volume: true, images: true,
                brand: { select: { name: true } },
                productImages: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 2, select: { url: true, publicId: true, altText: true, altTextRw: true, isPrimary: true, imageType: true } },
              },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    })
    if (!bundle) return NextResponse.json({ success: false, error: 'Bundle not found' }, { status: 404 })
    const facts = calculateBundleFacts(bundle.bundlePrice, bundle.products)
    const products = bundle.products.map((item) => ({ ...item, isInStock: item.product.stock >= item.quantity, product: { ...item.product, images: legacyImages(item.product.images) } }))
    const outOfStockProducts = products.filter((item) => !item.isInStock).map((item) => ({ name: item.product.name, stockAvailable: item.product.stock, quantityNeeded: item.quantity }))
    const response = NextResponse.json({ success: true, data: { ...bundle, ...facts, products, outOfStockProducts } })
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return response
  } catch (error) {
    console.error('Bundle detail API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load bundle' }, { status: 500 })
  }
}
