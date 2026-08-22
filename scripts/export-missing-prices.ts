/**
 * Export the products that still have no price, as a fill-in file for the owner.
 *
 * WHY THIS EXISTS
 *
 * 97 of 108 live products are priced at 0 RWF. They were never captured in the
 * snapshot that survived the 2026-08-20 database deletion — I traced 14
 * revisions of the committed backup and every one holds only the same 11
 * prices. The numbers exist nowhere in this project and cannot be derived,
 * inferred, or copied from a similar product. Only the owner has them.
 *
 * This script does not guess. It reads the catalogue and writes a CSV whose
 * `price_RWF` column is deliberately blank, plus a JSON twin for the importer.
 *
 * READ-ONLY against the database.
 *
 * USAGE
 *   npm run catalog:missing-prices
 */

import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'node:fs'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) {
  process.stderr.write('DIRECT_URL or DATABASE_URL must be set.\n')
  process.exit(1)
}

const prisma = new PrismaClient({ datasources: { db: { url } } })
const OUT_DIR = 'recovery'

/** Excel-safe: quote everything and double any embedded quote. */
const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true, isDeleted: false, price: { lte: 0 } },
    select: {
      slug: true,
      name: true,
      sku: true,
      stock: true,
      shortDescription: true,
      category: { select: { slug: true } },
    },
    orderBy: [{ category: { slug: 'asc' } }, { name: 'asc' }],
  })

  // Priced products are included as a reference block so the owner can see the
  // house price format and rough range while filling the blanks in.
  const priced = await prisma.product.findMany({
    where: { isActive: true, isDeleted: false, price: { gt: 0 } },
    select: { slug: true, name: true, price: true },
    orderBy: { price: 'asc' },
  })

  mkdirSync(OUT_DIR, { recursive: true })

  const header = ['slug', 'name', 'category', 'sku', 'stock', 'price_RWF']
  const rows = products.map((product) => [
    product.slug,
    product.name,
    product.category?.slug ?? '',
    product.sku ?? '',
    product.stock,
    '', // deliberately blank — the owner fills this in
  ])
  const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\n')
  writeFileSync(`${OUT_DIR}/missing-prices.csv`, `${csv}\n`, 'utf8')

  writeFileSync(`${OUT_DIR}/missing-prices.json`, JSON.stringify({
    generatedAt: new Date().toISOString(),
    instructions: [
      'Fill the price_RWF column with the real selling price in Rwandan Francs.',
      'Whole numbers only, no commas, no "RWF" text. Example: 4500',
      'Leave a row blank if you are unsure — blank rows are skipped, never guessed.',
      'Do not change the slug column. It is how each price is matched to its product.',
      'Save the file and hand it back, then run: npm run catalog:apply-prices',
    ],
    missingCount: products.length,
    pricedReference: priced.map((p) => ({ name: p.name, price: p.price })),
    products: products.map((product) => ({
      slug: product.slug,
      name: product.name,
      category: product.category?.slug ?? null,
      sku: product.sku,
      stock: product.stock,
      price_RWF: null,
    })),
  }, null, 2), 'utf8')

  process.stdout.write(
    `Wrote ${OUT_DIR}/missing-prices.csv and .json\n`
    + `  products awaiting a price : ${products.length}\n`
    + `  already priced (reference): ${priced.length}\n`
    + `  price range in catalogue  : ${priced.length ? `${priced[0].price} – ${priced[priced.length - 1].price} RWF` : 'n/a'}\n`,
  )
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
