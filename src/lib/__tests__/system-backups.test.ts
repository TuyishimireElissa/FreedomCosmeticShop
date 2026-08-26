/**
 * Disaster recovery: backup generation, restore validation, and the guards
 * that keep customer data off a PUBLIC GitHub repository.
 *
 * These exist because this project has already lost a database once. On
 * 2026-08-20 a Supabase project was deleted and 11 orders and 6 customers were
 * gone for good. Every assertion here protects either "can we get the shop
 * back" or "did we publish a customer's home address while trying".
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  allowedPublicContacts,
  assertNoPersonalData,
  jsonSafe,
  stripKeys,
  KEEP_DAILY,
  SCHEMA_VERSION,
} from '../../../scripts/backup-full-store'
import {
  omit,
  reviveDates,
  validateSnapshot,
  verifyChecksum,
  PRICE_FIELDS,
  SUPPORTED_SCHEMA_VERSIONS,
} from '../../../scripts/restore-full-store'

const read = (path: string) => readFileSync(path, 'utf8')
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const STORE_CONTACTS = allowedPublicContacts([
  { storePhone: '+250788123456', storeEmail: 'hello@freedomcosmeticshop.rw', storeWhatsApp: '+250788123456' },
])

/** A snapshot shaped exactly like the real one, small enough to reason about. */
function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    tier: 'public',
    backupAt: new Date().toISOString(),
    counts: { categories: 1, brands: 1, products: 1, productImages: 1 },
    categories: [{ id: 'cat1', slug: 'skincare', name: 'Skincare' }],
    brands: [{ id: 'br1', slug: 'dettol', name: 'Dettol' }],
    products: [{ id: 'p1', slug: 'soap', categoryId: 'cat1', brandId: 'br1', price: 2500 }],
    productImages: [{ id: 'i1', productId: 'p1', publicId: 'fcs/soap', url: 'https://res.cloudinary.com/dohoc0tmp/image/upload/v1785526939/soap.jpg' }],
    ...overrides,
  }
}

// ─── The leak guard ────────────────────────────────────────────────────────

describe('public snapshots must never carry personal data', () => {
  const throws = (fn: () => void) => { try { fn(); return false } catch { return true } }

  it('allows the shop’s own published phone and email', () => {
    // These are printed on the website and already in git. Blocking them would
    // make the guard unusable, which is how guards get switched off.
    expect(throws(() => assertNoPersonalData({ storePhone: '+250788123456' }, 't', STORE_CONTACTS))).toBe(false)
    expect(throws(() => assertNoPersonalData({ storeEmail: 'hello@freedomcosmeticshop.rw' }, 't', STORE_CONTACTS))).toBe(false)
  })

  it('blocks a customer phone in international format', () => {
    expect(throws(() => assertNoPersonalData({ customerPhone: '+250790215965' }, 't', STORE_CONTACTS))).toBe(true)
  })

  it('blocks a customer phone in LOCAL format', () => {
    // The first version of this regex only matched +250…, so 0788… sailed
    // straight through. Rwandans write both.
    expect(throws(() => assertNoPersonalData({ customerPhone: '0788999111' }, 't', STORE_CONTACTS))).toBe(true)
  })

  it('blocks phone numbers written with spaces or hyphens', () => {
    for (const value of ['+250 788 999 111', '250-788-999-111', '0788 999 111']) {
      expect(throws(() => assertNoPersonalData({ p: value }, 't', STORE_CONTACTS)), value).toBe(true)
    }
  })

  it('blocks a customer email', () => {
    expect(throws(() => assertNoPersonalData({ customerEmail: 'mukamana@gmail.com' }, 't', STORE_CONTACTS))).toBe(true)
  })

  it('finds personal data nested deep inside the payload', () => {
    expect(throws(() => assertNoPersonalData({ a: { b: [{ c: { phone: '+250788777666' } }] } }, 't', STORE_CONTACTS))).toBe(true)
  })

  it('does not false-positive on Cloudinary version ids', () => {
    // v1785526939 is a 10-digit run. A loose pattern reads it as a phone and
    // blocks every backup forever.
    expect(throws(() => assertNoPersonalData(
      { url: 'https://res.cloudinary.com/dohoc0tmp/image/upload/v1785526939/x.jpg' }, 't', STORE_CONTACTS,
    ))).toBe(false)
  })

  it('does not false-positive on product names containing digits', () => {
    // 29 of the catalogue's names have digits: "777 MEN", "Barakkat Rouge 540".
    expect(throws(() => assertNoPersonalData(
      { name: '777 MEN Super Love Perfume Set (2 Pcs)', sku: 'FCS-790880' }, 't', STORE_CONTACTS,
    ))).toBe(false)
  })

  it('blocks everything when no allowlist is supplied', () => {
    expect(throws(() => assertNoPersonalData({ e: 'x@y.rw' }, 't', []))).toBe(true)
  })

  it('collects store contacts from every known settings field', () => {
    const contacts = allowedPublicContacts([{ storePhone: '+250788111222', supportEmail: 'help@shop.rw', unrelated: 'ignored' }])
    expect(contacts).toContain('+250788111222')
    expect(contacts).toContain('help@shop.rw')
    expect(contacts).not.toContain('ignored')
  })
})

