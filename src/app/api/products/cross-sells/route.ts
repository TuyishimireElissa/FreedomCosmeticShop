export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCloudinaryUrl } from '@/lib/cloudinary-images'

const querySchema = z.object({
  productIds: z.string().max(4000).transform((value) => [...new Set(value.split(',').map((id) => id.trim()).filter(Boolean))]).refine((ids) => ids.length <= 100),
  limit: z.coerce.number().int().min(1).max(12).default(6),
})

function firstLegacyImage(value: string) {
  try {
    const images = JSON.parse(value)
    return Array.isArray(images) && typeof images[0] === 'string' ? images[0] : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const parsed = querySchema.safeParse({ productIds: url.searchParams.get('productIds') || '', limit: url.searchParams.get('limit') || undefined })
    if (!parsed.success || parsed.data.productIds.length === 0) return NextResponse.json({ success: true, data: { products: [] }, products: [] })

    const cartProducts = await prisma.product.findMany({
      where: { id: { in: parsed.data.productIds }, isActive: true, isDeleted: false },
      select: { categoryId: true },
    })
    const categoryFrequency = new Map<string, number>()
    for (const product of cartProducts) categoryFrequency.set(product.categoryId, (categoryFrequency.get(product.categoryId) || 0) + 1)
    const categoryIds = [...categoryFrequency.keys()]
    if (categoryIds.length === 0) return NextResponse.json({ success: true, data: { products: [] }, products: [] })

    const products = await prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        id: { notIn: parsed.data.productIds },
        isActive: true,
        isDeleted: false,
        stock: { gt: 0 },
      },
      select: {
        id: true, name: true, slug: true, price: true, compareAt: true, stock: true, volume: true, categoryId: true,
        category: { select: { slug: true } },
        brand: { select: { name: true } },
        images: true,
        productImages: { select: { url: true, publicId: true, altText: true, isPrimary: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { name: 'asc' },
      take: 48,
    })

    const ranked = products
      .sort((left, right) => (categoryFrequency.get(right.categoryId) || 0) - (categoryFrequency.get(left.categoryId) || 0) || left.name.localeCompare(right.name))
      .slice(0, parsed.data.limit)
      .map((product) => {
        const structured = product.productImages.find((image) => image.isPrimary) || product.productImages[0]
        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          compareAt: product.compareAt,
          stock: product.stock,
          volume: product.volume,
          categorySlug: product.category.slug,
          brandName: product.brand?.name || null,
          imageUrl: structured?.publicId ? getCloudinaryUrl(structured.publicId, 'CARD_MOBILE') : structured?.url || firstLegacyImage(product.images),
          imagePublicId: structured?.publicId || null,
          imageAlt: structured?.altText || product.name,
        }
      })

    return NextResponse.json({ success: true, data: { products: ranked }, products: ranked })
  } catch (error) {
    console.error('Cross-sells API error:', error)
    return NextResponse.json({ success: false, error: 'CROSS_SELLS_FAILED' }, { status: 500 })
  }
}
