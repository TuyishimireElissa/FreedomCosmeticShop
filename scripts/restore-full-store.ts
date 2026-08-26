/**
 * Disaster restore from a full-store snapshot.
 *
 *   npm run store:restore -- --dry-run                 inspect, change nothing
 *   npm run store:restore -- --confirm                 restore latest-snapshot.json
 *   npm run store:restore -- --file=backups/snapshot-2026-08-26.json --confirm
 *   npm run store:restore -- --confirm --include-private
 *
 * ─── WHY THIS IS THE MOST DANGEROUS FILE IN THE REPO ─────────────────────
 *
 * On 2026-08-20 a Supabase project was deleted and 11 orders and 6 customers
 * were lost. This script exists so that never happens again — but a restore
 * run against the WRONG database, or against a live database that is merely
 * having a bad day, would itself be the disaster. So it is built to refuse
 * first and act second:
 *
 *   1. DRY RUN IS THE DEFAULT. Without --confirm it prints a plan and exits.
 *      There is no way to "accidentally" restore by forgetting a flag; you
 *      have to add one.
 *
 *   2. IT NEVER DELETES. Every write is an upsert keyed on a natural unique
 *      column (slug, name, code, zoneCode). A restore onto a populated
 *      database heals missing rows and refreshes existing ones. It will not
 *      truncate a table that happens to have more data than the snapshot.
 *
 *   3. PRICES ARE OPT-IN. `price` and `wholesalePrice` are NOT written unless
 *      --restore-prices is passed. 97 of 108 products are currently unpriced
 *      and the owner is collecting real prices by hand over WhatsApp; a
 *      restore from a stale snapshot silently reverting that work would undo
 *      days of effort. Filling blanks is safe; overwriting money is not.
 *
 *   4. IT VERIFIES BEFORE IT TRUSTS. Structure, schemaVersion, row counts and
 *      the sha256 sidecar are all checked before a single row is written.
 *
 *   5. DEPENDENCY ORDER IS ENFORCED, not assumed:
 *        StoreSettings -> DeliveryZones -> Categories (2 passes for the
 *        self-referencing parentId) -> Brands -> Products -> ProductImages
 *        -> Coupons -> [private: Users -> Orders -> OrderItems]
 *
 *   6. CREDENTIALS CANNOT BE RESTORED. The backup strips passwordHash by
 *      design, so restored users are flagged mustChangePassword rather than
 *      silently left with no way in. authSession is never touched: handing
 *      back week-old sessions the owner had revoked would be a security hole.
 *
 * No new npm packages: Prisma plus node:fs / node:path / node:crypto.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const OUT_DIR = join(process.cwd(), 'backups')
const SUPPORTED_SCHEMA_VERSIONS = [1]

const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(`--${name}`)
const getArg = (name: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

const confirmed = hasFlag('confirm')
const dryRun = !confirmed
const includePrivate = hasFlag('include-private')
const restorePrices = hasFlag('restore-prices')
const filePath = getArg('file') || join(OUT_DIR, 'latest-snapshot.json')

interface Counts { [key: string]: number }
interface Snapshot {
  schemaVersion?: number
  tier?: string
  backupAt?: string
  counts?: Counts
  categories?: Array<Record<string, unknown>>
  brands?: Array<Record<string, unknown>>
  products?: Array<Record<string, unknown>>
  productImages?: Array<Record<string, unknown>>
  deliveryZones?: Array<Record<string, unknown>>
  coupons?: Array<Record<string, unknown>>
  storeSettings?: Array<Record<string, unknown>>
}

/** Money and audit columns that a restore must not silently rewrite. */
const PRICE_FIELDS = ['price', 'wholesalePrice', 'compareAt', 'costPrice'] as const
/** Never write these: Prisma manages them, or they belong to another table. */
const NEVER_WRITE = ['createdAt', 'updatedAt', 'category', 'brand', 'supplier', 'productImages', 'parent', 'children'] as const

function omit<T extends Record<string, unknown>>(row: T, keys: readonly string[]) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) if (!keys.includes(k)) out[k] = v
  return out
}

/** ISO strings must go back to Date objects or Prisma rejects them. */
const DATE_FIELD = /(At|Date)$/
function reviveDates(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'string' && DATE_FIELD.test(k) && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : v
  }
  return out
}

