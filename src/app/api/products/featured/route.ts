export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PUBLIC_PRODUCT_SELECT, getRealUnitSales, serializePublicProduct } from '@/lib/public-product'

export async function GET(request: Request) {
  try {
    const limit = Math.min(24, Math.max(1, Number(new URL(request.url).searchParams.get('limit') || 8)))
    if (!Number.isInteger(limit)) {
      return NextResponse.json({ success: false, error: 'Invalid limit' }, { status: 400 })
    }
    const rows = await prisma.product.findMany({
      where: { featured: true, isActive: true, isDeleted: false },
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
    const sales = await getRealUnitSales(rows.map((product) => product.id))
    const products = rows.map((product) => serializePublicProduct(product, sales.get(product.id) || 0))
    return NextResponse.json({ success: true, data: { products }, products })
  } catch (error) {
    console.error('Featured products API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch featured products' }, { status: 500 })
  }
}
