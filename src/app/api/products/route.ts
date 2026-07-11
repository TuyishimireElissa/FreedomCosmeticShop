/**
 * GET /api/products
 * 
 * Now with fallback data for Vercel deployment without DATABASE_URL
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { fallbackProducts } from "@/lib/fallbackData"

function filterAndSortFallback(params: {
  category?: string | null
  brand?: string | null
  search?: string
  featured?: boolean
  sort?: string
  minPrice?: string | null
  maxPrice?: string | null
  skinType?: string | null
  minRating?: string | null
  inStock?: boolean
  page: number
  pageSize: number
}) {
  let filtered = [...fallbackProducts]

  if (params.category && params.category !== "all") {
    filtered = filtered.filter(p => p.category?.slug === params.category)
  }
  if (params.brand) {
    filtered = filtered.filter(p => p.brand?.slug === params.brand)
  }
  if (params.featured) {
    filtered = filtered.filter(p => p.featured)
  }
  if (params.search) {
    const s = params.search.toLowerCase()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(s) ||
      p.description.toLowerCase().includes(s) ||
      p.brand?.name.toLowerCase().includes(s)
    )
  }
  if (params.minPrice) {
    filtered = filtered.filter(p => p.price >= Number(params.minPrice))
  }
  if (params.maxPrice) {
    filtered = filtered.filter(p => p.price <= Number(params.maxPrice))
  }
  if (params.skinType) {
    filtered = filtered.filter(p => p.skinType?.includes(params.skinType!))
  }
  if (params.minRating) {
    filtered = filtered.filter(p => p.rating >= Number(params.minRating))
  }
  if (params.inStock) {
    filtered = filtered.filter(p => p.stock > 0)
  }

  // Sort
  if (params.sort === "price-asc") filtered.sort((a,b) => a.price - b.price)
  else if (params.sort === "price-desc") filtered.sort((a,b) => b.price - a.price)
  else if (params.sort === "rating") filtered.sort((a,b) => b.rating - a.rating)
  else if (params.sort === "best-selling") filtered.sort((a,b) => b.reviewsCount - a.reviewsCount)
  else filtered.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = filtered.length
  const totalPages = Math.ceil(total / params.pageSize)
  const start = (params.page - 1) * params.pageSize
  const paginated = filtered.slice(start, start + params.pageSize)

  return { products: paginated, total, totalPages }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const brand = searchParams.get("brand")
    const search = searchParams.get("search")?.trim() || ""
    const featured = searchParams.get("featured") === "true"
    const sort = searchParams.get("sort") || "newest"
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const skinType = searchParams.get("skinType")
    const minRating = searchParams.get("minRating")
    const inStock = searchParams.get("inStock") === "true"
    const page = Math.max(1, Number(searchParams.get("page") || "1"))
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") || "24"))
    )

    // Build the where clause
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isDeleted: false,
    }

    if (category && category !== "all") {
      where.category = { slug: category }
    }
    if (brand) {
      where.brand = { slug: brand }
    }
    if (featured) {
      where.featured = true
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { name: { contains: search } } },
        { description: { contains: search } },
        { shortDescription: { contains: search } },
      ]
    }
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = Number(minPrice)
      if (maxPrice) where.price.lte = Number(maxPrice)
    }
    if (skinType) {
      where.skinType = { contains: skinType }
    }
    if (minRating) {
      where.rating = { gte: Number(minRating) }
    }
    if (inStock) {
      where.stock = { gt: 0 }
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price-asc"
        ? { price: "asc" }
        : sort === "price-desc"
        ? { price: "desc" }
        : sort === "rating"
        ? { rating: "desc" }
        : sort === "best-selling"
        ? { reviewsCount: "desc" }
        : { createdAt: "desc" }

    // Try database first
    try {
      const total = await db.product.count({ where })
      
      // If DB is empty, use fallback immediately
      if (total === 0) {
        console.log("DB empty, using fallback products")
        const fallback = filterAndSortFallback({ category, brand, search, featured, sort, minPrice, maxPrice, skinType, minRating, inStock, page, pageSize })
        return NextResponse.json({
          products: fallback.products,
          pagination: { page, pageSize, total: fallback.total, totalPages: fallback.totalPages, hasMore: page < fallback.totalPages },
          _source: "fallback-empty-db",
        })
      }

      const totalPages = Math.ceil(total / pageSize)
      const products = await db.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, brand: true },
      })

      const serialized = products.map((p) => ({
        ...p,
        images: JSON.parse(p.images) as string[],
        skinType: p.skinType ? (JSON.parse(p.skinType) as string[]) : null,
        shades: p.shades ? (JSON.parse(p.shades) as string[]) : null,
        ingredients: p.ingredients ? (JSON.parse(p.ingredients) as string[]) : null,
      }))

      return NextResponse.json({
        products: serialized,
        pagination: { page, pageSize, total, totalPages, hasMore: page < totalPages },
        _source: "database",
      })
    } catch (dbError) {
      console.warn("DB failed, using fallback:", dbError)
      const fallback = filterAndSortFallback({ category, brand, search, featured, sort, minPrice, maxPrice, skinType, minRating, inStock, page, pageSize })
      return NextResponse.json({
        products: fallback.products,
        pagination: { page, pageSize, total: fallback.total, totalPages: fallback.totalPages, hasMore: page < fallback.totalPages },
        _source: "fallback-db-error",
      })
    }
  } catch (error) {
    console.error("Failed to fetch products, using fallback:", error)
    try {
      return NextResponse.json({
        products: fallbackProducts.slice(0, 8),
        pagination: { page: 1, pageSize: 24, total: fallbackProducts.length, totalPages: 1, hasMore: false },
        _source: "fallback-exception",
      })
    } catch {
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
    }
  }
}
