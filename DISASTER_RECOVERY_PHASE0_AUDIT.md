# PHASE 0 — DISASTER RECOVERY AUDIT

**Date:** 2026-08-26 · **HEAD:** `4128cc6` · **Scope:** read-only, nothing modified.

---

## 🔴 STOP — ONE BLOCKER BEFORE ANY CODE

**The GitHub repository is PUBLIC.** Verified via the GitHub API:

```
private: False   size: 4859 KB   default branch: main
```

The brief asks the daily job to **commit the snapshot back to the repository**,
and asks that snapshot to contain **Users, Orders and OrderItems**.

On a public repo that publishes, to the open internet, permanently, in git
history:

| Model | Fields that would go public |
|---|---|
| `User` | `name`, `email`, `phone`, `lastLoginIp`, `lastLoginDevice`, `businessPhone`, `businessAddress`, `mfaBackupCodes` |
| `Order` | `customerName`, `customerPhone`, `customerEmail`, `address`, `notes` |

Safety rule 3 says "do not log or commit raw secrets". This is worse than a
secret — a leaked key can be rotated, **a customer's phone number and home
address cannot be un-published.** Git history keeps it even after deletion.

There is currently 1 user and 1 order, so the blast radius today is small. It
will not stay small.

**Three ways forward — I need you to pick one:**

| Option | What happens |
|---|---|
| **A. Artifact only (recommended)** | Snapshot uploaded as a GitHub Actions **artifact** (private, 90-day retention), never committed. Full data including Users/Orders. Nothing new is published. |
| **B. Split** | Catalogue snapshot (products, categories, brands — no PII) committed publicly as today; a second full snapshot with PII kept as a private artifact. |
| **C. Make the repo private** | Then committing is safe. Free GitHub Actions minutes drop from unlimited to 2,000/month — still far more than a daily 1-minute job needs. |

I will not write Phase 1 or Phase 3 until you choose. **Do not pick "commit
everything publicly" without understanding it is irreversible.**

---

## 1. Existing backup scripts and snapshots

### `scripts/backup-catalogue.ts` — exists, runs via `npm run catalog:backup`

| Covers | Does **not** cover |
|---|---|
| Category (17) · Brand (6) · Product (108) · DeliveryZoneSettings (5) · Coupon (2) · StoreSettings (1) | ProductImage · User · Order · OrderItem · SearchLog · and 52 other models |

Writes `backups/catalogue-<timestamp>.json`, `catalogue-latest.json`, and a
`.csv`. **No retention logic** — old timestamped files accumulate until deleted
by hand.

### Snapshot files on disk

```
backups/catalogue-latest.json     688 KB   ← committed to git
backups/catalogue-latest.csv       42 KB   ← committed to git
backups/catalogue-2026-08-20T*.json  3 files, 6-8 KB   ← gitignored
```

`.gitignore:68` excludes `/backups/catalogue-*T*.json`, so only the `latest`
pair is tracked. That was a deliberate, good decision.

### ⚠️ The committed snapshot is 117 hours old

Newest timestamp inside `catalogue-latest.json` is **2026-08-21T19:58Z — 4.9
days stale.** Backups are **manual only**; nothing schedules them. This is the
single most important gap and the brief is right to attack it.

**It is also missing every price change and content edit made since 21 Aug.**

### Other relevant scripts

`recovery-to-import.ts` · `import-real-products.ts` · `apply-image-matches.ts` ·
`export-missing-prices.ts` · `seed.ts` · `snapshot-featured-flags.ts`.
**There is no restore script.** `import-real-products.ts` is the closest thing
and it is an importer, not a disaster restore.

---

## 2. Models needing backup

All **11 models the brief names exist**. Nothing in that list is wrong.

**But the schema has 63 models, and the brief's 11 miss 425 live rows:**

| In the brief (499 rows) | **Missed by the brief (425 rows)** |
|---|---|
| productImage 314 · product 108 · searchLog 43 · category 17 · brand 6 · deliveryZoneSettings 5 · coupon 2 · user 1 · order 1 · orderItem 1 · storeSettings 1 | **analyticsEvent 287** · activityLog 51 · adminActivityLog 51 · visitorSession 16 · authSession 14 · whatsAppClick 4 · failedLoginAttempt 2 |

45 of 63 tables are empty today.

