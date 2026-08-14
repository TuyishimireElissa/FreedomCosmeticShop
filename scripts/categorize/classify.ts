/**
 * Auto-categorisation analyser — READ ONLY. Writes no database changes.
 *
 * Implements the owner's RULE 1..4 in the exact priority order from the brief,
 * PLUS seven explicitly documented guards (A..G) that correct false positives
 * found by auditing v1 output against the real product descriptions.
 * Every guard is logged per-product so the owner can veto any of them.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

type Rule = { cat: string; kws: string[] };

// RULE 1 keyword table, in the brief's priority order. First match wins.
// Keywords marked (+) are additions beyond the brief; each is listed in the report.
const RULES: Rule[] = [
  { cat: 'shampoo',         kws: ['shampoo', 'shampooing', "isabune y'umusatsi"] },
  { cat: 'deodorant',       kws: ['deodorant', 'roll-on', 'antiperspirant', 'underarm'] },
  { cat: 'nail-care',       kws: ['nail polish', 'nail', 'manicure', 'pedicure', 'cuticle', 'nail art', 'nzara'] },
  { cat: 'baby-kids',       kws: ['baby', 'kids', 'children', 'toddler', 'infant', 'umwana', 'abana', 'diaper'] },
  { cat: 'soap',            kws: ['soap', 'isabune', 'savon' /*+*/] },
  { cat: 'petroleum-jelly', kws: ['vaseline', 'petroleum jelly', 'petroleum'] },
  { cat: 'whitening',       kws: ['whitening', 'brightening', 'lightening', 'whiten' /*+*/, 'brighten' /*+*/, 'lighten' /*+*/, 'eclaircissant' /*+*/, 'éclaircissant' /*+*/, 'fair', 'kwera', 'gutanga umucyo', 'dark spot'] },
  { cat: 'hair-growth',     kws: ['hair growth', 'growth oil', 'growth serum', 'biotin', 'castor oil for hair', 'hair vitamins', 'gukura umusatsi'] },
  { cat: 'body-oil',        kws: ['body oil', 'massage oil', 'body serum oil', "amavuta y'umubiri"] },
  { cat: 'makeup',          kws: ['lipstick', 'eyeshadow', 'foundation', 'mascara', 'eyeliner', 'concealer', 'blush', 'highlighter', 'bronzer', 'makeup', 'kwisiga', 'lip gloss', 'lip liner', 'primer', 'setting spray'] },
  { cat: 'mens-grooming',   kws: ['beard', 'shaving', 'shave', 'aftershave', 'razor', 'trimmer'] }, // Q3: grooming TOOLS only. 'for men'/'male'/'men's' removed — a men's perfume is still a perfume.
  { cat: 'fragrance',       kws: ['perfume', 'eau de parfum', 'eau de toilette', 'cologne', 'fragrance', 'body spray', 'body mist', 'imibavu', 'parfum' /*+*/, 'brume' /*+*/] },
  { cat: 'haircare',        kws: ['conditioner', 'hair oil', 'hair mask', 'hair treatment', 'leave-in', 'curl cream', 'hair spray', 'hair gel', 'pomade', 'hair butter', 'edge control', 'detangler', 'umusatsi', 'relaxer', 'texturizer', 'keratin', 'hair color', 'hair dye', 'curl activator' /*+*/, 'scalp' /*+*/] },
  { cat: 'skincare',        kws: ['face wash', 'cleanser', 'toner', 'facial serum', 'moisturizer', 'face cream', 'sunscreen', 'spf', 'face mask', 'eye cream', 'retinol', 'hyaluronic acid', 'niacinamide', 'acne', 'uruhu', 'facial', 'face'] },
  { cat: 'body-care',       kws: ['body wash', 'body lotion', 'body cream', 'body butter', 'body scrub', 'exfoliator', 'shower gel', 'hand cream', 'foot cream', 'cocoa butter', 'shea butter', 'umubiri', 'body milk', 'bathing' /*+*/, 'bath' /*+*/] },
];

