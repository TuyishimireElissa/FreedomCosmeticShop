/** Writes the rollback snapshot. READ ONLY against the database. */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');

  const cats = await prisma.category.findMany({
    select: { id: true, slug: true, name: true, nameRw: true, sortOrder: true, isActive: true, isDeleted: true },
    orderBy: { sortOrder: 'asc' },
  });
  // EVERY product row, including soft-deleted, so the snapshot restores the whole table.
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, categoryId: true, isActive: true, isDeleted: true,
      category: { select: { slug: true } } },
    orderBy: { id: 'asc' },
  });

  const byCat: Record<string, number> = {};
  for (const p of products) if (p.isActive && !p.isDeleted) byCat[p.category.slug] = (byCat[p.category.slug] || 0) + 1;

  // Rollback SQL: one UPDATE per distinct category, ids batched in an IN list.
  const groups = new Map<string, string[]>();
  for (const p of products) {
    if (!groups.has(p.categoryId)) groups.set(p.categoryId, []);
    groups.get(p.categoryId)!.push(p.id);
  }
  const sql: string[] = [
    '-- ROLLBACK SQL — restores every Product.categoryId to its value at snapshot time.',
    `-- Snapshot taken: ${new Date().toISOString()}`,
    `-- Rows covered: ${products.length} (all products, including soft-deleted)`,
    '-- Run inside a transaction. Touches ONLY categoryId.',
    'BEGIN;',
  ];
  for (const [catId, ids] of groups) {
    const slug = cats.find(c => c.id === catId)?.slug ?? '?';
    sql.push(`-- ${slug} (${ids.length} rows)`);
    sql.push(`UPDATE "Product" SET "categoryId" = '${catId}' WHERE "id" IN (${ids.map(i => `'${i}'`).join(', ')});`);
  }
  sql.push('COMMIT;');
  sql.push('-- Verify: SELECT c.slug, COUNT(*) FROM "Product" p JOIN "Category" c ON c.id=p."categoryId"');
  sql.push('--         WHERE p."isActive"=true AND p."isDeleted"=false GROUP BY c.slug ORDER BY c.slug;');
  sql.push('-- Expected: ' + Object.keys(byCat).sort().map(k => `${k}=${byCat[k]}`).join(', '));

  const file = `PRODUCT_CATEGORY_SNAPSHOT_${stamp}.json`;
  fs.writeFileSync(file, JSON.stringify({
    snapshotAt: new Date().toISOString(),
    database: 'PostgreSQL 17.6 Supabase aws-1-eu-central-1 (production)',
    purpose: 'Rollback safety net for the auto-categorisation data migration.',
    totalProductRows: products.length,
    liveProductRows: products.filter(p => p.isActive && !p.isDeleted).length,
    softDeletedRows: products.filter(p => p.isDeleted).length,
    liveDistributionBySlug: byCat,
    categories: cats,
    products: products.map(p => ({ productId: p.id, name: p.name, slug: p.slug,
      currentCategoryId: p.categoryId, currentCategorySlug: p.category.slug,
      isActive: p.isActive, isDeleted: p.isDeleted })),
    restoreSql: sql,
  }, null, 2));

  fs.writeFileSync(file.replace('.json', '.sql'), sql.join('\n') + '\n');
  console.log('wrote', file, 'and', file.replace('.json', '.sql'));
  console.log('product rows:', products.length, '| live:', products.filter(p => p.isActive && !p.isDeleted).length);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
