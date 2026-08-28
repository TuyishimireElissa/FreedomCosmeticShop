# PHASE 0 — DISASTER RECOVERY AUDIT: DAILY BACKUP SYSTEM

**Date:** 2026-08-26 · **Local HEAD:** `f5a4b68` (== deployed, state READY)
**Scope:** read-only. No file modified, no database touched. Verified live against GitHub API.

---

## 1. EXISTING BACKUP CODE & SNAPSHOTS (measured)

| Item | Status |
|---|---|
| `scripts/backup-catalogue.ts` (`npm run catalog:backup`) | **EXISTS** — read-only SELECT-only catalogue backup (Category, Brand, Product, DeliveryZoneSettings, StoreSettings, Coupon) → `backups/catalogue-latest.json` + `.csv` |
| `backups/` directory | EXISTS — `catalogue-latest.json` (702 KB), `catalogue-latest.csv` (42 KB), both **committed to the public repo** |
| Timestamped daily snapshots | NONE — no date-based files, no retention logic anywhere |
| `scripts/restore-full-store.ts` / `store:restore` | DOES NOT EXIST |
| `/backups` admin page or API | DOES NOT EXIST |

**The existing script already gets the hard things right** (worth reusing, not duplicating):
- Uses `DIRECT_URL || DATABASE_URL` (port 5432) — the correct workaround for the pgbouncer `prepared statement "s0" already exists` trap.
- Documented its own privacy decision: **no orders/users/reviews** — "plaintext customer data in a git repository is a privacy liability" (written after the 2026-08-20 data-loss incident, see `DATABASE_INCIDENT_2026-08-20.md`).
- `.gitignore` already ignores timestamped catalogue copies (`/backups/catalogue-*T*.json`); only `catalogue-latest.*` is committed.

**Gap it does not close:** no ProductImage rows (it embeds only the `images` JSON array on Product), no Orders/OrderItems/Users (deliberate), no Cloudinary manifest file, no restore path, no automation.

## 2. REQUESTED MODELS vs SCHEMA — all 11 exist ✓

Product, ProductImage, Category, Brand, Order, OrderItem, User, Coupon, DeliveryZoneSettings, StoreSettings, SearchLog — all confirmed in `prisma/schema.prisma` (44 models total).

**Findings that affect the design:**

- **Images live in TWO places** (backup must capture both or manifest is incomplete):
  1. `Product.images` — legacy JSON string array (never migrated out)
  2. `ProductImage` table — 314 rows: `productId, publicId, url, altText, altTextRw, imageType, sortOrder, isPrimary`
- **Product** has ~30 scalar fields (name/nameRw/description/descriptionRw/shortDescription×2, price, wholesalePrice, compareAt, **costPrice** (admin margin — commercially sensitive), stock, lowStockThreshold, sku, realSku, barcode, supplierId, manufacturedDate, expiryDate, periodAfterOpening, batchNumber, volume, volumeMl, weightGrams, images, videoUrl, …).
- **Category** has `nameRw` + `parentId` hierarchy ✓ (as the brief requires).
- **User** has `passwordHash` (exclude ✓) but also **`mfaSecret` and `mfaBackupCodes`** (plaintext usable — **more sensitive than the hash**; exclude these too), plus `lastLoginIp/Device` (PII). The brief says "without password hashes or raw secrets" — the design will drop `passwordHash, mfaSecret, mfaBackupCodes` and store a boolean `hasPassword` instead.
- **Order** carries full customer PII: `customerName, customerPhone, customerEmail, address, district, sector, notes`. OrderItem references it.

## 3. GITHUB ACTIONS — NO CRON, NEVER USED

- `.github/workflows/` **does not exist**; GitHub API confirms **0 workflows**. This repo deploys via Vercel git integration only; CI/Actions has never run here.
- Repo is **public** (`visibility: public`). Everything a workflow commits is world-readable. GitHub Actions is free on public repos (zero cost ✓).
- Actions secrets could **not** be listed with the current token (`Resource not accessible by personal access token`): **the owner must add `DATABASE_URL` + `DIRECT_URL` as repo secrets manually** (or supply an admin-scope token). This is a hard prerequisite for Phase 3.

## 4. EXISTING INFRASTRUCTURE REUSE

- `/api/health` **already exists** (`SELECT 1` ping; returns `{status:'ok', database:'connected'}`) — ready for the keep-alive step.
- Cloudinary: `CLOUDINARY_*` env vars in `.env.example`; `publicId` + `url` already stored per image in `ProductImage` — a manifest is derivable with zero API calls (no new packages, no extra cost).
- Prisma schema is versioned in git → "environment schema" can be captured as a redacted env-var inventory + `prisma/schema.prisma` SHA-256 (drift detection, zero secrets).

## 5. OPEN QUESTIONS FOR THE OWNER (block Phase 1/2 decisions)

1. **Public-repo PII conflict (highest priority).** The committed snapshot lives in a PUBLIC repo. Orders + Users contain real customer names, phone numbers and addresses; Product contains `costPrice` (your margin). Existing code deliberately excludes these. Options:
   - **A (recommended):** committed `latest-snapshot.json` = catalogue + PII **masked** (phones→`+2507******`, names/addresses anonymized, `costPrice` dropped); the **full** snapshot (with PII, unmasked) is uploaded as a **workflow artifact** (private to repo members) and/or downloaded by you. Two-tier: full local, safe remote.
   - **B:** full PII in the public repo (not recommended; one leaked link exposes every customer).
   - **C:** no PII at all anywhere (orders/users stored as counts only) — simplest, weakest DR for orders.
2. **GitHub secrets:** owner must add `DATABASE_URL` + `DIRECT_URL` to repo Secrets (Actions) — Vercel env vars do not carry over. Need your confirmation + the secrets added before Phase 3 can be enabled.
3. **GitHub Actions may need one manual enable** in repo Settings → Actions → Allow (default is usually allow for public repos, but no workflow has ever run here).
4. Brief says recipient orders run daily at `0 0 * * *` UTC = **02:00 Kigali** — confirm that's fine (or prefer e.g. 01:00 UTC = 03:00 KAT to avoid midnight traffic).
5. `restore` writes to the live DB — Phase 2 will require `--confirm` (as specified) and, per the repo rule, restore will run only against a target you name; **nothing is ever written without your approval**.

## 6. PHASE-BY-PHASE NOTES (design constraints already known)

- Phase 1: reuse `DIRECT_URL || DATABASE_URL`; two-tier output (full local + sanitized committed); `.gitignore` needs `/backups/snapshot-*.json` added; retention = keep 30 `snapshot-YYYY-MM-DD.json` locally; on CI only `latest-snapshot.json` persists (retention needs the workflow to prune remote history or accept git history growth — flagging).
- Phase 2: restore order per brief (Settings → DeliveryZones → Categories → Brands → Products → ProductImages → Coupons → Users); uses Prisma Client writes; **no schema changes** (schema restore = `prisma db push` only when strictly needed, per repo rule; never `migrate dev`).
- Phase 3: workflow must read `DATABASE_URL` + `DIRECT_URL` secrets; commit-back uses `GITHUB_TOKEN` (needs `contents: write` permission); keep-alive = `curl /api/health`.
- Phase 4: `/admin/system-backups` behind existing `AdminAuthGuard` + `requirePermission`; all UI through existing i18n (en+rw); fcs-* tokens only.
- Phase 5: tests in `src/lib/__tests__/system-backups.test.ts` following existing source-reading test style + mutation-testing.

---

PHASE 0 AUDIT COMPLETE — Awaiting approval for Backup System.
