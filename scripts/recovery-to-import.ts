/**
 * Turn the recovered product list into a fillable import file.
 *
 * CONTEXT
 *
 * The 2026-08-20 Supabase loss left us with recovery/recovered-product-list.json:
 * 107 live product names, slugs and categories, salvaged from a git snapshot
 * taken for an unrelated migration. It has no prices, descriptions, stock or
 * images, because that snapshot never captured them.
 *
 * This script converts that list into the exact envelope
 * scripts/import-real-products.ts validates, with every unknown value left as
 * a REPLACE_* placeholder and `enabled: false`.
 *
 * WHY enabled:false MATTERS
 *
 * import-real-products.ts refuses to insert any row that is not explicitly
 * `enabled: true`. So this output is inert by default: nothing reaches the
 * database until a human has filled in the real price, stock and images for
 * that specific product and flipped the flag. A half-finished file cannot
 * publish placeholder junk to the storefront.
 *
 * WHY THE SLUGS ARE THE VALUABLE PART
 *
 * Google has these 107 slugs indexed. Recreating a product under its original
 * slug keeps its search ranking and any inbound links. Typing a fresh name and
 * letting the admin panel generate a new slug throws that away silently.
 *
 * USAGE
 *   ./node_modules/.bin/tsx scripts/recovery-to-import.ts
 *   ./node_modules/.bin/tsx scripts/recovery-to-import.ts --category soap
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

interface RecoveredProduct {
  name: string
  slug: string
  category: string
}

const SOURCE = 'recovery/recovered-product-list.json'
const OUT_DIR = 'recovery'

const categoryFlag = process.argv.indexOf('--category')
const onlyCategory = categoryFlag !== -1 ? process.argv[categoryFlag + 1] : null

/**
 * Categories present in the 2026-08-14 snapshot that no longer exist, or that
 * were renamed when the catalogue was reorganised. Mapped so the generated file
 * references a category slug that actually exists today; an unmapped slug would
 * fail the importer with "Missing category slug".
 */
const CATEGORY_ALIASES: Record<string, string> = {
  'hair-care': 'haircare',
}

function main() {
  const raw = JSON.parse(readFileSync(SOURCE, 'utf8')) as { products: RecoveredProduct[] }
  const all = raw.products
  const products = onlyCategory
    ? all.filter((product) => (CATEGORY_ALIASES[product.category] || product.category) === onlyCategory)
    : all

  if (products.length === 0) {
    process.stderr.write(`No products matched${onlyCategory ? ` category "${onlyCategory}"` : ''}.\n`)
    process.exit(1)
  }

  // One recovered row genuinely had slug "soap", identical to its category
  // slug. That is what production held, so it is preserved rather than
  // silently renamed — changing it would break the indexed URL, which is the
  // one thing this file exists to protect. Flagged so it gets a human look.
  const slugCollisions = products.filter(
    (product) => product.slug === (CATEGORY_ALIASES[product.category] || product.category),
  )

  const envelope = {
    schemaVersion: 1,
    generatedBy: 'scripts/recovery-to-import.ts',
    generatedAt: new Date().toISOString(),
    ...(slugCollisions.length > 0
      ? {
        reviewThese: slugCollisions.map((product) => ({
          slug: product.slug,
          name: product.name,
          why: 'This product slug is identical to a category slug. It is what production actually had, so it is preserved. Confirm the URL still behaves before enabling.',
        })),
      }
      : {}),
    instructions: [
      'These are the 107 products recovered from a git snapshot after the 2026-08-20 database loss.',
      'Names, slugs and categories are REAL and were verified from production.',
      'Every REPLACE_* value is unknown and must be filled from the physical product or supplier invoice.',
      'KEEP THE SLUG EXACTLY AS IT IS. Google has these URLs indexed; changing one loses that page its ranking.',
      'Upload images through the admin Cloudinary manager, then paste the URL and publicId here.',
      'Set "enabled": true ONLY for rows you have fully completed. Rows left false are ignored by the importer.',
      'Run: ./node_modules/.bin/tsx scripts/import-real-products.ts <this-file>',
      'After importing, add the long-form content through /admin/products/import.',
    ],
    products: products.map((product) => ({
      enabled: false,
      name: product.name,
      slug: product.slug,
      categorySlug: CATEGORY_ALIASES[product.category] || product.category,
      brandSlug: null,
      shortDescription: 'REPLACE_SHORT_DESCRIPTION',
      description: 'REPLACE_FULL_DESCRIPTION',
      price: 0,
      stock: 0,
      lowStockThreshold: 5,
      sku: null,
      size: null,
      volume: null,
      images: [
        {
          url: 'REPLACE_CLOUDINARY_URL',
          publicId: 'REPLACE_CLOUDINARY_PUBLIC_ID',
          altText: product.name,
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    })),
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const suffix = onlyCategory ? `-${onlyCategory}` : ''
  const path = `${OUT_DIR}/rebuild-import${suffix}.json`
  writeFileSync(path, JSON.stringify(envelope, null, 2), 'utf8')

  const byCategory = products.reduce<Record<string, number>>((acc, product) => {
    const slug = CATEGORY_ALIASES[product.category] || product.category
    acc[slug] = (acc[slug] || 0) + 1
    return acc
  }, {})

  process.stdout.write(
    `Wrote ${path}\n`
    + `  products   ${products.length} (all enabled:false until you fill them in)\n`
    + `  categories ${Object.entries(byCategory).map(([slug, count]) => `${slug}=${count}`).join(' ')}\n`,
  )
}

main()
