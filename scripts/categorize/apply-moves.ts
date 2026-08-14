/**
 * STEP 5 — applies the approved category moves in ONE transaction.
 * Reads the plan produced by classify.ts. Writes ONLY Product.categoryId.
 * Any error rolls the whole thing back.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const PLAN = '/tmp/plan_v2.json';

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const moves = plan.rows.filter((r: any) => r.changed);
  console.log('moves in plan:', moves.length);

  // ---- PRE-FLIGHT: the plan must still match the live DB exactly ----
  const ids = moves.map((m: any) => m.id);
  const live = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, categoryId: true, isActive: true, isDeleted: true,
      price: true, stock: true, category: { select: { slug: true } } },
  });
  const liveMap = new Map(live.map(p => [p.id, p]));

  let drift = 0;
  for (const m of moves) {
    const p = liveMap.get(m.id);
    if (!p) { console.log('  MISSING', m.id, m.name); drift++; continue; }
    if (p.category.slug !== m.currentCategorySlug) {
      console.log(`  STALE ${m.name}: plan says from "${m.currentCategorySlug}" but DB says "${p.category.slug}"`); drift++;
    }
    if (!p.isActive || p.isDeleted) { console.log('  NOT LIVE', m.name); drift++; }
  }
  if (drift) throw new Error(`pre-flight failed: ${drift} drift(s). Nothing written.`);
  console.log('pre-flight: plan matches live DB, all', moves.length, 'rows OK');

  // Target categories must exist and be usable.
  const targets = [...new Set(moves.map((m: any) => m.proposedCategoryId))] as string[];
  const cats = await prisma.category.findMany({ where: { id: { in: targets } }, select: { id: true, slug: true, isActive: true, isDeleted: true } });
  if (cats.length !== targets.length) throw new Error('a target category is missing');
  for (const c of cats) if (!c.isActive || c.isDeleted) throw new Error('target category not usable: ' + c.slug);
  console.log('pre-flight: all', targets.length, 'target categories active');

  // Baselines that must NOT change.
  const totalBefore = await prisma.product.count();
  const liveBefore = await prisma.product.count({ where: { isActive: true, isDeleted: false } });
  const stockBefore = await prisma.product.aggregate({ _sum: { stock: true }, where: { isActive: true, isDeleted: false } });
  const priceBefore = await prisma.product.aggregate({ _sum: { price: true }, where: { isActive: true, isDeleted: false } });
  const orderItemsBefore = await prisma.orderItem.count();
  const cartItemsBefore = await prisma.cartItem.count();

  // ---- EXECUTE ----
  console.log('\napplying', moves.length, 'updates in one transaction...');
  const started = Date.now();
  const results = await prisma.$transaction(
    moves.map((m: any) => prisma.product.update({
      where: { id: m.id },
      data: { categoryId: m.proposedCategoryId },   // ONLY this field
      select: { id: true },
    }))
  );
  console.log('committed:', results.length, 'rows in', Date.now() - started, 'ms');

  // ---- VERIFY ----
  console.log('\n=== VERIFY each moved product ===');
  const post = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, categoryId: true, isActive: true, isDeleted: true,
      price: true, stock: true, category: { select: { slug: true } } },
  });
  const postMap = new Map(post.map(p => [p.id, p]));
  let fail = 0;
  for (const m of moves) {
    const before = liveMap.get(m.id)!, now = postMap.get(m.id)!;
    if (now.category.slug !== m.proposedCategorySlug) { fail++; console.log(`  FAIL ${m.name}: wanted ${m.proposedCategorySlug}, got ${now.category.slug}`); }
    if (now.price !== before.price) { fail++; console.log(`  PRICE CHANGED ${m.name}`); }
    if (now.stock !== before.stock) { fail++; console.log(`  STOCK CHANGED ${m.name}`); }
    if (now.isActive !== before.isActive || now.isDeleted !== before.isDeleted) { fail++; console.log(`  STATUS CHANGED ${m.name}`); }
  }
  console.log('  per-product checks:', fail === 0 ? 'ALL ' + moves.length + ' CORRECT' : fail + ' FAILURES');

  console.log('\n=== VERIFY nothing else moved ===');
  const totalAfter = await prisma.product.count();
  const liveAfter = await prisma.product.count({ where: { isActive: true, isDeleted: false } });
  const stockAfter = await prisma.product.aggregate({ _sum: { stock: true }, where: { isActive: true, isDeleted: false } });
  const priceAfter = await prisma.product.aggregate({ _sum: { price: true }, where: { isActive: true, isDeleted: false } });
  const orderItemsAfter = await prisma.orderItem.count();
  const cartItemsAfter = await prisma.cartItem.count();
  const line = (l: string, a: any, b: any) => console.log('  ' + l.padEnd(22) + String(a).padStart(8) + ' -> ' + String(b).padStart(8) + '  ' + (String(a) === String(b) ? 'OK' : 'CHANGED'));
  line('total product rows', totalBefore, totalAfter);
  line('live products', liveBefore, liveAfter);
  line('sum of stock', stockBefore._sum.stock, stockAfter._sum.stock);
  line('sum of price', priceBefore._sum.price, priceAfter._sum.price);
  line('order items', orderItemsBefore, orderItemsAfter);
  line('cart items', cartItemsBefore, cartItemsAfter);

  console.log('\n=== FINAL DISTRIBUTION ===');
  const finalCats = await prisma.category.findMany({
    where: { isActive: true, isDeleted: false },
    select: { slug: true, nameRw: true, _count: { select: { products: { where: { isActive: true, isDeleted: false } } } } },
    orderBy: { sortOrder: 'asc' },
  });
  let sum = 0;
  for (const c of finalCats) {
    sum += c._count.products;
    console.log('  ' + c.slug.padEnd(18) + String(c._count.products).padStart(3) + (c._count.products ? '' : '  (Vuba)'));
  }
  console.log('  TOTAL'.padEnd(20) + String(sum).padStart(3), sum === 107 ? 'OK' : 'MISMATCH');
  console.log('\nRESULT:', fail === 0 && liveAfter === liveBefore && sum === 107 ? 'SUCCESS' : 'REVIEW ABOVE');
  await prisma.$disconnect();
}
main().catch(e => { console.error('\nFAILED — transaction rolled back, nothing written:', e.message); process.exit(1); });
