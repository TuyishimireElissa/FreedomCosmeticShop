export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const limit = Math.min(24, Math.max(1, Number(new URL(request.url).searchParams.get('limit') || 8)))
    if (!Number.isInteger(limit)) return NextResponse.json({ success: false, error: 'Invalid limit' }, { status: 400 })
    const rows = await prisma.product.findMany({ where: { featured: true, isActive: true, isDeleted: false }, include: { category: true, brand: true }, orderBy: { updatedAt: 'desc' }, take: limit })
    const products = rows.map((product) => {
      const { costPrice: _costPrice, isDeleted: _isDeleted, deletedAt: _deletedAt, lowStockThreshold: _threshold, wholesaleActive: _wholesale, ...publicProduct } = product
      return { ...publicProduct, images: safeParse(product.images), skinType: safeParse(product.skinType), shades: safeParse(product.shades), ingredients: safeParse(product.ingredients) }
    })
    return NextResponse.json({ success: true, data: { products }, products })
  } catch (error) {
    console.error('Featured products API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch featured products' }, { status: 500 })
  }
}
function safeParse(value: string | null) { if (!value) return null; try { return JSON.parse(value) } catch { return [] } }