export interface ValidationResult { ok: boolean; errors: string[]; warnings: string[] }

/**
 * Reject a malformed or foreign snapshot before it touches the database.
 * Exported so tests can drive it without a database connection.
 */
export function validateSnapshot(raw: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Snapshot is not a JSON object.'], warnings }
  }
  const snap = raw as Snapshot

  if (typeof snap.schemaVersion !== 'number') {
    errors.push('Missing schemaVersion — this file was not produced by backup-full-store.ts.')
  } else if (!SUPPORTED_SCHEMA_VERSIONS.includes(snap.schemaVersion)) {
    errors.push(`schemaVersion ${snap.schemaVersion} is not supported (expected ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}).`)
  }

  if (snap.tier !== 'public' && snap.tier !== 'private') {
    errors.push(`Unknown tier ${JSON.stringify(snap.tier)} — expected "public" or "private".`)
  }
  if (!snap.backupAt || Number.isNaN(Date.parse(String(snap.backupAt)))) {
    errors.push('Missing or unparseable backupAt timestamp.')
  }

  if (snap.tier === 'public') {
    for (const key of ['categories', 'brands', 'products', 'productImages'] as const) {
      if (!Array.isArray(snap[key])) errors.push(`Missing or non-array "${key}".`)
    }
    // An empty catalogue is almost always a broken export, not a real shop.
    if (Array.isArray(snap.products) && snap.products.length === 0) {
      errors.push('Snapshot contains zero products. Refusing to restore an empty catalogue.')
    }
    // Counts must agree with the arrays, or the file was truncated.
    if (snap.counts) {
      for (const [key, expected] of Object.entries(snap.counts)) {
        const actual = Array.isArray((snap as Record<string, unknown>)[key])
          ? ((snap as Record<string, unknown>)[key] as unknown[]).length
          : null
        if (actual !== null && actual !== expected) {
          errors.push(`counts.${key} says ${expected} but the array holds ${actual} — file looks truncated.`)
        }
      }
    }
    // Referential sanity: every product must point at a category in this file.
    const slugs = new Set((snap.categories || []).map((c) => String(c.id)))
    const orphans = (snap.products || []).filter((p) => !slugs.has(String(p.categoryId)))
    if (orphans.length > 0) {
      errors.push(`${orphans.length} product(s) reference a categoryId that is not in this snapshot.`)
    }
    const productIds = new Set((snap.products || []).map((p) => String(p.id)))
    const strayImages = (snap.productImages || []).filter((i) => !productIds.has(String(i.productId)))
    if (strayImages.length > 0) {
      warnings.push(`${strayImages.length} image(s) reference a product not in this snapshot; they will be skipped.`)
    }
    // Suppliers are not backed up, so a supplierId cannot be honoured.
    const withSupplier = (snap.products || []).filter((p) => p.supplierId)
    if (withSupplier.length > 0) {
      warnings.push(`${withSupplier.length} product(s) carry a supplierId; suppliers are not in the backup, so it will be cleared.`)
    }
  }

  const age = snap.backupAt ? (Date.now() - Date.parse(String(snap.backupAt))) / 36e5 : null
  if (age !== null && age > 48) {
    warnings.push(`Snapshot is ${age.toFixed(0)} hours old. Anything changed since then will be lost or reverted.`)
  }

  return { ok: errors.length === 0, errors, warnings }
}

/** Verify the sha256 sidecar if one exists beside the snapshot. */
export function verifyChecksum(body: string, sidecarPath: string): { checked: boolean; ok: boolean; expected?: string; actual: string } {
  const actual = createHash('sha256').update(body).digest('hex')
  if (!existsSync(sidecarPath)) return { checked: false, ok: true, actual }
  const expected = readFileSync(sidecarPath, 'utf8').trim().split(/\s+/)[0]
  return { checked: true, ok: expected === actual, expected, actual }
}

