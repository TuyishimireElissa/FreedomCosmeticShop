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
  nameRw: true,
  slug: true,
  description: true,
  descriptionRw: true,
  shortDescription: true,
  shortDescriptionRw: true,
  price: true,
  wholesalePrice: true,
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
  // ─── Content infrastructure (23-field project, Phase 2) ──────────────
  suitableFor: true,
  uniqueSellingPoints: true,
  seoKeywords: true,
  seoKeywordsRw: true,
  whatsappShareText: true,
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
    where: { isApproved: true, isVerified: true, isHidden: false, isDeleted: false },
    select: { rating: true },
  },
} satisfies Prisma.ProductSelect

export const PUBLIC_PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  nameRw: true,
  slug: true,
  shortDescription: true,
  shortDescriptionRw: true,
  price: true,
  wholesalePrice: true,
  compareAt: true,
  stock: true,
  lowStockThreshold: true,
  images: true,
  skinType: true,
  size: true,
  volume: true,
  rating: true,
  reviewsCount: true,
  featured: true,
  isActive: true,
  isAuthentic: true,
  createdAt: true,
  updatedAt: true,
  categoryId: true,
  brandId: true,
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  productImages: {
    select: { id: true, url: true, publicId: true, altText: true, altTextRw: true, imageType: true, sortOrder: true, isPrimary: true },
    orderBy: { sortOrder: 'asc' },
  },
  reviews: {
    where: { isApproved: true, isVerified: true, isHidden: false, isDeleted: false },
    select: { rating: true },
  },
} satisfies Prisma.ProductSelect

export type PublicProductCardRow = Prisma.ProductGetPayload<{ select: typeof PUBLIC_PRODUCT_CARD_SELECT }>

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

export function serializePublicProductCard(product: PublicProductCardRow, totalSales = 0) {
  const { reviews, ...safeProduct } = product
  const reviewCount = reviews.length
  const rating = reviewCount > 0 ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10 : 0
  const daysSinceCreated = Math.max(0, (Date.now() - new Date(product.createdAt).getTime()) / 86_400_000)
  return {
    ...safeProduct,
    images: parseJsonArray(product.images) || [],
    skinType: parseJsonArray(product.skinType),
    rating,
    reviewsCount: reviewCount,
    totalSales,
    isBestSeller: totalSales >= 50,
    isNewArrival: daysSinceCreated <= 30,
    isNew: daysSinceCreated <= 30,
    isFeatured: product.featured,
    isLowStock: product.stock > 0 && product.stock <= product.lowStockThreshold,
    isOutOfStock: product.stock === 0,
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
