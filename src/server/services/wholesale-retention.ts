import { db } from '@/lib/db'

const DAY_MS = 86_400_000
const AVERAGE_MONTH_DAYS = 365.2425 / 12

type PaidWholesaleOrder = { id: string; total: number; createdAt: Date }
type ReorderAttempt = { newOrderId: string | null }

function wholeDays(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS))
}

export function calculateWholesaleRetention(
  paidOrders: PaidWholesaleOrder[],
  reorderAttempts: ReorderAttempt[],
  now = new Date()
) {
  const ordered = [...paidOrders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const firstOrderDate = ordered[0]?.createdAt || null
  const lastOrderDate = ordered[ordered.length - 1]?.createdAt || null
  const totalOrders = ordered.length
  const totalSpent = ordered.reduce((sum, order) => sum + order.total, 0)
  const averageOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0
  const daysSinceFirstOrder = firstOrderDate ? wholeDays(firstOrderDate, now) : null
  const daysSinceLastOrder = lastOrderDate ? wholeDays(lastOrderDate, now) : null

  // A recurring rate needs at least two paid orders. 10,000 basis points = 1 repeat order/month.
  const activeMonths = firstOrderDate && lastOrderDate
    ? Math.max((lastOrderDate.getTime() - firstOrderDate.getTime()) / DAY_MS / AVERAGE_MONTH_DAYS, 1 / AVERAGE_MONTH_DAYS)
    : 0
  const ordersPerMonthBps = totalOrders > 1
    ? Math.round(((totalOrders - 1) / activeMonths) * 10_000)
    : 0

  const paidOrderIds = new Set(ordered.map((order) => order.id))
  const reorderCount = reorderAttempts.filter((attempt) => attempt.newOrderId && paidOrderIds.has(attempt.newOrderId)).length
  // reorderRateBps means completed linked reorders / recorded reorder attempts.
  const reorderRateBps = reorderAttempts.length > 0
    ? Math.min(10_000, Math.round((reorderCount / reorderAttempts.length) * 10_000))
    : 0

  return {
    firstOrderDate,
    lastOrderDate,
    totalOrders,
    totalSpent,
    averageOrderValue,
    daysSinceFirstOrder,
    daysSinceLastOrder,
    ordersPerMonthBps,
    status: totalOrders === 0 ? 'NO_PAID_ORDERS' : totalOrders === 1 ? 'NEW' : 'RETURNING',
    isChurned: false,
    churnedAt: null,
    churnReason: null,
    reorderCount,
    reorderRateBps,
  }
}

export async function refreshWholesaleRetentionMetric(userId: string, now = new Date()) {
  const [paidOrders, reorderAttempts] = await Promise.all([
    db.order.findMany({
      where: {
        userId,
        orderType: 'WHOLESALE',
        status: { notIn: ['CANCELLED', 'RETURNED'] },
        payments: { some: { status: 'PAID' } },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, total: true, createdAt: true },
    }),
    db.wholesaleReorder.findMany({
      where: { userId },
      select: { newOrderId: true },
    }),
  ])

  const metric = calculateWholesaleRetention(paidOrders, reorderAttempts, now)
  return db.wholesaleRetentionMetric.upsert({
    where: { userId },
    create: { userId, ...metric },
    update: metric,
  })
}

export async function refreshAllWholesaleRetentionMetrics(now = new Date()) {
  const users = await db.user.findMany({
    where: { wholesaleStatus: 'APPROVED', isDeleted: false },
    select: { id: true },
  })
  for (const user of users) await refreshWholesaleRetentionMetric(user.id, now)
  return users.length
}
