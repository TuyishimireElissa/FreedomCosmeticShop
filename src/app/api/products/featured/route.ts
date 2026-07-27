export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PUBLIC_PRODUCT_CARD_SELECT, getRealUnitSales, serializePublicProductCard } from '@/lib/public-product'

export async function GET(request: Request) {
  try {
    const limit = Math.min(24, Math.max(1, Number(new URL(request.url).searchParams.get('limit') || 8)))
    if (!Number.isInteger(limit)) {
      return NextResponse.json({ success: false, error: 'Invalid limit' }, { status: 400 })
    }
    const rows = await prisma.product.findMany({
      where: { featured: true, isActive: true, isDeleted: false },
      select: PUBLIC_PRODUCT_CARD_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
    const sales = await getRealUnitSales(rows.map((product) => product.id))
    const products = rows.map((product) => serializePublicProductCard(product, sales.get(product.id) || 0))
    const response = NextResponse.json({ success: true, data: { products }, products })
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Featured products API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch featured products' }, { status: 500 })
  }
}