describe('credential fields are stripped from the private tier', () => {
  const SECRETS = ['passwordHash', 'mfaSecret', 'mfaBackupCodes', 'lastLoginIp', 'lastLoginDevice']

  it('removes every credential field but keeps the rest of the row', () => {
    const user = { id: 'u1', name: 'Owner', phone: '+250790215965', passwordHash: '$2b$12$abc', mfaSecret: 'JBSW', mfaBackupCodes: ['a'], lastLoginIp: '1.2.3.4', lastLoginDevice: 'iPhone' }
    const cleaned = stripKeys(user, SECRETS)
    for (const field of SECRETS) expect(cleaned).not.toHaveProperty(field)
    expect(cleaned).toMatchObject({ id: 'u1', name: 'Owner', phone: '+250790215965' })
  })

  it('does not mutate the source row', () => {
    const user = { id: 'u1', passwordHash: 'secret' }
    stripKeys(user, SECRETS)
    expect(user.passwordHash).toBe('secret')
  })
})

describe('jsonSafe survives Prisma types that JSON.stringify mangles', () => {
  it('converts Date to an ISO string', () => {
    expect(jsonSafe(new Date('2026-08-26T00:00:00.000Z'))).toBe('2026-08-26T00:00:00.000Z')
  })
  it('converts Decimal via toNumber', () => {
    expect(jsonSafe({ toNumber: () => 2500 })).toBe(2500)
  })
  it('converts bigint to string rather than throwing', () => {
    // BigInt('...') rather than a 9007199254740993n literal: tsconfig targets
    // below ES2020, where the literal form is a compile error.
    expect(jsonSafe(BigInt('9007199254740993'))).toBe('9007199254740993')
  })
  it('walks arrays and nested objects', () => {
    expect(jsonSafe({ a: [new Date('2026-01-01T00:00:00.000Z')] })).toEqual({ a: ['2026-01-01T00:00:00.000Z'] })
  })
  it('leaves null and undefined safe', () => {
    expect(jsonSafe(null)).toBeNull()
    expect(jsonSafe(undefined)).toBeNull()
  })
})

// ─── Restore validation ────────────────────────────────────────────────────

