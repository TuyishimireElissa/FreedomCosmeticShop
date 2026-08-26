/**
 * Full-store disaster recovery snapshot.
 *
 *   npm run backup:store
 *
 * Writes backups/snapshot-YYYY-MM-DD.json plus backups/latest-snapshot.json,
 * and keeps the newest 30 daily files.
 *
 * ─── WHY THIS EXISTS ─────────────────────────────────────────────────────
 *
 * On 2026-08-20 a Supabase project was deleted and 11 orders and 6 customers
 * were lost for good. The catalogue survived only because someone had run a
 * manual export. `scripts/backup-catalogue.ts` still exists and still works,
 * but it covers 6 models and nothing schedules it — at the time of writing the
 * committed copy was 117 hours old. This script is the wider, automatable one.
 *
 * ─── SECURITY: THE REPOSITORY IS PUBLIC ──────────────────────────────────
 *
 * Verified 2026-08-26: github.com/TuyishimireElissa/FreedomCosmeticShop has
 * `private: false`. A snapshot contains customer names, phone numbers, email
 * addresses and home delivery addresses. A leaked API key can be rotated; a
 * customer's home address published to git history cannot be un-published.
 *
 * So this script defends itself rather than trusting the caller:
 *
 *   1. Two output tiers.
 *        PUBLIC tier  — catalogue only, zero personal data. Safe to commit.
 *        PRIVATE tier — adds User / Order / OrderItem / audit logs.
 *      The private tier is written ONLY when --include-private is passed, and
 *      the file is named *.private.json so .gitignore can exclude it by shape.
 *
 *   2. Credential fields are dropped even in the private tier:
 *      passwordHash, mfaSecret, mfaBackupCodes, lastLoginIp, lastLoginDevice.
 *      A restore therefore cannot resurrect a password — restore-full-store.ts
 *      sets mustChangePassword instead. Backups should not be a credential
 *      store.
 *
 *   3. A final scan walks the serialized PUBLIC payload looking for phone and
 *      email shapes. If it finds any, the script exits non-zero and writes
 *      nothing. Belt and braces: if a future schema change adds a phone column
 *      to Product, this fails loudly instead of leaking quietly.
 *
 * ─── WHAT IS DELIBERATELY NOT BACKED UP ──────────────────────────────────
 *
 * authSession, failedLoginAttempt, mfaVerification, otpVerification and
 * passwordResetLog are live security state, not business data. Restoring a
 * week-old session table would hand back sessions the owner had revoked.
 *
 * analyticsEvent (287 rows) and visitorSession (16) are telemetry: losing them
 * costs a chart, and including them would dominate the file. activityLog and
 * adminActivityLog ARE included in the private tier — after an incident the
 * audit trail is the first thing anyone asks for.
 *
 * No new npm packages: Prisma plus node:fs / node:path / node:crypto.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const OUT_DIR = join(process.cwd(), 'backups')
const KEEP_DAILY = 30
const SCHEMA_VERSION = 1

const includePrivate = process.argv.includes('--include-private')
const quiet = process.argv.includes('--quiet')

function log(...args: unknown[]) {
  if (!quiet) console.log(...args)
}

/** Prisma Decimal and Date both need to survive JSON.stringify losslessly. */
function jsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof (value as { toNumber: unknown }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber()
  }
  if (Array.isArray(value)) return value.map(jsonSafe)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = jsonSafe(v)
    return out
  }
  return value
}

function stripKeys<T extends Record<string, unknown>>(row: T, keys: readonly string[]) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) if (!keys.includes(k)) out[k] = v
  return out
}

/**
 * Never let personal data reach the public tier.
 *
 * Rwandan mobile numbers are +2507XXXXXXXX. The email pattern is deliberately
 * broad. Cloudinary URLs and ISO timestamps are excluded from the phone match
 * so that long digit runs in an asset path do not trip it.
 */
/**
 * Rwandan mobile numbers appear in two forms and BOTH must be caught:
 *   international  +250 7XX XXX XXX  /  250 7XX XXX XXX
 *   local          07XX XXX XXX
 * Separators may be spaces or hyphens. The leading boundary stops a match
 * inside a longer digit run such as a Cloudinary version id (v1785526939).
 */
const PHONE_RE = /(?<!\d)(?:\+?25[0-9][\s-]?|0)7\d{2}[\s-]?\d{3}[\s-]?\d{3}(?!\d)/
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/

/**
 * The shop's OWN contact details are not personal data — they are printed on
 * the website, in the footer and on every WhatsApp share link. Excluding them
 * by exact value (rather than by loosening the pattern) keeps the guard sharp:
 * a customer's number in the same column would still trip it.
 */
function allowedPublicContacts(storeSettings: Array<Record<string, unknown>>): string[] {
  const fields = ['storePhone', 'storeWhatsApp', 'storeEmail', 'supportEmail', 'supportPhone']
  const values: string[] = []
  for (const row of storeSettings) {
    for (const field of fields) {
      const value = row[field]
      if (typeof value === 'string' && value.trim()) values.push(value.trim())
    }
  }
  return values
}

