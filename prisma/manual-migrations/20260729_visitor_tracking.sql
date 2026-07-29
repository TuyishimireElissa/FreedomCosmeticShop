-- Idempotent additive migration applied before the matching application deploy.
-- Adds anonymous live-visitor tracking. No existing table is altered.
--
-- VisitorSession stores no raw IP: sessionHash is an HMAC of the client session
-- id and networkHash is the same daily-rotating hash AnalyticsEvent already uses.

CREATE TABLE IF NOT EXISTS "VisitorSession" (
  "id"          TEXT PRIMARY KEY,
  "sessionHash" TEXT NOT NULL UNIQUE,
  "networkHash" TEXT,
  "country"     TEXT,
  "countryCode" TEXT,
  "ipProvince"  TEXT,
  "ipDistrict"  TEXT,
  "device"      TEXT,
  "browser"     TEXT,
  "referrer"    TEXT,
  "currentPath" TEXT,
  "pageViews"   INTEGER NOT NULL DEFAULT 1,
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "VisitorSession_lastSeenAt_idx" ON "VisitorSession"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "VisitorSession_startedAt_idx" ON "VisitorSession"("startedAt");
CREATE INDEX IF NOT EXISTS "VisitorSession_ipDistrict_idx" ON "VisitorSession"("ipDistrict");

-- Sector, cell and village exist only here: they cannot be derived from an IP.
CREATE TABLE IF NOT EXISTS "VisitorLocation" (
  "id"          TEXT PRIMARY KEY,
  "sessionId"   TEXT NOT NULL UNIQUE REFERENCES "VisitorSession"("id") ON DELETE CASCADE,
  "province"    TEXT NOT NULL,
  "district"    TEXT NOT NULL,
  "sector"      TEXT,
  "cell"        TEXT,
  "village"     TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "VisitorLocation_province_district_idx"
  ON "VisitorLocation"("province", "district");
