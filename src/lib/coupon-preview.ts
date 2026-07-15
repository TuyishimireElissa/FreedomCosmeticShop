import type { Coupon } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface CouponCartLine {
  productId: string
  quantity: number
}

function parseIds(value: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function couponTerms(coupon: Coupon) {
  return {
    description: coupon.description,
    type: coupon.type,
    value: coupon.value,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscountAmount: coupon.maxDiscountAmount,
    startsAt: coupon.startsAt.toISOString(),
    endsAt: coupon.endsAt?.toISOString() || null,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    usageRemaining: coupon.usageLimit === null ? null : Math.max(0, coupon.usageLimit - coupon.usedCount),
    usageLimitPerUser: coupon.usageLimitPerUser,
    appliesToAllProducts: coupon.appliesToAllProducts,
    categoryIds: parseIds(coupon.categoryIds),
    productIds: parseIds(coupon.productIds),
  }
}

export async function previewCoupon(codeInput: string, lines: CouponCartLine[], userId?: string) {
  const code = codeInput.trim().toUpperCase()
  const coupon = await prisma.coupon.findUnique({ where: { code } })
  if (!coupon) return null

  const uniqueLines = new Map<string, number>()
  for (const line of lines) uniqueLines.set(line.productId, (uniqueLines.get(line.productId) || 0) + line.quantity)
  const products = await prisma.product.findMany({
    where: { id: { in: [...uniqueLines.keys()] }, isActive: true, isDeleted: false },
    select: { id: true, price: true, categoryId: true },
  })

  const productIds = parseIds(coupon.productIds)
  const categoryIds = parseIds(coupon.categoryIds)
  const subtotal = products.reduce((sum, product) => sum + product.price * (uniqueLines.get(product.id) || 0), 0)
  const eligibleSubtotal = products.reduce((sum, product) => {
    const eligible = coupon.appliesToAllProducts || productIds.includes(product.id) || categoryIds.includes(product.categoryId)
    return eligible ? sum + product.price * (uniqueLines.get(product.id) || 0) : sum
  }, 0)

  const now = new Date()
  let reason: 'INACTIVE' | 'NOT_STARTED' | 'EXPIRED' | 'USAGE_LIMIT' | 'USER_LIMIT' | 'MINIMUM_ORDER' | 'NO_ELIGIBLE_ITEMS' | 'EMPTY_CART' | null = null
  let userUsage: number | null = null
  if (userId) {
    userUsage = await prisma.order.count({ where: { userId, couponId: coupon.id, status: { not: 'CANCELLED' } } })
  }

  if (!coupon.isActive) reason = 'INACTIVE'
  else if (coupon.startsAt > now) reason = 'NOT_STARTED'
  else if (coupon.endsAt && coupon.endsAt < now) reason = 'EXPIRED'
  else if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) reason = 'USAGE_LIMIT'
  else if (userUsage !== null && userUsage >= coupon.usageLimitPerUser) reason = 'USER_LIMIT'
  else if (subtotal <= 0) reason = 'EMPTY_CART'
  else if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) reason = 'MINIMUM_ORDER'
  else if (eligibleSubtotal <= 0) reason = 'NO_ELIGIBLE_ITEMS'

  let discountAmount = 0
  if (coupon.type === 'PERCENTAGE') discountAmount = Math.round(eligibleSubtotal * coupon.value / 100)
  else if (coupon.type === 'FIXED') discountAmount = Math.min(coupon.value, eligibleSubtotal)
  if (coupon.maxDiscountAmount !== null) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
  if (reason) discountAmount = 0

  return {
    coupon: { id: coupon.id, code: coupon.code, ...couponTerms(coupon) },
    subtotal,
    eligibleSubtotal,
    discountAmount,
    freeShipping: coupon.type === 'FREE_SHIPPING' && !reason,
    canApply: reason === null,
    rejectionReason: reason,
    userUsage,
  }
}
