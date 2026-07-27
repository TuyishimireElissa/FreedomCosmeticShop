-- Idempotent production hardening applied before the matching application deploy.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "rememberDevice" BOOLEAN NOT NULL DEFAULT FALSE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX IF NOT EXISTS "AuthSession_revokedAt_idx" ON "AuthSession"("revokedAt");

-- Clear demonstrably invalid sale metadata rather than inventing an original price.
UPDATE "Product"
SET "compareAt" = NULL
WHERE "compareAt" IS NOT NULL AND "compareAt" <= "price";

-- Reconcile cancelled orders that still have pending operational children.
UPDATE "Payment"
SET "status" = 'FAILED', "failureReason" = COALESCE("failureReason", 'Order cancelled')
WHERE "status" = 'PENDING'
  AND "orderId" IN (SELECT "id" FROM "Order" WHERE "status" = 'CANCELLED');

UPDATE "Delivery"
SET "status" = 'FAILED', "failureReason" = COALESCE("failureReason", 'Order cancelled')
WHERE "status" <> 'DELIVERED'
  AND "orderId" IN (SELECT "id" FROM "Order" WHERE "status" = 'CANCELLED');
