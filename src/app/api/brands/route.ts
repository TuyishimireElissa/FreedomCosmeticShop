/** GET /api/brands — real active brands with at least one active product. */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const brands = await db.brand.findMany({
      where: { isActive: true, isDeleted: false },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true, isDeleted: false } } } },
      },
    })
    return NextResponse.json({
      brands: brands.filter((brand) => brand._count.products > 0),
      _source: 'database',
    })
  } catch (error) {
    console.error('Brands database query failed:', error)
    return NextResponse.json(
      { brands: [], _source: 'unavailable', error: 'Brands are temporarily unavailable' },
      { status: 503 },
    )
  }
}
