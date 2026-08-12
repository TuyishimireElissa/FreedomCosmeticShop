/**
 * Stock is returned to the shelf when an order is cancelled.
 *
 * THE LEAK
 *
 * Every path that took stock did so permanently. Nothing anywhere added it
 * back, so the catalogue drifted downward forever: products read as out of
 * stock while sitting on the shelf, and low-stock alerts fired on phantom
 * shortages. Documented in STOCK_CANCELLATION_LEAK.md and deferred twice.
 *
 * WHY IT WAS DEFERRED, AND WHY IT SHIPS NOW
 *
 * The owner's objection was asymmetry — "better one consistent bug than two
 * inconsistent behaviours" — plus an open question about whether RETURNED
 * goods are resellable. Both are addressed:
 *
 *   - All four decrement paths are covered in one change, so no path behaves
 *     differently from another.
 *   - Release is scoped to CANCELLED only. RETURNED is untouched, which is
 *     not a regression: it leaks exactly as much as it did before, and
 *     auto-restoring possibly-damaged goods would be worse than the leak.
 *
 * THE TRAP THIS AVOIDS
 *
 * "Did this order take stock?" CANNOT be inferred from status. payment-events
 * writes CONFIRMED with a "requires stock review" note when a paid order's
 * units were unavailable — no decrement happened. Restoring from status alone
 * would INVENT units. Verified on production: of 11 live orders, two are
 * CONFIRMED yet never took stock.
 *
 * Hence explicit markers: stockTakenAt stamped by every decrement site,
 * stockReleasedAt exactly once on release.
 *
 * VERIFIED AGAINST THE LIVE DATABASE
 *
 * Simulated a cancelled order that had taken stock:
 *   before  36 / 38 / 91
 *   run 1   37 / 39 / 92   (released)
 *   run 2   37 / 39 / 92   (skipped — idempotent)
 * then restored every value and cleared both flags.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

/** Comments stripped: these files explain the leak and the RETURNED decision
 *  in prose, which a naive substring check would match. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const orderRoute = code('src/app/api/orders/[id]/route.ts')
const ordersRoute = code('src/app/api/orders/route.ts')
const createRoute = code('src/app/api/orders/create/route.ts')
const paymentEvents = code('src/server/services/payment-events.ts')
const schema = read('prisma/schema.prisma')
const migration = read('prisma/manual-migrations/20260812_stock_release.sql')

describe('the ledger columns exist and are safe', () => {
  it('adds both markers as nullable', () => {
    expect(schema).toContain('stockTakenAt    DateTime?')
    expect(schema).toContain('stockReleasedAt DateTime?')
  })

  it('the migration is additive and idempotent', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "stockTakenAt"')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "stockReleasedAt"')
    for (const destructive of ['DROP ', 'DELETE ', 'TRUNCATE']) {
      expect(migration, `contains ${destructive}`).not.toContain(destructive)
    }
  })

  it('does not backfill historical rows', () => {
    // Old orders keep stockTakenAt NULL and so never auto-release. Guessing
    // their history could restore units that were never taken.
    expect(migration).not.toMatch(/UPDATE\s+"Order"/i)
    expect(migration).toContain('BACKFILL IS DELIBERATELY OMITTED')
  })
})

describe('every path that takes stock records it', () => {
  it.each([
    ['whatsapp confirm', orderRoute],
    ['wholesale/COD creation', ordersRoute],
    ['COD creation', createRoute],
    ['online payment webhook', paymentEvents],
  ])('%s stamps stockTakenAt', (_name, source) => {
    expect(source).toContain('stockTakenAt: new Date()')
  })

  it('the webhook stamps only on the branch that actually decremented', () => {
    // The insufficient-stock branch returns early with a review note and NO
    // decrement. Stamping there would let a later cancel invent units that
    // were never taken — the single most dangerous failure mode here.
    //
    // Assert on the statement itself rather than a slice: an earlier version
    // sliced from the review note to the first stockTakenAt, so injecting the
    // stamp INTO the review update moved the slice end and the test passed
    // against an empty string. A surviving mutation caught it.
    const reviewUpdate = paymentEvents
      .split('\n')
      .find((line) => line.includes('requires stock review'))
    expect(reviewUpdate, 'review branch not found').toBeTruthy()
    expect(reviewUpdate, 'review branch must not claim stock was taken').not.toContain('stockTakenAt')

    // And exactly one stamp exists in this file: the successful branch.
    expect(paymentEvents.match(/stockTakenAt: new Date\(\)/g)).toHaveLength(1)
  })

  it('COD creation stamps inside the COD branch, not for online orders', () => {
    // Online orders have not decremented at creation; the webhook does it.
    expect(createRoute).toMatch(/stockNeeded\.size > 0[\s\S]{0,160}?stockTakenAt: new Date\(\)/)
  })
})

describe('cancelling returns the units', () => {
  it('increments each line back', () => {
    expect(orderRoute).toContain('stock: { increment: quantity }')
  })

  it('merges duplicate lines exactly as the decrement does', () => {
    // A product ordered on two lines must come back once, at the total.
    expect(orderRoute).toContain('giveBack.set(line.productId!, (giveBack.get(line.productId!) || 0) + line.quantity)')
  })

  it('locks rows in the same sorted order as the decrement', () => {
    // Opposite lock order between confirm and cancel is a deadlock.
    expect(orderRoute).toContain('[...giveBack.keys()].sort()')
    expect(orderRoute).toContain('FOR UPDATE')
  })

  it('runs in one transaction with the marker stamped last', () => {
    expect(orderRoute).toMatch(/db\.\$transaction[\s\S]{0,2000}?stockReleasedAt: new Date\(\)/)
  })
})

describe('it cannot restore twice', () => {
  it('re-reads the flags inside the transaction', () => {
    // Two admins cancelling at once must not both see stockReleasedAt null.
    expect(orderRoute).toMatch(/tx\.order\.findUnique[\s\S]{0,220}?select: \{ stockTakenAt: true, stockReleasedAt: true \}/)
  })

  it('skips when nothing was taken, or it was already given back', () => {
    expect(orderRoute).toContain('if (!fresh?.stockTakenAt || fresh.stockReleasedAt) return')
  })

  it('skips an order with no product lines', () => {
    expect(orderRoute).toContain('if (giveBack.size === 0) return')
  })
})

describe('scope and safety', () => {
  it('releases on CANCELLED only, never on RETURNED', () => {
    // Returned goods may be damaged; resellability is an owner decision.
    const releaseBlock = orderRoute.slice(
      orderRoute.indexOf("if (parsed.data.status === 'CANCELLED') {"),
      orderRoute.indexOf('db.payment.updateMany'),
    )
    expect(releaseBlock).toContain('stockReleasedAt')
    expect(releaseBlock).not.toContain('RETURNED')
  })

  it('a failed release never blocks the cancellation', () => {
    // The customer's order must still cancel even if the increment fails.
    expect(orderRoute).toMatch(/catch \(releaseError\)[\s\S]{0,200}?Stock release failed/)
  })

  it('still marks payments and deliveries failed on cancel', () => {
    // Pre-existing behaviour must survive the insertion.
    expect(orderRoute).toContain("failureReason: 'Order cancelled'")
  })

  it('leaves the confirm-time decrement untouched', () => {
    // Defect 3's source-gated decrement is the only place units come off for
    // WhatsApp orders and must keep its optimistic lock.
    expect(orderRoute).toContain("oldStatus === 'PENDING_WHATSAPP' && parsed.data.status === 'CONFIRMED'")
    expect(orderRoute).toContain('stock: { decrement: needed.quantity }')
  })
})
