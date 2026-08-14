/**
 * STEP 3 — applies Fix 1 (Dettol text repair) and Fix 2 (Veet size rename) in ONE transaction.
 * Owner-approved values, verbatim. Touches only the fields listed in FIX_DIFF.md.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const SOAP_CAT = 'cat_545de7c3ea70b1fdb590a';
const BODY_OIL_CAT = 'cat_ae64caabb30fdaa2635bc';

const VEET_DESC = (ml: string) =>
  'Veet Gold Turmeric Super Whitening Oil is a powerful brightening body oil enriched with turmeric extract. ' +
  'Reduces dark spots, evens skin tone, and leaves skin glowing. Available in ' + ml + '.';

const CHANGES = [
  { id: 'cmrxot6sb0002emxghg18nhay', label: 'Dettol 4-pack', data: {
      name: 'Dettol Fresh Antibacterial Soap (Pack of 4)',
      shortDescription: 'Antibacterial soap pack of 4 bars. Protects against 99.9% of germs.',
      description: 'Dettol Fresh Antibacterial Soap kills 99.9% of bacteria and germs. This pack contains 4 bars of fresh-scented antibacterial soap, ideal for the whole family. Gentle enough for daily use.',
      usageInstructions: 'Wet hands, lather soap, scrub for 20 seconds, rinse thoroughly.',
      costPrice: 1500, size: '4 bars', volume: null, sku: 'DETTOL-FRESH-4PACK',
      categoryId: SOAP_CAT } },
  { id: 'cmsgc7y6m0001rqg2omrg09c4', label: 'Veet 500ml', data: {
      name: 'Veet Gold Turmeric Super Whitening Oil 500ml',
      description: VEET_DESC('500ml'), categoryId: BODY_OIL_CAT } },
  { id: 'cmsgd1vne0001xr62k2p30osg', label: 'Veet 300ml', data: {
      name: 'Veet Gold Turmeric Super Whitening Oil 300ml',
      description: VEET_DESC('300ml'), categoryId: BODY_OIL_CAT } },
  { id: 'cmsgd7e0u0001rkiavi8qq4p0', label: 'Veet 200ml', data: {
      name: 'Veet Gold Turmeric Super Whitening Oil 200ml',
      description: VEET_DESC('200ml'), categoryId: BODY_OIL_CAT } },
];

// Fields that must be byte-identical before and after. Guards against accidental writes.
const IMMUTABLE = ['slug','price','compareAt','wholesalePrice','wholesaleActive','minWholesaleQty',
  'stock','lowStockThreshold','realSku','images','brandId','isActive','isDeleted','deletedAt',
  'featured','isNew','rating','reviewsCount','skinType','shortDescription'] as const;

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
  const ids = CHANGES.map(c => c.id);

  const before = await prisma.product.findMany({ where: { id: { in: ids } } });
  const beforeMap = new Map(before.map(p => [p.id, p]));
  if (before.length !== 4) throw new Error('expected 4 rows, got ' + before.length);

  // Reference-integrity counts captured BEFORE, re-checked AFTER.
  const refsBefore = await Promise.all(ids.map(async id => ({
    id,
    orderItems: await prisma.orderItem.count({ where: { productId: id } }),
    cartItems: await prisma.cartItem.count({ where: { productId: id } }),
    wishlist: await prisma.wishlist.count({ where: { productId: id } }),
  })));

  console.log('=== BEFORE ===');
  for (const c of CHANGES) {
    const p = beforeMap.get(c.id)!;
    console.log(` ${c.label.padEnd(14)} name="${p.name}" sku=${p.sku} cat=${p.categoryId} stock=${p.stock} active=${p.isActive}`);
  }

  console.log('\n=== APPLYING (single transaction) ===');
  const results = await prisma.$transaction(
    CHANGES.map(c => prisma.product.update({ where: { id: c.id }, data: c.data as any }))
  );
  console.log(' transaction committed, rows updated:', results.length);

  const after = await prisma.product.findMany({ where: { id: { in: ids } } });
  const afterMap = new Map(after.map(p => [p.id, p]));

  console.log('\n=== VERIFY: intended changes landed ===');
  let ok = true;
  for (const c of CHANGES) {
    const a = afterMap.get(c.id)!;
    for (const [k, want] of Object.entries(c.data)) {
      const got = (a as any)[k];
      const pass = want === null ? got === null : String(got) === String(want);
      if (!pass) { ok = false; console.log(`  FAIL ${c.label}.${k}: expected ${JSON.stringify(want)} got ${JSON.stringify(got)}`); }
    }
    console.log(`  ${c.label.padEnd(14)} -> "${a.name}" cat=${a.categoryId} ${ok ? 'OK' : ''}`);
  }

  console.log('\n=== VERIFY: nothing else moved ===');
  for (const c of CHANGES) {
    const b = beforeMap.get(c.id)! as any, a = afterMap.get(c.id)! as any;
    const touchedKeys = new Set(Object.keys(c.data));
    for (const f of IMMUTABLE) {
      if (touchedKeys.has(f)) continue;
      const bv = b[f] === null ? 'NULL' : String(b[f]);
      const av = a[f] === null ? 'NULL' : String(a[f]);
      if (bv !== av) { ok = false; console.log(`  DRIFT ${c.label}.${f}: ${bv} -> ${av}`); }
    }
  }
  console.log('  immutable fields unchanged:', ok ? 'CONFIRMED' : 'VIOLATION');

  console.log('\n=== VERIFY: references intact ===');
  for (const r of refsBefore) {
    const [oi, ci, wl] = await Promise.all([
      prisma.orderItem.count({ where: { productId: r.id } }),
      prisma.cartItem.count({ where: { productId: r.id } }),
      prisma.wishlist.count({ where: { productId: r.id } }),
    ]);
    const same = oi === r.orderItems && ci === r.cartItems && wl === r.wishlist;
    if (!same) ok = false;
    console.log(`  ${r.id.slice(0,12)}.. orders ${r.orderItems}->${oi} cart ${r.cartItems}->${ci} wishlist ${r.wishlist}->${wl} ${same ? 'OK' : 'CHANGED'}`);
  }

  console.log('\n=== VERIFY: catalogue integrity ===');
  const total = await prisma.product.count();
  const live = await prisma.product.count({ where: { isActive: true, isDeleted: false } });
  console.log('  total rows:', total, total === 128 ? 'OK' : 'UNEXPECTED');
  console.log('  live products:', live, live === 107 ? 'OK' : 'UNEXPECTED');

  fs.writeFileSync('/tmp/step3_before.json', JSON.stringify(before, null, 2));
  console.log('\nRESULT:', ok ? 'ALL CHECKS PASSED' : 'SOMETHING FAILED — REVIEW ABOVE');
  await prisma.$disconnect();
}
main().catch(e => { console.error('TRANSACTION FAILED, NOTHING COMMITTED:', e.message); process.exit(1); });
