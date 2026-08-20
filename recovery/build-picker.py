#!/usr/bin/env python3
"""
Build the offline image-matching tool.

WHY THIS EXISTS

After the 2026-08-20 database loss, 517 product images survived on Cloudinary
but every filename is a random hash (a1kd4wp9s0qw9cqedoeg.jpg) with no tags,
no context and no alt text. Nothing links an image to a product. The database
rows that held that link are gone.

Automated matching was considered and rejected. Clustering by upload time gives
255 clusters for 107 products, so any automatic assignment would be wrong more
often than right — and a confidently wrong product photo is worse than a blank
one, because nobody checks it again.

So: a human matches by eye, which takes minutes, and the tool makes that fast.

OUTPUT

recovery/image-picker.html — one self-contained file. Open it in any browser,
no server and no internet needed beyond loading the images themselves.

Regenerate with:  python3 recovery/build-picker.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IMAGES = json.loads((ROOT / 'cloudinary-images.json').read_text(encoding='utf8'))['images']
PRODUCTS = json.loads((ROOT / 'recovered-product-list.json').read_text(encoding='utf8'))['products']

for image in IMAGES:
    # Cloudinary transform: 200px thumbnails so the grid stays usable on 3G.
    image['thumb'] = image['url'].replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto,f_auto/')

DATA = json.dumps({'images': IMAGES, 'products': PRODUCTS}, ensure_ascii=False)

HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FreedomCosmeticShop — match images to products</title>
<style>
  :root {
    --brand-strong: #A85D68; --brand-text: #9B545F;
    --surface: #FAF8F6; --text: #1a1a1a; --muted: #6B7280; --border: #EDE7E3;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 Georgia, 'Times New Roman', serif; color: var(--text); background: var(--surface); }
  header { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid var(--border);
           padding: 12px 16px; box-shadow: 0 1px 2px rgba(31,25,24,.06); }
  h1 { margin: 0 0 4px; font-size: 18px; }
  .sub { color: var(--muted); font-size: 13px; }
  .bar { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; align-items: center; }
  button { font: inherit; cursor: pointer; border-radius: 12px; border: 1px solid var(--brand-strong);
           background: #fff; color: var(--brand-text); padding: 8px 14px; min-height: 44px; }
  button.primary { background: var(--brand-strong); color: #fff; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  .wrap { display: grid; grid-template-columns: 340px 1fr; gap: 16px; padding: 16px; align-items: start; }
  @media (max-width: 860px) { .wrap { grid-template-columns: 1fr; } }
  .panel { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
  .plist { max-height: 70vh; overflow: auto; }
  .p { padding: 9px 10px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; font-size: 14px; }
  .p:hover { background: var(--surface); }
  .p.active { background: var(--brand-strong); color: #fff; }
  .p.done { color: var(--muted); }
  .p.done::after { content: ' OK'; color: #1E874A; font-weight: bold; font-size: 11px; }
  .p.active.done::after { color: #fff; }
  .cat { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .p.active .cat { color: rgba(255,255,255,.85); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px;
          max-height: 70vh; overflow: auto; }
  .cell { border: 3px solid transparent; border-radius: 8px; overflow: hidden; cursor: pointer;
          background: #fff; padding: 0; line-height: 0; position: relative; min-height: auto; }
  .cell img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
  .cell.sel { border-color: var(--brand-strong); }
  .cell.sel::after { content: '✓'; position: absolute; top: 4px; right: 6px; color: #fff;
                     background: var(--brand-strong); border-radius: 50%; width: 22px; height: 22px;
                     display: grid; place-items: center; font-size: 13px; }
  .cell.used { opacity: .3; }
  .hint { font-size: 13px; color: var(--muted); margin: 0 0 10px; }
  textarea { width: 100%; height: 240px; font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace;
             border: 1px solid var(--border); border-radius: 8px; padding: 10px; }
  .count { font-weight: bold; color: var(--brand-text); }
</style>
</head>
<body>
<header>
  <h1>Match product photos</h1>
  <div class="sub">Pick a product on the left, then click its photo(s) on the right.
    <span class="count" id="progress">0 / 0 matched</span></div>
  <div class="bar">
    <button id="hideUsed">Hide used photos</button>
    <button id="onlyTodo">Show only unmatched products</button>
    <button class="primary" id="export">Export JSON</button>
    <button id="save">Save progress</button>
    <span class="sub" id="saved"></span>
  </div>
</header>

<div class="wrap">
  <div class="panel">
    <p class="hint">107 products recovered. Click one, then choose its photos.</p>
    <div class="plist" id="plist"></div>
  </div>
  <div class="panel">
    <p class="hint" id="ghint">Select a product first.</p>
    <div class="grid" id="grid"></div>
  </div>
</div>

<div class="wrap"><div class="panel" style="grid-column:1/-1">
  <p class="hint">Export — paste this into <code>recovery/image-matches.json</code>, then run
    <code>npm run catalog:apply-images</code>.</p>
  <textarea id="out" readonly placeholder="Click Export JSON"></textarea>
</div></div>

<script>
const DATA = __DATA__;
const KEY = 'fcs_image_matches_v1';
let matches = {};
try { matches = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { matches = {}; }
let active = null, hideUsed = false, onlyTodo = false;

const usedSet = () => new Set(Object.values(matches).flat());

function renderProducts() {
  const list = document.getElementById('plist');
  list.innerHTML = '';
  DATA.products.forEach((p, i) => {
    const done = (matches[p.slug] || []).length > 0;
    if (onlyTodo && done) return;
    const el = document.createElement('div');
    el.className = 'p' + (active === i ? ' active' : '') + (done ? ' done' : '');
    el.innerHTML = '<div class="cat">' + p.category + '</div>' + p.name;
    el.onclick = () => { active = i; render(); };
    list.appendChild(el);
  });
  const done = Object.values(matches).filter(v => v.length).length;
  document.getElementById('progress').textContent = done + ' / ' + DATA.products.length + ' matched';
}

function renderGrid() {
  const grid = document.getElementById('grid');
  const hint = document.getElementById('ghint');
  grid.innerHTML = '';
  if (active === null) { hint.textContent = 'Select a product first.'; return; }
  const p = DATA.products[active];
  const mine = matches[p.slug] || [];
  hint.innerHTML = 'Choosing photos for <b>' + p.name + '</b> — ' + mine.length + ' selected';
  const used = usedSet();
  DATA.images.forEach(img => {
    const isMine = mine.includes(img.publicId);
    const isUsed = used.has(img.publicId) && !isMine;
    if (hideUsed && isUsed) return;
    const b = document.createElement('button');
    b.className = 'cell' + (isMine ? ' sel' : '') + (isUsed ? ' used' : '');
    b.title = img.publicId + '  ' + img.w + 'x' + img.h + '  ' + img.at;
    b.innerHTML = '<img loading="lazy" src="' + img.thumb + '" alt="">';
    b.onclick = () => {
      const cur = matches[p.slug] || [];
      matches[p.slug] = cur.includes(img.publicId)
        ? cur.filter(x => x !== img.publicId)
        : cur.concat([img.publicId]);
      if (!matches[p.slug].length) delete matches[p.slug];
      persist(); render();
    };
    grid.appendChild(b);
  });
}

function persist() { try { localStorage.setItem(KEY, JSON.stringify(matches)); } catch (e) {} }
function render() { renderProducts(); renderGrid(); }

document.getElementById('hideUsed').onclick = e => {
  hideUsed = !hideUsed; e.target.textContent = hideUsed ? 'Show all photos' : 'Hide used photos'; render();
};
document.getElementById('onlyTodo').onclick = e => {
  onlyTodo = !onlyTodo; e.target.textContent = onlyTodo ? 'Show all products' : 'Show only unmatched products'; render();
};
document.getElementById('save').onclick = () => {
  persist();
  document.getElementById('saved').textContent = 'saved ' + new Date().toLocaleTimeString();
};
document.getElementById('export').onclick = () => {
  const byId = Object.fromEntries(DATA.images.map(i => [i.publicId, i]));
  const out = {
    generatedAt: new Date().toISOString(),
    note: 'Image matches made by hand. publicId and url both included so the importer needs no Cloudinary call.',
    matches: Object.entries(matches).filter(([, v]) => v.length).map(([slug, ids]) => ({
      slug,
      images: ids.map((id, index) => ({
        publicId: id, url: byId[id].url, isPrimary: index === 0, sortOrder: index,
      })),
    })),
  };
  document.getElementById('out').value = JSON.stringify(out, null, 2);
  document.getElementById('out').select();
};

render();
</script>
</body>
</html>
"""

output = HTML.replace('__DATA__', DATA)
(ROOT / 'image-picker.html').write_text(output, encoding='utf8')
print(f'Wrote recovery/image-picker.html  ({len(IMAGES)} images, {len(PRODUCTS)} products, {len(output)//1024} KB)')
