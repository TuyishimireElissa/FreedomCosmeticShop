-- WhatsApp-first ordering: additive columns on "Order".
--
-- Order.status is a plain String in this schema (only HairType, ImageType and
-- BundleType are Prisma enums), so PENDING_WHATSAPP needs no ALTER TYPE and
-- carries no enum-migration risk. Existing rows keep their current status.
--
-- All columns are nullable with no default, so this is safe to run against the
-- live table while the application is serving traffic.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "whatsappSentAt"      TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "whatsappConfirmedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentReceivedAt"   TIMESTAMP(3);
-- MOMO | AIRTEL | CASH | PENDING — String, matching how Payment.method is stored.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod"       TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminNotes"          TEXT;

-- Admin dashboard filters on status and sorts by recency.
CREATE INDEX IF NOT EXISTS "Order_whatsappSentAt_idx" ON "Order" ("whatsappSentAt");

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- Reversible with no data loss to pre-existing columns:
--
--   DROP INDEX IF EXISTS "Order_whatsappSentAt_idx";
--   ALTER TABLE "Order" DROP COLUMN IF EXISTS "adminNotes";
--   ALTER TABLE "Order" DROP COLUMN IF EXISTS "paymentMethod";
--   ALTER TABLE "Order" DROP COLUMN IF EXISTS "paymentReceivedAt";
--   ALTER TABLE "Order" DROP COLUMN IF EXISTS "whatsappConfirmedAt";
--   ALTER TABLE "Order" DROP COLUMN IF EXISTS "whatsappSentAt";
--   UPDATE "Order" SET status = 'PENDING' WHERE status = 'PENDING_WHATSAPP';
