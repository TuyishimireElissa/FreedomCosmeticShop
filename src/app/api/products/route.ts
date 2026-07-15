export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PUBLIC_PRODUCT_SELECT, getRealUnitSales, serializePublicProduct } from '@/lib/public-product'
import { expandSearchQuery, parsePriceFromQuery, removePriceExpression } from '@/lib/search-vocabulary'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const page = Number(params.get('page') || 1)
    const pageSize = Number(params.get('pageSize') || params.get('limit') || 24)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ success: false, error: 'Invalid pagination' }, { status: 400 })
    }

    const search = params.get('search')?.trim() || ''
    const category = params.get('category')
    const brand = params.get('brand')
    const skinType = params.get('skinType')
    const minPrice = params.get('minPrice')
    const maxPrice = params.get('maxPrice')
    const minRating = params.get('minRating')
    const sort = params.get('sort') || 'newest'
    const priceSearch = parsePriceFromQuery(search)
    const searchableText = removePriceExpression(search, priceSearch)
    const expandedTerms = expandSearchQuery(searchableText)
    const where: Prisma.ProductWhereInput = { isActive: true, isDeleted: false }

    if (category && category !== 'all') where.category = { slug: category }
    if (brand) where.brand = { slug: brand }
    if (params.get('featured') === 'true') where.featured = true
    if (params.get('inStock') === 'true') where.stock = { gt: 0 }
    if (skinType) where.skinType = { contains: skinType }
    if (minRating && Number.isFinite(Number(minRating))) where.rating = { gte: Number(minRating) }

    const explicitMinPrice = minPrice && Number.isFinite(Number(minPrice)) ? Number(minPrice) : undefined
    const explicitMaxPrice = maxPrice && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : undefined
    const effectiveMinPrice = explicitMinPrice ?? priceSearch?.minPrice
    const effectiveMaxPrice = explicitMaxPrice ?? priceSearch?.maxPrice
    if (effectiveMinPrice !== undefined || effectiveMaxPrice !== undefined) {
      where.price = {}
      if (effectiveMinPrice !== undefined) where.price.gte = effectiveMinPrice
      if (effectiveMaxPrice !== undefined) where.price.lte = effectiveMaxPrice
    }

    if (expandedTerms.length > 0) {
      where.OR = expandedTerms.flatMap((term) => [
        { name: { contains: term, mode: 'insensitive' as const } },
        { shortDescription: { contains: term, mode: 'insensitive' as const } },
        { description: { contains: term, mode: 'insensitive' as const } },
        { ingredients: { contains: term, mode: 'insensitive' as const } },
        { ingredientsRw: { contains: term, mode: 'insensitive' as const } },
        { brand: { name: { contains: term, mode: 'insensitive' as const } } },
        { category: { name: { contains: term, mode: 'insensitive' as const } } },
      ])
    }

    const total = await prisma.product.count({ where })
    let rows

    if (sort === 'best-selling') {
      const matching = await prisma.product.findMany({ where, select: { id: true } })
      const sales = await getRealUnitSales(matching.map((product) => product.id))
      const orderedIds = matching
        .map((product) => product.id)
        .sort((left, right) => (sales.get(right) || 0) - (sales.get(left) || 0))
      const pageIds = orderedIds.slice((page - 1) * pageSize, page * pageSize)
      const unorderedRows = await prisma.product.findMany({
        where: { id: { in: pageIds } },
        select: PUBLIC_PRODUCT_SELECT,
      })
      const positions = new Map(pageIds.map((id, index) => [id, index]))
      rows = unorderedRows.sort((left, right) => (positions.get(left.id) || 0) - (positions.get(right.id) || 0))
    } else {
      const orderBy: Prisma.ProductOrderByWithRelationInput = sort === 'price-asc'
        ? { price: 'asc' }
        : sort === 'price-desc'
          ? { price: 'desc' }
          : sort === 'rating'
            ? { rating: 'desc' }
            : { createdAt: 'desc' }
      rows = await prisma.product.findMany({
        where,
        select: PUBLIC_PRODUCT_SELECT,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
    }

    const sales = await getRealUnitSales(rows.map((product) => product.id))
    const products = rows.map((product) => serializePublicProduct(product, sales.get(product.id) || 0))
    const pagination = {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    }
    const response = NextResponse.json({ success: true, data: { products, pagination }, products, pagination })
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}
