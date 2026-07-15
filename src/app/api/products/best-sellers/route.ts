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

    const candidates = await prisma.product.findMany({
      where: { isActive: true, isDeleted: false },
      select: { id: true, rating: true },
    })
    const sales = await getRealUnitSales(candidates.map((product) => product.id))
    const ids = candidates
      .filter((product) => (sales.get(product.id) || 0) > 0)
      .sort((left, right) => {
        const salesDifference = (sales.get(right.id) || 0) - (sales.get(left.id) || 0)
        return salesDifference || right.rating - left.rating
      })
      .slice(0, limit)
      .map((product) => product.id)

    const unorderedRows = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: PUBLIC_PRODUCT_SELECT,
    })
    const positions = new Map(ids.map((id, index) => [id, index]))
    const rows = unorderedRows.sort((left, right) => (positions.get(left.id) ?? 0) - (positions.get(right.id) ?? 0))
    const products = rows.map((product) => serializePublicProduct(product, sales.get(product.id) || 0))

    return NextResponse.json({ success: true, data: { products }, products })
  } catch (error) {
    console.error('Best sellers API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch best sellers' }, { status: 500 })
  }
}
