import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function parse(value: string | null) {
  if (!value) return null
  try {
    const data = JSON.parse(value)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function serialize<T extends {
  images: string
  skinType: string | null
  shades: string | null
  ingredients: string | null
  reviews: Array<{ rating: number }>
  costPrice: number | null
  isDeleted: boolean
  deletedAt: Date | null
  lowStockThreshold: number
  wholesaleActive: boolean
}>(product: T) {
  const {
    reviews,
    costPrice: _costPrice,
    isDeleted: _isDeleted,
    deletedAt: _deletedAt,
    lowStockThreshold: _lowStockThreshold,
    wholesaleActive: _wholesaleActive,
    ...publicProduct
  } = product
  const reviewsCount = reviews.length
  const rating = reviewsCount
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount) * 10) / 10
    : 0
  return {
    ...publicProduct,
    images: parse(product.images) || [],
    skinType: parse(product.skinType),
    shades: parse(product.shades),
    ingredients: parse(product.ingredients),
    rating,
    reviewsCount,
  }
}

const publicRelations = {
  category: { select: { id: true, name: true, slug: true, image: true } },
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  reviews: {
    where: { isApproved: true, isDeleted: false },
    select: { rating: true },
  },
} as const

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const slug = decodeURIComponent(params.slug || '').trim()
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Product slug is required' }, { status: 400 })
    }
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { id: slug }], isActive: true, isDeleted: false },
      include: publicRelations,
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
      include: publicRelations,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 4,
    })
    const serialized = serialize(product)
    const related = relatedRows.map(serialize)
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
