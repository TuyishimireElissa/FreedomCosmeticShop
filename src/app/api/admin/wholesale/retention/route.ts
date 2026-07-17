export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { refreshAllWholesaleRetentionMetrics } from '@/server/services/wholesale-retention'

export async function GET() {
  try {
    await requireRole('ADMIN')
    const approvedWholesaleUsers = await refreshAllWholesaleRetentionMetrics()
    const [metrics, reorderAttempts] = await Promise.all([
      db.wholesaleRetentionMetric.findMany({
        select: {
          status: true,
          totalOrders: true,
          totalSpent: true,
          reorderCount: true,
        },
      }),
      db.wholesaleReorder.count(),
    ])

    const statusCounts = metrics.reduce<Record<string, number>>((counts, metric) => {
      counts[metric.status] = (counts[metric.status] || 0) + 1
      return counts
    }, {})
    const paidOrders = metrics.reduce((sum, metric) => sum + metric.totalOrders, 0)
    const paidRevenue = metrics.reduce((sum, metric) => sum + metric.totalSpent, 0)
    const completedReorders = metrics.reduce((sum, metric) => sum + metric.reorderCount, 0)

    return NextResponse.json({
      approvedWholesaleUsers,
      trackedUsers: metrics.length,
      customersWithPaidOrders: metrics.filter((metric) => metric.totalOrders > 0).length,
      returningCustomers: statusCounts.RETURNING || 0,
      paidOrders,
      paidRevenue,
      reorderAttempts,
      completedReorders,
      reorderConversionBps: reorderAttempts > 0 ? Math.min(10_000, Math.round((completedReorders / reorderAttempts) * 10_000)) : 0,
      statusCounts,
      churnPolicyConfigured: false,
      churnedCustomers: 0,
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error('Wholesale retention error:', error)
    return NextResponse.json({ error: 'Failed to calculate retention metrics' }, { status: 500 })
  }
}
