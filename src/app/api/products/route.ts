import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function parseJsonArray(value: string | null): unknown[] | null {
  if (!value) return null
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}

function serializeProduct<T extends { images: string; skinType: string | null; shades: string | null; ingredients: string | null }>(product: T) {
  return { ...product, images: parseJsonArray(product.images) || [], skinType: parseJsonArray(product.skinType), shades: parseJsonArray(product.shades), ingredients: parseJsonArray(product.ingredients) }
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const page = Number(params.get('page') || 1)
    const pageSize = Number(params.get('pageSize') || params.get('limit') || 24)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return NextResponse.json({ success: false, error: 'Invalid pagination' }, { status: 400 })

    const search = params.get('search')?.trim() || ''
    const category = params.get('category')
    const brand = params.get('brand')
    const skinType = params.get('skinType')
    const minPrice = params.get('minPrice')
    const maxPrice = params.get('maxPrice')
    const minRating = params.get('minRating')
    const sort = params.get('sort') || 'newest'
    const where: Prisma.ProductWhereInput = { isActive: true, isDeleted: false }
    if (category && category !== 'all') where.category = { slug: category }
    if (brand) where.brand = { slug: brand }
    if (params.get('featured') === 'true') where.featured = true
    if (params.get('inStock') === 'true') where.stock = { gt: 0 }
    if (skinType) where.skinType = { contains: skinType }
    if (minRating && Number.isFinite(Number(minRating))) where.rating = { gte: Number(minRating) }
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice && Number.isFinite(Number(minPrice))) where.price.gte = Number(minPrice)
      if (maxPrice && Number.isFinite(Number(maxPrice))) where.price.lte = Number(maxPrice)
    }
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }, { brand: { name: { contains: search, mode: 'insensitive' } } }]

    const orderBy: Prisma.ProductOrderByWithRelationInput = sort === 'price-asc' ? { price: 'asc' } : sort === 'price-desc' ? { price: 'desc' } : sort === 'rating' ? { rating: 'desc' } : sort === 'best-selling' ? { reviewsCount: 'desc' } : { createdAt: 'desc' }
    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, include: { category: true, brand: true }, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.product.count({ where }),
    ])
    const products = rows.map(serializeProduct)
    const pagination = { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total }
    return NextResponse.json({ success: true, data: { products, pagination }, products, pagination })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}