function assertNoPersonalData(payload: unknown, label: string, allowed: string[] = []) {
  let text = JSON.stringify(payload)
  // Blank out the shop's own published contacts before scanning.
  for (const value of allowed) {
    if (!value) continue
    text = text.split(value).join('[store-contact]')
  }
  const phone = text.match(PHONE_RE)
  const email = text.match(EMAIL_RE)
  const problems: string[] = []
  if (phone) problems.push(`phone-shaped value ${JSON.stringify(phone[0])}`)
  if (email) problems.push(`email-shaped value ${JSON.stringify(email[0])}`)
  if (problems.length > 0) {
    throw new Error(
      `Refusing to write ${label}: it contains ${problems.join(' and ')}. ` +
      'The public tier must never carry personal data. If a new column ' +
      'legitimately holds this, move it to the private tier.',
    )
  }
}

async function main() {
  const startedAt = new Date()
  mkdirSync(OUT_DIR, { recursive: true })

  log('Reading catalogue…')

  // ─── PUBLIC TIER: catalogue only ───────────────────────────────────────
  const [categories, brands, products, productImages, deliveryZones, coupons, storeSettings] = await Promise.all([
    prisma.category.findMany({ orderBy: { slug: 'asc' } }),
    prisma.brand.findMany({ orderBy: { slug: 'asc' } }),
    prisma.product.findMany({ orderBy: { slug: 'asc' } }),
    prisma.productImage.findMany({ orderBy: [{ productId: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.deliveryZoneSettings.findMany(),
    prisma.coupon.findMany({ orderBy: { code: 'asc' } }),
    prisma.storeSettings.findMany(),
  ])

  // ─── CLOUDINARY MANIFEST ───────────────────────────────────────────────
  // /image/upload/ assets live in the Cloudinary account and can be recovered.
  // /image/fetch/ URLs are proxies of somebody else's server: if that host
  // disappears the image is gone and no manifest can bring it back. Say so in
  // the file rather than implying every row is safe.
  const manifest = productImages.map((image) => {
    const proxied = image.url.includes('/image/fetch/')
    return {
      productId: image.productId,
      publicId: image.publicId,
      url: image.url,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
      imageType: image.imageType,
      storage: proxied ? 'remote-proxy' : 'cloudinary-upload',
      recoverable: !proxied,
    }
  })
  const proxiedCount = manifest.filter((m) => !m.recoverable).length

  const publicPayload = {
    schemaVersion: SCHEMA_VERSION,
    tier: 'public' as const,
    backupAt: startedAt.toISOString(),
    generatedBy: 'scripts/backup-full-store.ts',
    contains: ['categories', 'brands', 'products', 'productImages', 'deliveryZones', 'coupons', 'storeSettings'],
    excludes: [
      'users, orders, orderItems and audit logs (personal data; use --include-private)',
      'authSession, failedLoginAttempt, mfaVerification, otpVerification, passwordResetLog (live security state)',
      'analyticsEvent, visitorSession, whatsAppClick, searchLog (telemetry)',
    ],
    counts: {
      categories: categories.length,
      brands: brands.length,
      products: products.length,
      productImages: productImages.length,
      deliveryZones: deliveryZones.length,
      coupons: coupons.length,
      storeSettings: storeSettings.length,
      cloudinaryProxied: proxiedCount,
    },
    cloudinaryManifest: manifest,
    categories: jsonSafe(categories),
    brands: jsonSafe(brands),
    products: jsonSafe(products),
    productImages: jsonSafe(productImages),
    deliveryZones: jsonSafe(deliveryZones),
    coupons: jsonSafe(coupons),
    storeSettings: jsonSafe(storeSettings),
  }

  // Fails the run rather than writing a leak. The shop's own published phone
  // and email are allowed through; anything else phone- or email-shaped stops
  // the backup.
  const storeContacts = allowedPublicContacts(storeSettings as unknown as Array<Record<string, unknown>>)
  assertNoPersonalData(publicPayload, 'the public snapshot', storeContacts)

  // ─── PRIVATE TIER: opt-in only ─────────────────────────────────────────
  const USER_SECRETS = ['passwordHash', 'mfaSecret', 'mfaBackupCodes', 'lastLoginIp', 'lastLoginDevice'] as const
  let privatePayload: Record<string, unknown> | null = null

  if (includePrivate) {
    log('Reading customers, orders and audit trail (private tier)…')
    const [users, orders, orderItems, activityLog, adminActivityLog] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.order.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.orderItem.findMany(),
      prisma.activityLog.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.adminActivityLog.findMany({ orderBy: { createdAt: 'asc' } }),
    ])

    privatePayload = {
      schemaVersion: SCHEMA_VERSION,
      tier: 'private',
      backupAt: startedAt.toISOString(),
      warning: 'CONTAINS PERSONAL DATA. Never commit. Never attach to a public issue.',
      redactedFields: USER_SECRETS,
      counts: {
        users: users.length,
        orders: orders.length,
        orderItems: orderItems.length,
        activityLog: activityLog.length,
        adminActivityLog: adminActivityLog.length,
      },
      users: jsonSafe(users.map((u) => stripKeys(u as unknown as Record<string, unknown>, USER_SECRETS))),
      orders: jsonSafe(orders),
      orderItems: jsonSafe(orderItems),
      activityLog: jsonSafe(activityLog),
      adminActivityLog: jsonSafe(adminActivityLog),
    }
  }

  // ─── WRITE ─────────────────────────────────────────────────────────────
  const day = startedAt.toISOString().slice(0, 10)
  const publicBody = JSON.stringify(publicPayload, null, 1)
  const checksum = createHash('sha256').update(publicBody).digest('hex')

  const dailyPath = join(OUT_DIR, `snapshot-${day}.json`)
  const latestPath = join(OUT_DIR, 'latest-snapshot.json')
  writeFileSync(dailyPath, publicBody, 'utf8')
  writeFileSync(latestPath, publicBody, 'utf8')

  // Checksum lives beside the file so a restore can prove the JSON was not
  // truncated by a half-finished upload or a full disk.
  writeFileSync(
    join(OUT_DIR, 'latest-snapshot.sha256'),
    `${checksum}  latest-snapshot.json\n`,
    'utf8',
  )

  if (privatePayload) {
    writeFileSync(join(OUT_DIR, `snapshot-${day}.private.json`), JSON.stringify(privatePayload, null, 1), 'utf8')
    writeFileSync(join(OUT_DIR, 'latest-snapshot.private.json'), JSON.stringify(privatePayload, null, 1), 'utf8')
  }

  // ─── RETENTION: keep the newest 30 daily files ─────────────────────────
  // Only files this script owns are ever considered. catalogue-*.json from the
  // older script is left alone.
  // The two tiers are pruned as SEPARATE groups of 30. `.private.json` also
  // ends in `.json`, so matching on the suffix alone counted private files
  // inside the public group and evicted one real public snapshot per day —
  // caught by fabricating 35 dated files and finding 29 survivors instead of
  // 30. Match the exact filename shape instead of a trailing substring.
  const PUBLIC_RE = /^snapshot-\d{4}-\d{2}-\d{2}\.json$/
  const PRIVATE_RE = /^snapshot-\d{4}-\d{2}-\d{2}\.private\.json$/

  const pruneGroup = (pattern: RegExp) => {
    const files = readdirSync(OUT_DIR)
      .filter((name) => pattern.test(name))
      .map((name) => ({ name, mtime: statSync(join(OUT_DIR, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
    const stale = files.slice(KEEP_DAILY)
    for (const file of stale) unlinkSync(join(OUT_DIR, file.name))
    return stale.length
  }
  const removed = pruneGroup(PRIVATE_RE) + pruneGroup(PUBLIC_RE)

  // ─── SUMMARY ───────────────────────────────────────────────────────────
  const sizeKb = Math.round(Buffer.byteLength(publicBody) / 1024)
  const seconds = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1)

  log('')
  log(`Snapshot written in ${seconds}s`)
  log(`  ${dailyPath.replace(process.cwd() + '/', '')}  (${sizeKb} KB)`)
  log(`  sha256 ${checksum.slice(0, 16)}…`)
  log('')
  log('  public tier')
  for (const [key, value] of Object.entries(publicPayload.counts)) log(`    ${key.padEnd(20)} ${value}`)
  if (proxiedCount > 0) {
    log(`    NOTE: ${proxiedCount} image(s) are remote proxies and cannot be restored from Cloudinary.`)
  }
  if (privatePayload) {
    log('  private tier (not committable)')
    for (const [key, value] of Object.entries(privatePayload.counts as Record<string, number>)) {
      log(`    ${key.padEnd(20)} ${value}`)
    }
    log(`    redacted: ${USER_SECRETS.join(', ')}`)
  } else {
    log('  private tier skipped (pass --include-private to add users, orders and audit logs)')
  }
  if (removed > 0) log(`  pruned ${removed} snapshot(s) older than the newest ${KEEP_DAILY}`)

  // Machine-readable line for the GitHub Actions summary in Phase 3.
  if (quiet) {
    console.log(JSON.stringify({ day, sizeKb, checksum, counts: publicPayload.counts, private: Boolean(privatePayload) }))
  }
}

/**
 * Only run when invoked directly. Tests import the guards from this file, and
 * an import must never fire a live database backup as a side effect.
 */
const invokedDirectly = process.argv[1] ? /backup-full-store\.ts$/.test(process.argv[1]) : false

if (invokedDirectly) {
  main()
    .catch((error) => {
      console.error('Backup failed:', error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export { assertNoPersonalData, allowedPublicContacts, jsonSafe, stripKeys, PHONE_RE, EMAIL_RE, KEEP_DAILY, SCHEMA_VERSION }

// Silence "declared but never read" when the module is imported by tests.
void existsSync
void readFileSync
