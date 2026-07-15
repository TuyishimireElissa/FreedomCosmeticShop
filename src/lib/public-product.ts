import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Explicit allow-list for every public product response.
 * Admin-only cost, supplier, batch, manufacturing, and expiry fields are
 * intentionally impossible to select through this object.
 */
export const PUBLIC_PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  shortDescription: true,
  price: true,
  compareAt: true,
  stock: true,
  lowStockThreshold: true,
  sku: true,
  realSku: true,
  images: true,
  videoUrl: true,
  skinType: true,
  hairType: true,
  shades: true,
  shade: true,
  shadeHex: true,
  undertone: true,
  fragranceNotes: true,
  ingredients: true,
  ingredientsRw: true,
  size: true,
  volume: true,
  volumeMl: true,
  weightGrams: true,
  usageInstructions: true,
  howToUse: true,
  howToUseRw: true,
  warnings: true,
  warningsRw: true,
  allergens: true,
  expectedResults: true,
  expectedResultsRw: true,
  resultsTimeframe: true,
  periodAfterOpening: true,
  isAuthentic: true,
  authenticityInfo: true,
  countryOfOrigin: true,
  importedBy: true,
  rating: true,
  reviewsCount: true,
  featured: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  categoryId: true,
  brandId: true,
  minWholesaleQty: true,
  category: { select: { id: true, name: true, slug: true, image: true } },
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  productImages: {
    select: {
      id: true,
      url: true,
      publicId: true,
      altText: true,
      altTextRw: true,
      imageType: true,
      sortOrder: true,
      isPrimary: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
  reviews: {
    where: { isApproved: true, isDeleted: false },
    select: { rating: true },
  },
} satisfies Prisma.ProductSelect

export type PublicProductRow = Prisma.ProductGetPayload<{ select: typeof PUBLIC_PRODUCT_SELECT }>

function parseJsonArray(value: string | null) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function decimalNumber(value: Prisma.Decimal | null) {
  return value === null ? null : value.toNumber()
}

export function serializePublicProduct(product: PublicProductRow, totalSales = 0) {
  const { reviews, ...safeProduct } = product
  const reviewCount = reviews.length
  const rating = reviewCount > 0
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
    : 0
  const ageMs = Date.now() - new Date(product.createdAt).getTime()
  const daysSinceCreated = Math.max(0, ageMs / 86_400_000)
  const isNewArrival = daysSinceCreated <= 30
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold
  const isOutOfStock = product.stock === 0
  const isBestSeller = totalSales >= 50

  return {
    ...safeProduct,
    volumeMl: decimalNumber(product.volumeMl),
    weightGrams: decimalNumber(product.weightGrams),
    images: parseJsonArray(product.images) || [],
    skinType: parseJsonArray(product.skinType),
    shades: parseJsonArray(product.shades),
    ingredients: parseJsonArray(product.ingredients),
    rating,
    reviewsCount: reviewCount,
    totalSales,
    isBestSeller,
    isNewArrival,
    isNew: isNewArrival,
    isFeatured: product.featured,
    isLowStock,
    isOutOfStock,
  }
}

/** Count only paid orders or delivered orders (including delivered COD). */
export async function getRealUnitSales(productIds: string[]) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))]
  const totals = new Map<string, number>()
  if (uniqueIds.length === 0) return totals

  const rows = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      productId: { in: uniqueIds },
      order: {
        OR: [
          { status: 'DELIVERED' },
          { payments: { some: { status: 'PAID' } } },
        ],
      },
    },
    _sum: { quantity: true },
  })

  for (const row of rows) {
    if (row.productId) totals.set(row.productId, row._sum.quantity || 0)
  }
  return totals
}