async function main() {
  console.log('')
  console.log(dryRun ? '  DRY RUN — nothing will be written' : '  LIVE RESTORE — the database WILL be modified')
  console.log(`  file: ${filePath.replace(process.cwd() + '/', '')}`)

  if (!existsSync(filePath)) {
    throw new Error(`No snapshot at ${filePath}. Run "npm run backup:store" first, or pass --file=<path>.`)
  }

  const body = readFileSync(filePath, 'utf8')
  const sidecar = filePath.endsWith('latest-snapshot.json')
    ? join(OUT_DIR, 'latest-snapshot.sha256')
    : `${filePath}.sha256`
  const sum = verifyChecksum(body, sidecar)
  if (sum.checked && !sum.ok) {
    throw new Error(`Checksum mismatch. Expected ${sum.expected?.slice(0, 16)}… got ${sum.actual.slice(0, 16)}…. The file is corrupt or was edited; refusing to restore.`)
  }
  console.log(`  sha256: ${sum.actual.slice(0, 16)}…${sum.checked ? ' (verified)' : ' (no sidecar to check against)'}`)

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch (error) {
    throw new Error(`Snapshot is not valid JSON: ${error instanceof Error ? error.message : 'parse error'}`)
  }

  const check = validateSnapshot(parsed)
  for (const warning of check.warnings) console.log(`  WARNING: ${warning}`)
  if (!check.ok) {
    console.error('')
    for (const problem of check.errors) console.error(`  INVALID: ${problem}`)
    throw new Error('Snapshot failed validation. Nothing was written.')
  }

  const snap = parsed as Snapshot
  console.log(`  taken:  ${snap.backupAt}`)
  console.log('')
  console.log('  plan')
  for (const [key, value] of Object.entries(snap.counts || {})) console.log(`    ${key.padEnd(20)} ${value}`)
  console.log(`    prices               ${restorePrices ? 'WILL BE OVERWRITTEN (--restore-prices)' : 'preserved (pass --restore-prices to include)'}`)

  if (dryRun) {
    console.log('')
    console.log('  Nothing written. Re-run with --confirm to apply.')
    return
  }

  // ─── Live database sanity check ───────────────────────────────────────
  const liveProducts = await prisma.product.count()
  console.log('')
  console.log(`  target database currently holds ${liveProducts} product(s)`)

  const restored: Counts = {}
  const bump = (key: string) => { restored[key] = (restored[key] || 0) + 1 }

  // 1. StoreSettings
  for (const row of snap.storeSettings || []) {
    const data = reviveDates(omit(row, NEVER_WRITE))
    await prisma.storeSettings.upsert({
      where: { id: String(row.id) },
      create: data as never,
      update: omit(data, ['id']) as never,
    })
    bump('storeSettings')
  }

  // 2. DeliveryZoneSettings — keyed on zoneCode
  for (const row of snap.deliveryZones || []) {
    const data = reviveDates(omit(row, NEVER_WRITE))
    await prisma.deliveryZoneSettings.upsert({
      where: { zoneCode: String(row.zoneCode) },
      create: data as never,
      update: omit(data, ['id']) as never,
    })
    bump('deliveryZones')
  }

  // 3. Categories — two passes so a self-referencing parentId always resolves.
  for (const row of snap.categories || []) {
    const data = reviveDates(omit(row, [...NEVER_WRITE, 'parentId']))
    await prisma.category.upsert({
      where: { slug: String(row.slug) },
      create: data as never,
      update: omit(data, ['id']) as never,
    })
    bump('categories')
  }
  for (const row of snap.categories || []) {
    if (!row.parentId) continue
    await prisma.category.update({ where: { slug: String(row.slug) }, data: { parentId: String(row.parentId) } })
  }

  // 4. Brands
  for (const row of snap.brands || []) {
    const data = reviveDates(omit(row, NEVER_WRITE))
    await prisma.brand.upsert({
      where: { slug: String(row.slug) },
      create: data as never,
      update: omit(data, ['id']) as never,
    })
    bump('brands')
  }

  // 5. Products
  const liveCategoryIds = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id))
  const liveBrandIds = new Set((await prisma.brand.findMany({ select: { id: true } })).map((b) => b.id))
  let skippedProducts = 0

  for (const row of snap.products || []) {
    if (!liveCategoryIds.has(String(row.categoryId))) { skippedProducts++; continue }
    const cleaned = omit(row, NEVER_WRITE)
    // Suppliers are not in the backup; a stale id would fail the FK.
    cleaned.supplierId = null
    if (cleaned.brandId && !liveBrandIds.has(String(cleaned.brandId))) cleaned.brandId = null
    const data = reviveDates(restorePrices ? cleaned : omit(cleaned, PRICE_FIELDS))
    await prisma.product.upsert({
      where: { slug: String(row.slug) },
      create: reviveDates(cleaned) as never, // a NEW product needs its price, or it is unsellable
      update: omit(data, ['id']) as never,
    })
    bump('products')
  }
  if (skippedProducts > 0) console.log(`  skipped ${skippedProducts} product(s) whose category is missing`)

  // 6. ProductImages — keyed on the stable Cloudinary publicId
  const liveProductIds = new Set((await prisma.product.findMany({ select: { id: true } })).map((p) => p.id))
  let skippedImages = 0
  for (const row of snap.productImages || []) {
    if (!liveProductIds.has(String(row.productId))) { skippedImages++; continue }
    const data = reviveDates(omit(row, NEVER_WRITE))
    const existing = await prisma.productImage.findFirst({
      where: { productId: String(row.productId), publicId: String(row.publicId) },
      select: { id: true },
    })
    if (existing) await prisma.productImage.update({ where: { id: existing.id }, data: omit(data, ['id']) as never })
    else await prisma.productImage.create({ data: data as never })
    bump('productImages')
  }
  if (skippedImages > 0) console.log(`  skipped ${skippedImages} image(s) whose product is missing`)

  // 7. Coupons — keyed on code
  for (const row of snap.coupons || []) {
    const data = reviveDates(omit(row, NEVER_WRITE))
    await prisma.coupon.upsert({
      where: { code: String(row.code) },
      create: data as never,
      update: omit(data, ['id']) as never,
    })
    bump('coupons')
  }

  // 8. Private tier — opt-in, and users always land needing a new password.
  if (includePrivate) {
    const privatePath = filePath.replace(/\.json$/, '.private.json')
    if (!existsSync(privatePath)) {
      console.log(`  no private snapshot at ${privatePath.replace(process.cwd() + '/', '')} — skipping users and orders`)
    } else {
      const priv = JSON.parse(readFileSync(privatePath, 'utf8')) as { users?: Array<Record<string, unknown>>; orders?: Array<Record<string, unknown>>; orderItems?: Array<Record<string, unknown>> }
      for (const row of priv.users || []) {
        const data = reviveDates(omit(row, NEVER_WRITE))
        // passwordHash was stripped at backup time, so force a reset rather
        // than creating an account nobody can sign into.
        data.mustChangePassword = true
        await prisma.user.upsert({
          where: { phone: String(row.phone) },
          create: data as never,
          update: omit(data, ['id']) as never,
        })
        bump('users')
      }
      for (const row of priv.orders || []) {
        const data = reviveDates(omit(row, [...NEVER_WRITE, 'items', 'payment', 'delivery']))
        await prisma.order.upsert({
          where: { id: String(row.id) },
          create: data as never,
          update: omit(data, ['id']) as never,
        })
        bump('orders')
      }
      const liveOrderIds = new Set((await prisma.order.findMany({ select: { id: true } })).map((o) => o.id))
      for (const row of priv.orderItems || []) {
        if (!liveOrderIds.has(String(row.orderId))) continue
        const data = reviveDates(omit(row, NEVER_WRITE))
        await prisma.orderItem.upsert({
          where: { id: String(row.id) },
          create: data as never,
          update: omit(data, ['id']) as never,
        })
        bump('orderItems')
      }
      console.log('  users restored with mustChangePassword = true (backups never carry password hashes)')
    }
  }

  console.log('')
  console.log('  restored')
  for (const [key, value] of Object.entries(restored)) console.log(`    ${key.padEnd(20)} ${value}`)
  if (!restorePrices) console.log('    prices were NOT modified on existing products')
  console.log('')
  console.log('  Done.')
}

const invokedDirectly = process.argv[1] ? /restore-full-store\.ts$/.test(process.argv[1]) : false

if (invokedDirectly) {
  main()
    .catch((error) => {
      console.error('')
      console.error(`  Restore aborted: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export { omit, reviveDates, PRICE_FIELDS, NEVER_WRITE, SUPPORTED_SCHEMA_VERSIONS }
