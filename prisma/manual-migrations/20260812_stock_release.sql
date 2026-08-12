-- Idempotent additive migration applied before the matching application deploy.
--
-- Cancelling an order never returned its units to the shelf. Every path that
-- takes stock does so permanently:
--
--   /api/orders            wholesale/COD   decrements at creation
--   /api/orders/create     COD             decrements at creation
--   payment-events         online          decrements at the PAID webhook
--   /api/orders/[id]       WhatsApp        decrements at PENDING_WHATSAPP -> CONFIRMED
--
-- Nothing anywhere added them back, so the catalogue drifts downward forever:
-- products read as out of stock while sitting on the shelf, and the low-stock
-- alert fires on phantom shortages.
--
-- WHY A COLUMN RATHER THAN INFERRING IT
--
-- "Did this order take stock?" cannot be derived reliably from status. A paid
-- online order can reach CONFIRMED *without* decrementing — payment-events.ts
-- writes the CONFIRMED status and a "requires stock review" note when the
-- units were not available. Restoring from status alone would INVENT units
-- that were never removed, which is worse than the leak it fixes.
--
-- Two markers, both nullable so every existing row is correctly "unknown":
--
--   stockTakenAt     stamped when units come off, by every decrement path
--   stockReleasedAt  stamped when they go back, exactly once
--
-- Release requires stockTakenAt set and stockReleasedAt null. A double-cancel,
-- a retry, or a replayed webhook is therefore a no-op — the mirror image of
-- the double-decrement guard that shaped the Defect 3 design.
--
-- BACKFILL IS DELIBERATELY OMITTED. Historical rows keep stockTakenAt = NULL,
-- so they will never auto-release. That is the safe direction: the existing
-- leak stays exactly as it is for old orders rather than risking a wrong
-- restore on an order whose history cannot be reconstructed. Verified against
-- production first — of 11 live orders, 0 have actually taken stock, so
-- nothing is owed a backfill today.
--
-- Safe to re-run. Additive only: two nullable columns and two partial indexes.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockTakenAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockReleasedAt" TIMESTAMP(3);

-- Partial indexes: the only queries that matter are "which orders still hold
-- stock" and "which have already been released", both of which are small
-- subsets of the table.
CREATE INDEX IF NOT EXISTS "Order_stockTakenAt_idx"
  ON "Order" ("stockTakenAt") WHERE "stockTakenAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Order_stockReleasedAt_idx"
  ON "Order" ("stockReleasedAt") WHERE "stockReleasedAt" IS NOT NULL;

ANALYZE "Order";
