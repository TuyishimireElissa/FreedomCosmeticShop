/**
 * Fold hand-made image matches into the rebuild import file.
 *
 * WHY THIS IS A SEPARATE STEP
 *
 * 517 product images survived the 2026-08-20 database loss on Cloudinary, but
 * every filename is a random hash with no tags, no context and no alt text.
 * Nothing connects an image to a product; the rows that held that link are
 * gone.
 *
 * Automatic matching was tried and rejected. Clustering images by upload time
 * yields 255 clusters for 107 products, so any automated guess would be wrong
 * more often than right — and a confidently wrong product photo is worse than
 * an empty one, because nobody re-checks it.
 *
 * So a human matches by eye in recovery/image-picker.html, and this script
 * writes those decisions into recovery/rebuild-import.json. It only ever fills
 * the images array; price, stock and descriptions stay REPLACE_* until a human
 * supplies them.
 *
 * USAGE
 *   1. open recovery/image-picker.html, match photos, click Export JSON
 *   2. save that into recovery/image-matches.json
 *   3. npm run catalog:apply-images
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const MATCHES = 'recovery/image-matches.json'
const TARGET = 'recovery/rebuild-import.json'

interface MatchImage { publicId: string; url: string; isPrimary: boolean; sortOrder: number }
interface Match { slug: string; images: MatchImage[] }

function main() {
  if (!existsSync(MATCHES)) {
    process.stderr.write(
      `${MATCHES} not found.\n`
      + 'Open recovery/image-picker.html, match the photos, click "Export JSON",\n'
      + `and save the result to ${MATCHES}.\n`,
    )
    process.exit(1)
  }

  const matchData = JSON.parse(readFileSync(MATCHES, 'utf8')) as { matches: Match[] }
  const target = JSON.parse(readFileSync(TARGET, 'utf8')) as {
    products: Array<Record<string, unknown> & { slug: string; images: unknown[] }>
  }

  const bySlug = new Map(matchData.matches.map((match) => [match.slug, match.images]))
  const targetSlugs = new Set(target.products.map((product) => product.slug))

  // A match for a slug that is not in the rebuild file means the two files
  // have drifted apart. Report it rather than dropping it silently.
  const orphans = [...bySlug.keys()].filter((slug) => !targetSlugs.has(slug))

  let applied = 0
  let skippedNoImages = 0
  for (const product of target.products) {
    const images = bySlug.get(product.slug)
    if (!images || images.length === 0) {
      skippedNoImages += 1
      continue
    }
    product.images = images
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((image, index) => ({
        url: image.url,
        publicId: image.publicId,
        altText: String(product.name ?? product.slug),
        // Exactly one primary: the importer rejects a set with more than one.
        isPrimary: index === 0,
        sortOrder: index,
      }))
    applied += 1
  }

  writeFileSync(TARGET, JSON.stringify(target, null, 2), 'utf8')

  process.stdout.write(
    `Applied image matches to ${TARGET}\n`
    + `  products with photos    ${applied}\n`
    + `  still without photos    ${skippedNoImages}\n`
    + (orphans.length
      ? `  WARNING unmatched slugs ${orphans.length}: ${orphans.slice(0, 5).join(', ')}\n`
      : '')
    + '\nPrice, stock and descriptions are still REPLACE_* placeholders.\n'
    + 'Fill those in and set "enabled": true before running npm run catalog:import.\n',
  )
}

main()
