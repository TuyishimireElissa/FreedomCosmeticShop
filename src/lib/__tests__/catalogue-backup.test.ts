/**
 * Catalogue backup and rebuild tooling.
 *
 * These exist because on 2026-08-20 the production Supabase project was
 * deleted and 116 products were unrecoverable — nothing in this repository
 * held a copy. The scripts under test are the fix. If they silently stop
 * capturing a field, the next incident is just as bad, and nobody finds out
 * until it is too late to matter. Hence assertions on the field list itself.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

const backup = read('scripts/backup-catalogue.ts')
const rebuild = read('scripts/recovery-to-import.ts')
const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
const gitignore = read('.gitignore')

/** Comments legitimately discuss orders/users and the fields we exclude, so
 *  assertions about what the script actually selects must ignore prose. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const backupCode = stripComments(backup)
const rebuildCode = stripComments(rebuild)

const countOf = (haystack: string, needle: string) => haystack.split(needle).length - 1

describe('the catalogue backup captures everything needed to rebuild', () => {
  it('exports products, categories, brands, zones, settings and coupons', () => {
    for (const model of [
      'prisma.product.findMany',
      'prisma.category.findMany',
      'prisma.brand.findMany',
      'prisma.deliveryZoneSettings.findMany',
      'prisma.storeSettings.findFirst',
      'prisma.coupon.findMany',
    ]) {
      expect(backupCode).toContain(model)
    }
  })

  it('captures every field the rebuild would need, including the 23-field columns', () => {
    // Scoped to the PRODUCT select block. Searching the whole file passes even
    // when a field is dropped from the product, because `nameRw` also appears
    // on the category select and in the CSV header — siblings satisfying the
    // assertion, which is exactly how a silent backup gap would survive.
    const start = backupCode.indexOf('prisma.product.findMany')
    expect(start).toBeGreaterThan(-1)
    const productSelect = backupCode.slice(start, backupCode.indexOf('orderBy: { slug:', start))

    // A missing field here is invisible until a restore is attempted.
    for (const field of [
      'name:', 'nameRw:', 'slug:',
      'description:', 'descriptionRw:',
      'shortDescription:', 'shortDescriptionRw:',
      'price:', 'stock:', 'sku:', 'images:',
      'ingredients:', 'ingredientsRw:',
      'howToUse:', 'howToUseRw:', 'usageInstructions:',
      'warnings:', 'warningsRw:',
      'expectedResults:', 'expectedResultsRw:',
      'suitableFor:', 'uniqueSellingPoints:',
      'seoKeywords:', 'seoKeywordsRw:', 'whatsappShareText:',
      'weightGrams:', 'productImages:',
    ]) {
      expect(productSelect, `product select is missing ${field}`).toContain(field)
    }
  })

  it('records the category and brand slug, not just the foreign key', () => {
    // Raw ids are useless after a restore into a fresh database, where every
    // cuid is regenerated. Slugs are stable and are what the importer matches.
    expect(backupCode).toContain('categorySlug')
    expect(backupCode).toContain('brandSlug')
  })

  it('never exports customer personal data', () => {
    // A plaintext copy of orders or users in a git repo is a worse problem
    // than the one this script solves.
    for (const model of ['prisma.order', 'prisma.user', 'prisma.review', 'prisma.address', 'prisma.payment']) {
      expect(backupCode, `backup must not read ${model}`).not.toContain(model)
    }
  })

  it('is read-only', () => {
    for (const write of ['.create(', '.update(', '.delete(', '.upsert(', '.executeRaw']) {
      expect(backupCode, `backup must not call ${write}`).not.toContain(write)
    }
  })

  it('stringifies Decimal columns so they survive JSON', () => {
    // Prisma Decimal serialises to an object, not a number, and silently
    // becomes unusable in the restore file.
    expect(backupCode).toContain('String(product.volumeMl)')
    expect(backupCode).toContain('String(product.weightGrams)')
  })

  it('writes a stable latest file so the repo always holds one snapshot', () => {
    expect(backupCode).toContain('catalogue-latest.json')
    expect(backupCode).toContain('catalogue-latest.csv')
  })

  it('commits the latest snapshot but ignores timestamped copies', () => {
    expect(gitignore).toContain('/backups/catalogue-*T*.json')
    expect(gitignore).not.toContain('/backups/catalogue-latest.json')
  })
})

describe('the rebuild file protects indexed URLs', () => {
  it('starts every row disabled so nothing half-finished can publish', () => {
    expect(rebuildCode).toContain('enabled: false')
    expect(rebuildCode).not.toContain('enabled: true')
  })

  it('carries the recovered slug through untouched', () => {
    // The slugs are the only reason this file beats retyping from scratch:
    // Google has them indexed. Regenerating them from the name would lose
    // the ranking of all 107 pages silently.
    expect(rebuildCode).toContain('slug: product.slug')
    expect(rebuildCode).not.toContain('slugify')
  })

  it('maps renamed categories so the importer can resolve them', () => {
    expect(rebuildCode).toContain('CATEGORY_ALIASES')
    expect(rebuildCode).toContain("'hair-care': 'haircare'")
  })

  it('flags a product slug that collides with a category slug', () => {
    // One real row had slug "soap". It is preserved rather than renamed,
    // because renaming breaks the URL — but a human should look at it.
    // Asserting the identifier alone is not enough: replacing the guard
    // condition with `false` leaves every mention intact while silently
    // emitting nothing, so the live condition itself is pinned.
    expect(rebuildCode).toContain('slugCollisions.length > 0')
    expect(rebuildCode).toContain('reviewThese')
    expect(rebuildCode).toMatch(/slugCollisions = products\.filter/)
  })

  it('marks unknown values as REPLACE_ rather than inventing them', () => {
    expect(rebuildCode).toContain('REPLACE_SHORT_DESCRIPTION')
    expect(rebuildCode).toContain('REPLACE_FULL_DESCRIPTION')
    expect(rebuildCode).toContain('REPLACE_CLOUDINARY_URL')
    // Price and stock must be obviously unset, never a plausible-looking guess.
    expect(rebuildCode).toContain('price: 0')
    expect(rebuildCode).toContain('stock: 0')
  })

  it('produces the envelope shape the importer validates', () => {
    for (const key of ['categorySlug', 'shortDescription', 'description', 'images', 'isPrimary']) {
      expect(rebuildCode).toContain(key)
    }
  })
})

describe('the tooling is runnable without remembering paths', () => {
  it('exposes both scripts through npm', () => {
    expect(pkg.scripts['catalog:backup']).toBe('tsx scripts/backup-catalogue.ts')
    expect(pkg.scripts['catalog:rebuild-file']).toBe('tsx scripts/recovery-to-import.ts')
  })

  it('keeps the existing importer entry point intact', () => {
    expect(pkg.scripts['catalog:import']).toBe('tsx scripts/import-real-products.ts')
    expect(countOf(JSON.stringify(pkg.scripts), 'import-real-products')).toBe(1)
  })
})
