# Rebuilding the catalogue — practical guide

Written 2026-08-20, after the Supabase project loss.

---

## Where things stand

| | |
|---|---|
| Site | **up** — all APIs return 200 |
| Database | new project, London (eu-west-2), schema complete |
| Admin login | `+250790215965` / `Mamaga@@##12` — **change this** |
| Categories | 17 restored |
| Brands | 6 restored |
| Delivery zones | 5 restored with correct fees |
| **Products** | **0 — this is what you rebuild** |
| Product images | **safe on Cloudinary** |

---

## Backups now exist

```bash
npm run catalog:backup
```

Writes to `backups/`:

- `catalogue-latest.json` — full export, all 58 product fields, **committed to git**
- `catalogue-latest.csv` — open in Excel
- `catalogue-<timestamp>.json` — local copy, not committed

Read-only and safe to run against production at any time.

**Run it after every batch of products you add.** Then commit:

```bash
npm run catalog:backup && git add backups/catalogue-latest.* && git commit -m "backup: catalogue"
```

It exports catalogue only — **not** orders, users or reviews. Those hold
customer personal data and must not sit in a git repo. For those, turn on
Supabase PITR in the dashboard.

---

## Rebuilding the 107 products

Two files are ready:

| File | What it is |
|---|---|
| `recovery/recovered-product-list.csv` | 107 real names + slugs + categories, from the salvaged snapshot |
| `recovery/rebuild-import.json` | the same list as a fillable import file |

### The rule that matters most

**Do not change the slugs.** Google has all 107 indexed. Re-creating a product
under its original slug keeps its ranking and inbound links. Letting the admin
panel generate a new slug from the name loses that, silently.

### Option A — bulk, for many products at once

1. Open `recovery/rebuild-import.json`
2. For each product you want to add, fill in:
   - `shortDescription`, `description`
   - `price` (RWF, whole number)
   - `stock`
   - `images[0].url` and `publicId` from Cloudinary
   - then set `"enabled": true` on **that row only**
3. Import:
   ```bash
   npm run catalog:import recovery/rebuild-import.json
   ```

Rows left `"enabled": false` are ignored, so you can do 10 today and 10
tomorrow from the same file. The importer also skips any slug that already
exists, so re-running is safe.

### Option B — one at a time

Use the normal admin product form. Paste the slug from the CSV exactly.

### Then add the rich content

Once products exist, `/admin/products/import` fills the long-form fields —
Kinyarwanda names, ingredients, how-to-use, SEO keywords, WhatsApp share text.

Note that tool **only updates existing products**. It cannot create them and
cannot set price or stock. Create first (Option A or B), enrich second.

---

## Suggested order

1. **Change the admin password.**
2. **Enable Supabase PITR** in the dashboard — covers orders and customers,
   which the script deliberately does not.
3. Add your **top 20 best sellers** first, so the shop is usable quickly.
4. `npm run catalog:backup` and commit.
5. Work through the rest in batches, backing up after each.
6. Add rich content via `/admin/products/import` once the basics are in.

---

## One honest note

`recovery/rebuild-import.json` has **real names, slugs and categories**, and
**placeholders for everything else**. Prices, descriptions, stock and images
were never captured in the snapshot that survived, so they have to come from
your own records or the physical products.

Every unknown is `REPLACE_*` with `price: 0`, deliberately. A wrong price that
looks plausible is more dangerous than an obvious blank.
