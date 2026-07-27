import type { Prisma } from '@prisma/client'

/** Recalculate denormalized product stats from real, verified, publicly visible reviews only. */
export async function recalculateProductReviewStats(tx: Prisma.TransactionClient, productId: string) {
  const aggregate = await tx.review.aggregate({
    where: { productId, isVerified: true, isApproved: true, isHidden: false, isDeleted: false },
    _count: { id: true },
    _avg: { rating: true },
  })
  const count = aggregate._count.id
  const rating = count > 0 ? Math.round((aggregate._avg.rating || 0) * 10) / 10 : 0
  await tx.product.update({ where: { id: productId }, data: { rating, reviewsCount: count } })
  return { rating, count }
}