// Short/substring-prone words that must match on a word boundary.
const STRICT = new Set(['fair','nail','male','bath','face','baby','kids','soap','primer','blush','petroleum','vaseline','scalp','parfum','brume','savon','lighten','whiten','brighten']);

function hit(hay: string, kw: string): boolean {
  if (STRICT.has(kw)) return new RegExp(`(^|[^a-z])${kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z]|$)`,'i').test(hay);
  return hay.includes(kw);
}

// Brand names that embed a category keyword but describe nothing about the product.
const BRAND_NOISE = ['bath & baby week','bath & body week','american dream','white express','lab white','kojic white','more up','touch me','mega growth'];
const scrub = (s: string) => BRAND_NOISE.reduce((a,b)=>a.split(b).join(' '), s.toLowerCase());

function classify(text: string) {
  for (const r of RULES) for (const kw of r.kws) if (hit(text, kw)) return { cat: r.cat, kw };
  return null;
}

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
  const cats = await prisma.category.findMany({
    where: { isActive: true, isDeleted: false },
    select: { id: true, slug: true, name: true, nameRw: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  });
  const bySlug = new Map(cats.map(c => [c.slug, c]));
  const products = await prisma.product.findMany({
    where: { isActive: true, isDeleted: false },
    select: { id: true, name: true, slug: true, description: true, shortDescription: true,
      usageInstructions: true, price: true, stock: true, createdAt: true, categoryId: true,
      category: { select: { slug: true } }, brand: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  // GUARD F: products the owner categorised by hand are never auto-moved.
  const OWNER_ASSIGNED = new Set(['The Original Sunny Isle Jamaican Black Castor Oil']);

  // Owner decisions applied in Step 3. The engine must NOT undo them.
  // The three Veet oils are body oils by the owner's call (Fix 2, Option A);
  // the keyword table would drag them back to whitening on the word "Whitening".
  const PINNED: Record<string, string> = {
    cmsgc7y6m0001rqg2omrg09c4: 'body-oil', // Veet Gold ... 500ml
    cmsgd1vne0001xr62k2p30osg: 'body-oil', // Veet Gold ... 300ml
    cmsgd7e0u0001rkiavi8qq4p0: 'body-oil', // Veet Gold ... 200ml
  };

  const rows = products.map(p => {
    const nameT = scrub(p.name);
    // GUARD A: Rule 2 reads shortDescription + description ONLY.
    // usageInstructions describes a ROUTINE ("before shampooing", "after showering"),
    // not the product, and produced a false "shampoo" classification in v1.
    const descT = scrub([p.shortDescription, p.description].filter(Boolean).join(' . '));
    const headline = scrub((p.shortDescription || '').slice(0, 130));

    const n = classify(nameT);
    const d = n ? null : classify(descT);
    let target = n?.cat ?? d?.cat ?? p.category.slug;
    let confidence: 'HIGH'|'MEDIUM'|'LOW' = n ? 'HIGH' : d ? 'MEDIUM' : 'LOW';
    let rule = n ? `RULE1 name~"${n.kw}"` : d ? `RULE2 desc~"${d.kw}"` : 'RULE4 no keyword matched';
    const guards: string[] = [];

    // GUARD D: an explicit hair signal in the NAME outranks a body/skin butter-or-cream keyword.
    // Fixes "Cantu Shea Butter for Natural Hair Coconut Curling Cream" -> body-care.
    if ((target === 'body-care' || target === 'skincare') && /(^|[^a-z])(hair|curl|scalp|umusatsi)([^a-z]|$)/i.test(nameT)) {
      target = 'haircare'; confidence = 'HIGH';
      rule = 'GUARD D hair signal in name outranks body/skin keyword'; guards.push('D');
    }

    // GUARD E: a product literally named "body oil" is a body oil, not petroleum jelly,
    // even when the brand is Vaseline. Fixes "Vaseline Intensive Care ... Body Oil".
    if (target === 'petroleum-jelly' && hit(nameT, 'body oil')) {
      target = 'body-oil'; confidence = 'HIGH';
      rule = 'GUARD E name says "body oil" — brand Vaseline is not the product type'; guards.push('E');
    }

    // GUARD C: a bathing/cleansing/beauty BAR is a soap. Fixes "Dove Original Beauty Cream Bar".
    if ((target === 'body-care' || target === 'skincare') &&
        /(^|[^a-z])bar([^a-z]|$)/i.test(nameT) &&
        /(cleansing bar|bathing bar|beauty bar|beauty cream bar)/i.test(descT)) {
      target = 'soap'; confidence = 'MEDIUM';
      rule = 'GUARD C name says "Bar" + description says cleansing/bathing bar'; guards.push('C');
    }

    // GUARD G: whitening stated as the HEADLINE claim promotes over a generic face/body match.
    // Fixes "Purec Egyptian Gold 14Days Face & Body Lotion" (short desc opens "A high-performance whitening...").
    if ((target === 'skincare' || target === 'body-care') &&
        ['whitening','brightening','lightening','skin-lightening','whiten','brighten','lighten'].some(k => hit(headline, k))) {
      target = 'whitening'; confidence = 'MEDIUM';
      rule = 'GUARD G whitening is the headline claim in shortDescription'; guards.push('G');
    }

    // GUARD F: never auto-move an owner-assigned product.
    if (OWNER_ASSIGNED.has(p.name) && target !== p.category.slug) {
      rule = `GUARD F owner assigned this product by hand on ${p.createdAt.toISOString().slice(0,10)} — held at "${p.category.slug}" (engine wanted "${target}")`;
      target = p.category.slug; confidence = 'LOW'; guards.push('F');
    }

    // PIN: owner's Step 3 decision wins over every rule and guard.
    if (PINNED[p.id]) {
      target = PINNED[p.id]; confidence = 'HIGH';
      rule = 'PINNED by owner decision (Step 3, Fix 2 Option A) — body oil, not whitening';
      guards.push('PIN');
    }

    // Every other category whose keyword also appears in the name — the "fits 2+" list.
    const alts: string[] = [];
    for (const r of RULES) {
      if (r.cat === target) continue;
      for (const kw of r.kws) if (hit(nameT, kw)) { alts.push(`${r.cat} (name~"${kw}")`); break; }
    }

    return { id: p.id, name: p.name, slug: p.slug, price: p.price, stock: p.stock,
      brand: p.brand?.name ?? null, createdAt: p.createdAt.toISOString(),
      currentCategoryId: p.categoryId, currentCategorySlug: p.category.slug,
      proposedCategorySlug: target, proposedCategoryId: bySlug.get(target)?.id ?? p.categoryId,
      confidence, rule, guards, alternatives: alts, changed: target !== p.category.slug };
  });

  fs.writeFileSync('/tmp/plan_v2.json', JSON.stringify({ generatedAt: new Date().toISOString(), cats, rows }, null, 2));
  console.log('products:', rows.length, '| changes:', rows.filter(r => r.changed).length);
  console.log('HIGH', rows.filter(r=>r.changed&&r.confidence==='HIGH').length,
              '| MEDIUM', rows.filter(r=>r.changed&&r.confidence==='MEDIUM').length,
              '| LOW/stay', rows.filter(r=>!r.changed).length);
  console.log('\nslug              now -> after');
  for (const c of cats) {
    const now = rows.filter(r => r.currentCategorySlug === c.slug).length;
    const after = rows.filter(r => r.proposedCategorySlug === c.slug).length;
    console.log(c.slug.padEnd(18), String(now).padStart(3), '->', String(after).padStart(3),
      after === 0 ? ' EMPTY' : (now === 0 ? ' NEWLY STOCKED' : ''));
  }
  console.log('\n--- guards fired ---');
  for (const g of ['A','C','D','E','F','G']) {
    const f = rows.filter(r => r.guards.includes(g));
    if (f.length) console.log(' GUARD ' + g + ':', f.map(x => x.name.slice(0,52)).join(' | '));
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
