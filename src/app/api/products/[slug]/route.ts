import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PUBLIC_PRODUCT_SELECT, getRealUnitSales, serializePublicProduct } from '@/lib/public-product'

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const slug = decodeURIComponent(params.slug || '').trim()
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Product slug is required' }, { status: 400 })
    }

    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { id: slug }], isActive: true, isDeleted: false },
      select: PUBLIC_PRODUCT_SELECT,
    })
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    const relatedRows = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
        isDeleted: false,
      },
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 4,
    })

    const allRows = [product, ...relatedRows]
    const sales = await getRealUnitSales(allRows.map((item) => item.id))
    const serialized = serializePublicProduct(product, sales.get(product.id) || 0)
    const related = relatedRows.map((item) => serializePublicProduct(item, sales.get(item.id) || 0))
    const response = NextResponse.json({
      success: true,
      data: { product: serialized, related },
      product: serialized,
      related,
    })
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600')
    return response
  } catch (error) {
    console.error('Product detail API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 })
  }
}