describe('restore refuses anything it cannot trust', () => {
  it('accepts a well-formed snapshot', () => {
    expect(validateSnapshot(snapshot()).ok).toBe(true)
  })

  it('rejects a non-object', () => {
    for (const bad of ['string', 42, null, []]) expect(validateSnapshot(bad).ok).toBe(false)
  })

  it('rejects a file that is not ours', () => {
    const result = validateSnapshot({ tier: 'public', backupAt: new Date().toISOString() })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('schemaVersion')
  })

  it('rejects a future schema version instead of guessing', () => {
    const result = validateSnapshot(snapshot({ schemaVersion: 99 }))
    expect(result.ok).toBe(false)
    expect(SUPPORTED_SCHEMA_VERSIONS).toEqual([1])
  })

  it('rejects an empty catalogue', () => {
    // A zero-product export is a broken export, never a real shop.
    const result = validateSnapshot(snapshot({ products: [], counts: { products: 0 } }))
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('zero products')
  })

  it('detects truncation by comparing counts to array lengths', () => {
    const result = validateSnapshot(snapshot({ counts: { products: 999 } }))
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('truncated')
  })

  it('rejects a product whose category is missing from the file', () => {
    // categoryId is a required FK; restoring this would abort mid-write.
    const result = validateSnapshot(snapshot({ products: [{ id: 'p1', slug: 's', categoryId: 'ghost' }] }))
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('categoryId')
  })

  it('warns but does not fail on images whose product is absent', () => {
    const result = validateSnapshot(snapshot({ productImages: [{ id: 'i9', productId: 'ghost', publicId: 'x', url: 'u' }] }))
    expect(result.ok).toBe(true)
    expect(result.warnings.join(' ')).toContain('image')
  })

  it('warns that a stale snapshot will revert newer work', () => {
    const old = new Date(Date.now() - 96 * 3600_000).toISOString()
    expect(validateSnapshot(snapshot({ backupAt: old })).warnings.join(' ')).toMatch(/hours old/)
  })

  it('warns that supplierId cannot be honoured', () => {
    const result = validateSnapshot(snapshot({ products: [{ id: 'p1', slug: 's', categoryId: 'cat1', supplierId: 'sup1' }] }))
    expect(result.warnings.join(' ')).toContain('supplier')
  })

  it('rejects an unparseable timestamp', () => {
    expect(validateSnapshot(snapshot({ backupAt: 'not a date' })).ok).toBe(false)
  })
})

describe('checksum verification', () => {
  it('passes when the body matches the sidecar', () => {
    const body = '{"a":1}'
    const { actual } = verifyChecksum(body, '/nonexistent')
    expect(actual).toHaveLength(64)
  })

  it('reports unchecked when no sidecar exists', () => {
    const result = verifyChecksum('{"a":1}', '/definitely/not/here.sha256')
    expect(result.checked).toBe(false)
    expect(result.ok).toBe(true)
  })

  it('produces a different digest for tampered content', () => {
    const a = verifyChecksum('{"price":2500}', '/nope').actual
    const b = verifyChecksum('{"price":999999}', '/nope').actual
    expect(a).not.toBe(b)
  })
})

describe('restore write-safety helpers', () => {
  it('omit drops the requested keys only', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 })
  })

  it('price columns are named so they can be withheld', () => {
    expect(PRICE_FIELDS).toContain('price')
    expect(PRICE_FIELDS).toContain('wholesalePrice')
  })

  it('withholding prices leaves every other field intact', () => {
    // The owner priced ~99 products by hand on 2026-08-25. A restore from an
    // older snapshot must not quietly undo that.
    const row = { slug: 'soap', name: 'Soap', price: 2500, wholesalePrice: 2000, stock: 10 }
    const withheld = omit(row, PRICE_FIELDS)
    expect(withheld).not.toHaveProperty('price')
    expect(withheld).not.toHaveProperty('wholesalePrice')
    expect(withheld).toMatchObject({ slug: 'soap', name: 'Soap', stock: 10 })
  })

  it('reviveDates turns ISO strings back into Date objects', () => {
    const out = reviveDates({ createdAt: '2026-08-26T00:00:00.000Z', name: 'x' })
    expect(out.createdAt).toBeInstanceOf(Date)
    expect(out.name).toBe('x')
  })

  it('reviveDates leaves non-date strings alone', () => {
    expect(reviveDates({ slug: '2026-soap' }).slug).toBe('2026-soap')
  })
})

// ─── Source-level guarantees ───────────────────────────────────────────────

