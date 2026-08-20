/**
 * Catalogue backup — the thing whose absence turned a deleted Supabase project
 * into permanent data loss on 2026-08-20.
 *
 * WHY THIS EXISTS
 *
 * On 2026-08-20 the production Supabase project was deleted. 116 products, 11
 * orders and 8 users were unrecoverable because nothing in this repository held
 * a copy. The only partial rescue was PRODUCT_CATEGORY_SNAPSHOT_20260814, a
 * file written for an unrelated migration rollback, which happened to contain
 * product names and slugs — and nothing else. No prices. No descriptions.
 *
 * This script closes that gap. It writes a complete, human-readable export of
 * everything needed to rebuild the catalogue from scratch.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not export orders, users, reviews, addresses or payments. Those
 * contain customer personal data, and a plaintext copy of them sitting in a git
 * repository is a privacy liability far worse than the problem it solves.
 * Protecting those is the database provider's job: enable Supabase PITR.
 * This script covers the catalogue, which is the part the shop owner
 * hand-builds and cannot reconstruct from anywhere else.
 *
 * USAGE
 *
 *   ./node_modules/.bin/tsx scripts/backup-catalogue.ts
 *   ./node_modules/.bin/tsx scripts/backup-catalogue.ts --out backups/
 *
 * Reads DIRECT_URL (falls back to DATABASE_URL). Read-only: it issues SELECTs
 * and nothing else, so it is safe to run against production at any time.
 */

import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT_FLAG = process.argv.indexOf('--out')
const OUT_DIR = OUT_FLAG !== -1 && process.argv[OUT_FLAG + 1] ? process.argv[OUT_FLAG + 1] : 'backups'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) {
  process.stderr.write('DIRECT_URL or DATABASE_URL must be set.\n')
  process.exit(1)
}

const prisma = new PrismaClient({ datasources: { db: { url } } })

/** Cloudinary URLs are stored as a JSON string array. Keep the raw value too. */
function parseImages(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

async function main() {
  const startedAt = new Date()

  const [categories, brands, products, zones, settings, coupons] = await Promise.all([
    prisma.category.findMany({
      where: { isDeleted: false },
      select: { slug: true, name: true, nameRw: true, description: true, image: true, sortOrder: true, isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.brand.findMany({
      where: { isDeleted: false },
      select: { slug: true, name: true, logo: true, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { isDeleted: false },
      // Everything needed to recreate the row. Admin-only cost and supplier
      // fields are deliberately excluded — they are commercially sensitive and
      // are not needed to rebuild the storefront.
      select: {
        name: true, nameRw: true, slug: true,
        description: true, descriptionRw: true,
        shortDescription: true, shortDescriptionRw: true,
        price: true, wholesalePrice: true, compareAt: true,
        stock: true, lowStockThreshold: true,
        sku: true, realSku: true, barcode: true,
        images: true, videoUrl: true,
        size: true, volume: true, volumeMl: true, weightGrams: true,
        skinType: true, hairType: true, shades: true, shade: true, shadeHex: true, undertone: true,
        ingredients: true, ingredientsRw: true,
        usageInstructions: true, howToUse: true, howToUseRw: true,
        warnings: true, warningsRw: true, allergens: true,
        expectedResults: true, expectedResultsRw: true, resultsTimeframe: true,
        suitableFor: true, uniqueSellingPoints: true,
        seoKeywords: true, seoKeywordsRw: true, whatsappShareText: true,
        isAuthentic: true, authenticityInfo: true, countryOfOrigin: true, importedBy: true,
        featured: true, isActive: true, isNew: true,
        minWholesaleQty: true, wholesaleActive: true,
        category: { select: { slug: true } },
        brand: { select: { slug: true } },
        productImages: {
          select: { url: true, publicId: true, altText: true, altTextRw: true, imageType: true, sortOrder: true, isPrimary: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { slug: 'asc' },
    }),
    prisma.deliveryZoneSettings.findMany({
      select: { zoneCode: true, zoneName: true, baseFee: true, freeThreshold: true, estimatedDays: true, isSameDay: true, sameDayCutoff: true, isActive: true },
      orderBy: { baseFee: 'asc' },
    }),
    prisma.storeSettings.findFirst(),
    prisma.coupon.findMany({
      where: { isActive: true },
      select: { code: true, description: true, type: true, value: true, minOrderAmount: true, maxDiscountAmount: true },
      orderBy: { code: 'asc' },
    }),
  ])

  const liveProducts = products.filter((product) => product.isActive)

  const backup = {
    backupAt: startedAt.toISOString(),
    generatedBy: 'scripts/backup-catalogue.ts',
    contains: 'Catalogue only: categories, brands, products, delivery zones, store settings, coupons.',
    excludes: 'Orders, users, reviews, addresses and payments are deliberately excluded (customer personal data).',
    counts: {
      categories: categories.length,
      brands: brands.length,
      products: products.length,
      liveProducts: liveProducts.length,
      deliveryZones: zones.length,
      coupons: coupons.length,
    },
    categories,
    brands,
    deliveryZones: zones,
    storeSettings: settings,
    coupons,
    products: products.map((product) => ({
      ...product,
      categorySlug: product.category?.slug ?? null,
      brandSlug: product.brand?.slug ?? null,
      imageUrls: parseImages(product.images),
      // Decimal columns do not survive JSON.stringify as numbers.
      volumeMl: product.volumeMl ? String(product.volumeMl) : null,
      weightGrams: product.weightGrams ? String(product.weightGrams) : null,
    })),
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19)

  const jsonPath = join(OUT_DIR, `catalogue-${stamp}.json`)
  writeFileSync(jsonPath, JSON.stringify(backup, null, 1), 'utf8')

  // A stable filename so the newest backup is always diffable in git.
  const latestPath = join(OUT_DIR, 'catalogue-latest.json')
  writeFileSync(latestPath, JSON.stringify(backup, null, 1), 'utf8')

  // CSV for the owner: openable in Excel without any tooling.
  const csvHeader = ['slug', 'name', 'nameRw', 'category', 'brand', 'price_RWF', 'stock', 'sku', 'shortDescription', 'primaryImage']
  const csvRows = liveProducts.map((product) => {
    const primary = product.productImages.find((image) => image.isPrimary) || product.productImages[0]
    const image = primary?.url || parseImages(product.images)[0] || ''
    return [
      product.slug, product.name, product.nameRw ?? '',
      product.category?.slug ?? '', product.brand?.slug ?? '',
      String(product.price), String(product.stock), product.sku ?? '',
      product.shortDescription ?? '', image,
    ]
  })
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [csvHeader, ...csvRows].map((row) => row.map((cell) => escape(String(cell))).join(',')).join('\n')
  writeFileSync(join(OUT_DIR, 'catalogue-latest.csv'), csv, 'utf8')

  process.stdout.write(
    `Catalogue backup written.\n`
    + `  products      ${backup.counts.products} (${backup.counts.liveProducts} live)\n`
    + `  categories    ${backup.counts.categories}\n`
    + `  brands        ${backup.counts.brands}\n`
    + `  zones         ${backup.counts.deliveryZones}\n`
    + `  files         ${jsonPath}\n`
    + `                ${latestPath}\n`
    + `                ${join(OUT_DIR, 'catalogue-latest.csv')}\n`,
  )
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Catalogue backup failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
