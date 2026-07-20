import { db } from '@/lib/db'
import {
  dispatchAbandonedCartReminder,
  dispatchReorderReminder,
  dispatchStockAlert,
  type DispatchResult,
} from '@/server/services/retention-messaging'

type Job = { type: 'REORDER' | 'STOCK' | 'ABANDONED_CART'; id: string }
type Outcome = DispatchResult['outcome'] | 'ERROR'

const CONCURRENCY = 4

async function runJobs(jobs: Job[]) {
  const outcomes: Record<Outcome, number> = {
    SENT: 0,
    NOT_DUE: 0,
    CANCELLED: 0,
    CHANNEL_UNAVAILABLE: 0,
    DELIVERY_DISABLED: 0,
    FAILED: 0,
    ERROR: 0,
  }
  let cursor = 0
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++]
      try {
        const result = job.type === 'REORDER'
          ? await dispatchReorderReminder(job.id)
          : job.type === 'STOCK'
            ? await dispatchStockAlert(job.id)
            : await dispatchAbandonedCartReminder(job.id)
        outcomes[result.outcome] += 1
      } catch {
        // Per-record failures are counted without logging recipient or message data.
        outcomes.ERROR += 1
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()))
  return outcomes
}

export async function processRetentionReminderBatch({ now = new Date(), batchSize = 25 }: { now?: Date; batchSize?: number } = {}) {
  const safeBatchSize = Math.min(Math.max(Math.trunc(batchSize), 1), 50)
  const staleBefore = new Date(now.getTime() - 30 * 60 * 1000)

  // A stale SENDING claim might already have reached a provider. Mark it failed
  // for manual review instead of retrying and risking duplicate messages.
  const [staleReorders, staleStock, staleCarts] = await db.$transaction([
    db.reorderReminder.updateMany({ where: { status: 'SENDING', updatedAt: { lt: staleBefore } }, data: { status: 'FAILED', lastErrorCode: 'STALE_CLAIM_REVIEW_REQUIRED' } }),
    db.stockAlert.updateMany({ where: { status: 'SENDING', updatedAt: { lt: staleBefore } }, data: { status: 'FAILED', lastErrorCode: 'STALE_CLAIM_REVIEW_REQUIRED' } }),
    db.abandonedCartReminder.updateMany({ where: { status: 'SENDING', updatedAt: { lt: staleBefore } }, data: { status: 'FAILED', lastErrorCode: 'STALE_CLAIM_REVIEW_REQUIRED' } }),
  ])

  const [reorders, abandoned, stock] = await Promise.all([
    db.reorderReminder.findMany({
      where: { status: 'PENDING', dueAt: { lte: now } },
      select: { id: true },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      take: safeBatchSize,
    }),
    db.abandonedCartReminder.findMany({
      where: { status: 'PENDING', dueAt: { lte: now } },
      select: { id: true },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      take: safeBatchSize,
    }),
    db.$queryRaw<Array<{ id: string }>>`
      SELECT alert.id
      FROM "StockAlert" AS alert
      INNER JOIN "Product" AS product ON product.id = alert."productId"
      WHERE alert.status = 'PENDING'
        AND product."isActive" = true
        AND product."isDeleted" = false
        AND (
          (alert."alertType" = 'BACK_IN_STOCK' AND product.stock > 0)
          OR
          (alert."alertType" = 'PRICE_DROP' AND alert."targetPrice" IS NOT NULL AND product.price <= alert."targetPrice")
        )
      ORDER BY alert."createdAt" ASC
      LIMIT ${safeBatchSize}
    `,
  ])

  const jobs: Job[] = [
    ...reorders.map((item) => ({ type: 'REORDER' as const, id: item.id })),
    ...stock.map((item) => ({ type: 'STOCK' as const, id: item.id })),
    ...abandoned.map((item) => ({ type: 'ABANDONED_CART' as const, id: item.id })),
  ]
  const outcomes = jobs.length ? await runJobs(jobs) : {
    SENT: 0,
    NOT_DUE: 0,
    CANCELLED: 0,
    CHANNEL_UNAVAILABLE: 0,
    DELIVERY_DISABLED: 0,
    FAILED: 0,
    ERROR: 0,
  }

  return {
    selected: { reorder: reorders.length, stock: stock.length, abandonedCart: abandoned.length },
    staleClaimsMarkedForReview: staleReorders.count + staleStock.count + staleCarts.count,
    outcomes,
  }
}