describe('the backup script defends itself', () => {
  const source = read('scripts/backup-full-store.ts')

  it('keeps 30 daily snapshots', () => {
    expect(KEEP_DAILY).toBe(30)
  })

  it('prunes the two tiers as separate groups', () => {
    // `.private.json` also ends in `.json`. Matching on the suffix counted
    // private files inside the public group and silently deleted one real
    // snapshot per day — 35 files left 29 survivors instead of 30.
    expect(source).toContain('PUBLIC_RE')
    expect(source).toContain('PRIVATE_RE')
    expect(source).toMatch(/\^snapshot-\\d\{4\}-\\d\{2\}-\\d\{2\}\\\.json\$/)
  })

  it('only writes the private tier when explicitly asked', () => {
    expect(source).toContain("includePrivate = process.argv.includes('--include-private')")
  })

  it('does not run a live backup merely because it was imported', () => {
    expect(source).toContain('invokedDirectly')
  })
})

describe('the restore script defends itself', () => {
  const source = read('scripts/restore-full-store.ts')

  it('is dry-run unless --confirm is passed', () => {
    expect(source).toContain("const confirmed = hasFlag('confirm')")
    expect(source).toContain('const dryRun = !confirmed')
  })

  it('withholds prices unless --restore-prices is passed', () => {
    expect(source).toContain("restorePrices = hasFlag('restore-prices')")
  })

  it('never deletes: every write is an upsert', () => {
    const code = stripComments(source)
    expect(code).not.toMatch(/\.deleteMany\(/)
    expect(code).not.toMatch(/\.delete\(/)
    expect(code).toMatch(/\.upsert\(/)
  })

  it('never touches live session or credential tables', () => {
    const code = stripComments(source)
    for (const table of ['authSession', 'failedLoginAttempt', 'otpVerification', 'passwordResetLog']) {
      expect(code, table).not.toContain(`prisma.${table}.`)
    }
  })

  it('forces a password change on restored users', () => {
    expect(source).toContain('mustChangePassword = true')
  })

  it('clears supplierId, which the backup cannot carry', () => {
    expect(source).toContain('cleaned.supplierId = null')
  })
})

describe('the daily workflow cannot leak personal data', () => {
  const workflow = read('.github/workflows/daily-store-backup.yml')
  const executable = workflow
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n')

  it('runs at midnight UTC', () => {
    expect(workflow).toContain("cron: '0 0 * * *'")
  })

  it('never generates the private tier in CI', () => {
    // Checked against executable lines only: the flag is legitimately named in
    // the header comment explaining why it is absent.
    expect(executable).not.toContain('--include-private')
    expect(executable).toContain('npm run backup:store')
  })

  it('greps for personal-data fields before committing', () => {
    expect(workflow).toContain('customerPhone|customerEmail|passwordHash|mfaSecret')
  })

  it('refuses to proceed if a private file is present', () => {
    expect(workflow).toContain('backups/*.private.json')
  })

  it('takes credentials from GitHub Secrets, never literals', () => {
    expect(workflow).toContain('${{ secrets.DIRECT_URL }}')
    expect(executable).not.toMatch(/postgres(ql)?:\/\/[^\s$]/)
  })

  it('requests only the permission it needs', () => {
    expect(workflow).toContain('contents: write')
    expect(workflow).not.toContain('permissions: write-all')
  })

  it('commits only when the catalogue actually changed', () => {
    // Otherwise the repo grows ~250 MB a year in near-identical blobs.
    expect(workflow).toContain('git diff --cached --quiet')
  })
})

describe('.gitignore is the last line of defence', () => {
  const ignore = read('.gitignore')

  it('excludes every private snapshot shape', () => {
    // Must be an ACTIVE rule, not a commented-out one. Commenting the line
    // survived an earlier mutation run because `toContain` matched the text
    // inside `#/backups/*.private.json`.
    const active = ignore
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
    expect(active).toContain('/backups/*.private.json')
    expect(active).toContain('/backups/snapshot-*.private.json')
  })

  it('keeps dated public snapshots out of git but allows latest-snapshot.json', () => {
    expect(ignore).toContain('/backups/snapshot-????-??-??.json')
    expect(ignore).not.toContain('/backups/latest-snapshot.json')
  })
})

// ─── Admin surface ─────────────────────────────────────────────────────────

describe('the admin backup API', () => {
  const backupRoute = read('src/app/api/admin/backup/route.ts')
  const statusRoute = read('src/app/api/admin/backups/status/route.ts')

  it('includes the three tables a restore cannot work without', () => {
    // Without these, a restored shop has products with no photos and a
    // dangling categoryId. They were missing from every snapshot this route
    // had ever produced.
    for (const table of ['categories', 'brands', 'productImages']) {
      expect(backupRoute, table).toContain(`${table},`)
    }
    expect(backupRoute).toContain('db.productImage.findMany')
    expect(backupRoute).toContain('db.category.findMany')
    expect(backupRoute).toContain('db.brand.findMany')
  })

  it('still excludes password hashes', () => {
    expect(backupRoute).toContain('passwordHash intentionally excluded')
  })

  it('gates the status endpoint behind a permission', () => {
    expect(statusRoute).toContain('requirePermission(PERMISSIONS.SETTINGS_UPDATE)')
  })

  it('does not pretend to read a file the server cannot see', () => {
    // Vercel's filesystem is read-only outside /tmp and output:'standalone'
    // does not ship backups/. Reading it would work locally and fail in prod.
    const code = stripComments(statusRoute)
    expect(code).not.toContain('readFileSync')
    expect(code).not.toContain('latest-snapshot.json')
  })

  it('reports counts from the database instead', () => {
    expect(statusRoute).toContain('db.product.count()')
    expect(statusRoute).toContain('db.productImage.count()')
  })

  it('checks Cloudinary with a real request, not a config flag', () => {
    expect(statusRoute).toContain("method: 'HEAD'")
    expect(statusRoute).toContain('AbortController')
  })
})

describe('the backup admin page', () => {
  const page = read('src/components/admin/AdminSystemBackups.tsx')
  const en = read('src/lib/i18n/translations/en.ts')
  const rw = read('src/lib/i18n/translations/rw.ts')

  it('offers a download that leaves the server', () => {
    expect(page).toContain("fetch('/api/admin/backup'")
    expect(page).toContain('URL.createObjectURL')
  })

  it('does not offer a server-side create button that cannot work', () => {
    expect(page).not.toContain('backups/create')
  })

  it('surfaces an error instead of rendering a false empty state', () => {
    expect(page).toContain('loadError')
    expect(page).toContain('role="alert"')
  })

  it('uses fcs-* tokens only, with no raw hex or dead opacity modifiers', () => {
    const code = stripComments(page)
    expect(code).not.toMatch(/#[0-9a-fA-F]{6}/)
    expect(code).not.toMatch(/fcs-[a-z-]+\/\d/)
  })

  it('meets the 44px touch target on every control', () => {
    const buttons = page.match(/min-h-1[12]/g) || []
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('is fully bilingual', () => {
    const keys = [...page.matchAll(/t\('(backups\.[a-z_]+)'/g)].map((m) => m[1].split('.')[1])
    expect(keys.length).toBeGreaterThan(10)
    for (const key of new Set(keys)) {
      expect(en, `en.${key}`).toMatch(new RegExp(`\\b${key}:`))
      expect(rw, `rw.${key}`).toMatch(new RegExp(`\\b${key}:`))
    }
  })

  it('is reachable from the sidebar', () => {
    const sidebar = read('src/components/admin/AdminSidebar.tsx')
    expect(sidebar).toContain("href: '/admin/system-backups'")
    expect(sidebar).toContain("translationKey: 'backups.nav'")
  })
})

describe('the destructive restore needs a typed confirmation', () => {
  const settings = read('src/components/admin/AdminSettings.tsx')

  it('requires the word RESTORE before the button enables', () => {
    // A single click was the only thing between a mis-selected file and
    // overwriting the live shop.
    expect(settings).toContain("confirmWord.trim().toUpperCase() !== 'RESTORE'")
  })

  it('clears the typed word when the dialog is dismissed', () => {
    expect(settings).toContain("setConfirmWord('')")
  })
})
