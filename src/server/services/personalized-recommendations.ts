import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PUBLIC_PRODUCT_SELECT, getRealUnitSales, serializePublicProduct } from '@/lib/public-product'

type SignalProfile = {
  orderCategories: Map<string, number>
  savedCategories: Map<string, number>
  brands: Map<string, number>
  quizProductIds: Set<string>
  quizCategoryIds: Set<string>
}

type Candidate = { id: string; name: string; categoryId: string; brandId: string | null }

export type RecommendationReason = 'QUIZ_MATCH' | 'PURCHASE_CATEGORY' | 'SAVED_CATEGORY' | 'BRAND_MATCH'

export function rankRecommendationCandidate(candidate: Candidate, signals: SignalProfile) {
  const contributions: Array<{ reason: RecommendationReason; score: number }> = []
  if (signals.quizProductIds.has(candidate.id)) contributions.push({ reason: 'QUIZ_MATCH', score: 8 })
  const orderCategory = signals.orderCategories.get(candidate.categoryId) || 0
  if (orderCategory > 0) contributions.push({ reason: 'PURCHASE_CATEGORY', score: orderCategory })
  const savedCategory = signals.savedCategories.get(candidate.categoryId) || 0
  if (savedCategory > 0) contributions.push({ reason: 'SAVED_CATEGORY', score: savedCategory })
  const brand = candidate.brandId ? signals.brands.get(candidate.brandId) || 0 : 0
  if (brand > 0) contributions.push({ reason: 'BRAND_MATCH', score: brand })
  if (signals.quizCategoryIds.has(candidate.categoryId)) contributions.push({ reason: 'QUIZ_MATCH', score: 3 })
  contributions.sort((a, b) => b.score - a.score || a.reason.localeCompare(b.reason))
  return {
    score: contributions.reduce((sum, contribution) => sum + contribution.score, 0),
    reason: contributions[0]?.reason || null,
  }
}

export async function getPersonalizedRecommendations(userId: string, limit: number) {
  const [orderItems, savedItems, quiz] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        productId: { not: null },
        order: {
          userId,
          OR: [{ status: 'DELIVERED' }, { payments: { some: { status: 'PAID' } } }],
        },
        product: { isActive: true, isDeleted: false },
      },
      select: { productId: true, quantity: true, product: { select: { categoryId: true, brandId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.wishlist.findMany({
      where: { userId, product: { isActive: true, isDeleted: false } },
      select: { productId: true, product: { select: { categoryId: true, brandId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.quizResult.findFirst({
      where: { userId },
      select: { recommendedProductIds: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const orderCategories = new Map<string, number>()
  const savedCategories = new Map<string, number>()
  const brands = new Map<string, number>()
  const purchasedIds = new Set<string>()
  for (const item of orderItems) {
    if (!item.productId || !item.product) continue
    purchasedIds.add(item.productId)
    const quantity = Math.min(Math.max(item.quantity, 1), 3)
    orderCategories.set(item.product.categoryId, (orderCategories.get(item.product.categoryId) || 0) + quantity * 3)
    if (item.product.brandId) brands.set(item.product.brandId, (brands.get(item.product.brandId) || 0) + quantity)
  }
  for (const item of savedItems) {
    savedCategories.set(item.product.categoryId, (savedCategories.get(item.product.categoryId) || 0) + 2)
    if (item.product.brandId) brands.set(item.product.brandId, (brands.get(item.product.brandId) || 0) + 2)
  }

  const quizProductIds = new Set(quiz?.recommendedProductIds.slice(0, 50) || [])
  const quizProducts = quizProductIds.size
    ? await prisma.product.findMany({ where: { id: { in: [...quizProductIds] } }, select: { categoryId: true } })
    : []
  const quizCategoryIds = new Set(quizProducts.map((product) => product.categoryId))
  const signals: SignalProfile = { orderCategories, savedCategories, brands, quizProductIds, quizCategoryIds }
  const categoryIds = [...new Set([...orderCategories.keys(), ...savedCategories.keys(), ...quizCategoryIds])]
  const brandIds = [...brands.keys()]
  const hasSignals = categoryIds.length > 0 || brandIds.length > 0 || quizProductIds.size > 0
  if (!hasSignals) return { products: [], reasons: {}, personalized: false, signalsUsed: [] as string[] }

  const or: Prisma.ProductWhereInput[] = []
  if (categoryIds.length) or.push({ categoryId: { in: categoryIds } })
  if (brandIds.length) or.push({ brandId: { in: brandIds } })
  if (quizProductIds.size) or.push({ id: { in: [...quizProductIds] } })
  const candidates = await prisma.product.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      stock: { gt: 0 },
      id: { notIn: [...purchasedIds] },
      OR: or,
    },
    select: { id: true, name: true, categoryId: true, brandId: true },
    take: 80,
  })

  const ranked = candidates
    .map((candidate) => ({ ...candidate, ...rankRecommendationCandidate(candidate, signals) }))
    .filter((candidate) => candidate.score > 0 && candidate.reason)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, limit)
  if (ranked.length === 0) return { products: [], reasons: {}, personalized: true, signalsUsed: signalNames(signals) }

  const rows = await prisma.product.findMany({
    where: { id: { in: ranked.map((product) => product.id) }, isActive: true, isDeleted: false, stock: { gt: 0 } },
    select: PUBLIC_PRODUCT_SELECT,
  })
  const rowMap = new Map(rows.map((row) => [row.id, row]))
  const sales = await getRealUnitSales(rows.map((row) => row.id))
  const products = ranked.flatMap((entry) => {
    const row = rowMap.get(entry.id)
    return row ? [serializePublicProduct(row, sales.get(row.id) || 0)] : []
  })
  const reasons = Object.fromEntries(ranked.map((entry) => [entry.id, entry.reason]))
  return { products, reasons, personalized: true, signalsUsed: signalNames(signals) }
}

function signalNames(signals: SignalProfile) {
  return [
    ...(signals.orderCategories.size ? ['ELIGIBLE_PURCHASE_CATEGORIES'] : []),
    ...(signals.savedCategories.size ? ['SAVED_PRODUCT_CATEGORIES'] : []),
    ...(signals.quizProductIds.size ? ['LATEST_QUIZ_PRODUCT_MATCHES'] : []),
  ]
}
