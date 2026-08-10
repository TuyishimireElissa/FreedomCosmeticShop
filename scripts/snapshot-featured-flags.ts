/**
 * Snapshot every product's `featured` flag before clearing it, then clear.
 *
 * 99 of 101 active products were flagged featured, which made the homepage's
 * "Featured" rail meaningless — ordering fell through to `updatedAt desc`, so
 * it showed whatever was edited most recently rather than a curated choice.
 *
 * Writes FEATURED_FLAGS_SNAPSHOT.md with the exact prior state and the SQL to
 * restore it, so this is fully reversible.
 *
 * Run:  tsx scripts/snapshot-featured-flags.ts          (snapshot only)
 *       tsx scripts/snapshot-featured-flags.ts --clear  (snapshot then clear)
 */
import { writeFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const clear = process.argv.includes('--clear')
  const products = await prisma.product.findMany({
    select: { id: true, name: true, featured: true, isActive: true, isDeleted: true },
    orderBy: { name: 'asc' },
  })
  const flagged = products.filter((p) => p.featured)

  const lines = [
    '# `featured` flag snapshot',
    '',
    `Taken ${new Date().toISOString()} before clearing all flags.`,
    '',
    `- products total: **${products.length}**`,
    `- \`featured: true\` at snapshot time: **${flagged.length}**`,
    '',
    'The homepage rail queries `featured: true` ordered by `updatedAt desc`.',
    'With almost every product flagged, "Featured" meant "most recently edited",',
    'not a curated selection. All flags are cleared so the owner can pick 4-6',
    'in the admin product editor; until then the rail hides itself rather than',
    'claiming the shop is empty.',
    '',
    '## Restore',
    '',
    'To put every flag back exactly as it was:',
    '',
    '```sql',
    ...(flagged.length
      ? [`UPDATE "Product" SET featured = true WHERE id IN (`,
         flagged.map((p) => `  '${p.id}'`).join(',\n'),
         ');']
      : ['-- nothing was flagged']),
    '```',
    '',
    '## Products flagged at snapshot time',
    '',
    '| Product | id | active |',
    '| --- | --- | --- |',
    ...flagged.map((p) => `| ${p.name.replace(/\|/g, '\\|')} | \`${p.id}\` | ${p.isActive && !p.isDeleted ? 'yes' : 'no'} |`),
    '',
  ]
  writeFileSync('FEATURED_FLAGS_SNAPSHOT.md', lines.join('\n'))
  console.log(`snapshot written: ${products.length} products, ${flagged.length} flagged`)

  if (!clear) {
    console.log('dry run — no flags changed. Pass --clear to clear them.')
    return
  }
  const result = await prisma.product.updateMany({ where: { featured: true }, data: { featured: false } })
  const remaining = await prisma.product.count({ where: { featured: true } })
  console.log(`cleared ${result.count} flags; ${remaining} remain featured`)
}

main().catch((error) => { console.error('FAILED', error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