**My read:** most of the missed rows are *telemetry*, not business state.
Losing `analyticsEvent` or `visitorSession` costs you a chart. Losing
`activityLog`/`adminActivityLog` (102 rows) costs you your **audit trail**,
which matters after a security incident. `authSession` and `failedLoginAttempt`
should deliberately **not** be restored — stale sessions are a security hole.

**Recommendation:** back up the brief's 11 **plus** `activityLog` and
`adminActivityLog`. Explicitly exclude `authSession`, `failedLoginAttempt`,
`mfaVerification`, `otpVerification`, `passwordResetLog` — restoring live
credentials/sessions from a snapshot is dangerous.

### Sensitive fields that must be stripped or hashed

`User.passwordHash`, `User.mfaSecret`, `User.mfaBackupCodes[]`,
`User.lastLoginIp`, `User.lastLoginDevice`.

The brief says "Users (without sensitive password hashes)" — correct instinct.
But note: **a restore that drops `passwordHash` locks the owner out.** The
restore script must handle this (force `mustChangePassword`, or keep hashes and
never publish the file — which points back to Option A).

---

## 3. GitHub Actions

**There is no `.github/` directory at all.** No workflows, no cron, nothing.
Phase 3 would create the first one. The brief is correct here.

### ⚠️ But a keep-alive cron ALREADY EXISTS

`vercel.json` already schedules three crons:

```json
{ "path": "/api/cron/review-requests",    "schedule": "0 8 * * *"  },
{ "path": "/api/cron/retention-reminders","schedule": "15 7 * * *" },
{ "path": "/api/health",                  "schedule": "30 8 * * *" }
```

`/api/health` is live and healthy: **HTTP 200 in 0.55s → `{"status":"ok","database":"connected"}`**

**Phase 3's keep-alive step would duplicate a job that already runs daily.**
Harmless but redundant. I recommend dropping it and noting the existing one, or
keeping it only as a cheap cross-provider redundancy if Vercel crons fail
silently.

---

## Other findings worth your attention

**Cloudinary manifest is mostly sound, with one caveat.** 314 image rows, all
314 have a `publicId`. 310 are real `/image/upload/` assets in your account; **4
are `/image/fetch/` proxies of remote URLs** that are *not* stored in your
Cloudinary account. A manifest cannot restore those four — if the remote host
disappears, the image is gone. The manifest should flag them, not pretend
they're safe.

**Git history growth.** A 700 KB snapshot committed daily is ~250 MB/year of
near-identical blobs, permanently in history. Artifacts (Option A) avoid this
entirely. If you insist on committing, commit only on *change* (compare a hash)
rather than every night.

**"Zero-cost" holds.** Public repo → unlimited free Actions minutes. Private →
2,000 min/month, and this job needs ~1 min/day (~30/month). Either way, free.

**No new npm packages needed.** Prisma, `node:fs`, `node:path`, `node:crypto`
cover everything. `tsx` is already a dependency and every script uses it.

**Safety rules 1, 5, 6, 8 (fonts, CSS tokens, mobile, bundle) apply only to
Phase 4's admin page.** Phases 1-3 are Node scripts and YAML with zero
front-end impact. Current shared JS is 103 kB and Phase 4 must not move it —
the page should be a lightweight client component reusing existing patterns.

---

## Questions I need answered before Phase 1

1. **Public-repo blocker — Option A, B, or C?** (I recommend **A**.)
2. **Include `activityLog` + `adminActivityLog`** in the backup? (I recommend yes.)
3. **`passwordHash` — keep it** (so a restore actually restores login) **or strip
   it** (so the file is safer)? This is only a real dilemma under Option B/C;
   under Option A, keep it.
4. Retention: brief says 30 daily snapshots. Under Option A, GitHub artifacts
   cap at **90 days** and are pruned automatically — should I match 30 or use 90?

---

## Compliance

| Rule | Status |
|---|---|
| 1. No web fonts | N/A this phase — nothing touched |
| 2. No new npm packages | None required; confirmed |
| 3. No secrets committed | **BLOCKER RAISED — see top** |
| 4. Don't touch cart/auth/wholesale/payment | Untouched; restore script must also skip `authSession` |
| 5. `fcs-*` tokens only | Applies to Phase 4 only |
| 6. Mobile-first 360px | Applies to Phase 4 only |
| 7. Audit first, wait for approval | **Nothing modified. `git diff` is empty.** |
| 8. Shared JS ≤ 103 kB | Currently 103 kB; Phases 1-3 cannot affect it |

---

**PHASE 0 AUDIT COMPLETE — Awaiting approval for Backup System.**
