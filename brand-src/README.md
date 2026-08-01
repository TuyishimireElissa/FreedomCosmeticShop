# Brand assets

Everything branded in `/public` is **generated**. Do not hand-edit those PNGs —
edit this pipeline and re-run it, otherwise the next regeneration silently
overwrites the change.

```bash
python3 brand-src/build-brand-assets.py
```

## What it produces

| File | Size | Used by |
| --- | --- | --- |
| `public/logo.png` | 800×200, transparent | Navbar (`md:` and up) |
| `public/logo-dark.png` | 800×200, charcoal bg | Dark surfaces |
| `public/logo-icon.png` | 512×512 | Navbar (mobile), Footer, Admin sidebar |
| `public/og-image.png` | 1200×630 | OpenGraph / Twitter / WhatsApp previews |
| `public/favicon.ico` | 16 / 32 / 48 | Browser tabs, bookmarks |
| `public/favicon-16x16.png`, `favicon-32x32.png` | | Browser tabs |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen |
| `public/android-chrome-192x192.png`, `-512x512.png` | | Android / PWA |
| `public/icon-maskable-512.png` | 512×512 | Android maskable (safe zone) |

## Colours

- Rose gold `#B76E79` — the mark, accents
- Charcoal `#1a1a1a` — "Freedom" wordmark
- Grey `#777777` — "COSMETIC SHOP" line (matches the Navbar tagline grey)

## Inputs

- `icon-mark.png` — the flower mark: transparent, flattened to exactly `#B76E79`.
  Committed, because it is the one asset that is not deterministically reproducible.
- `fonts/` — Playfair Display + Inter, fetched on first run (SIL Open Font
  Licence). Gitignored; ~3 MB of reproducible binaries do not belong in the repo.
- `icon-raw.png` — original generated art before background removal. Gitignored.

## Notes for whoever touches this next

- **Wordmarks are rendered from real font files, not from an image model.**
  Image models misspell "FreedomCosmeticShop" and drift off the brand hex.
  Typesetting them here makes spelling and colour exact and repeatable.
- **The tiny favicons use a dilated silhouette.** The petal filigree is lovely
  at 180px and turns to mush at 16px, so `solidify()` grows the alpha for the
  small sizes. Do not "fix" this by reusing the detailed 512px art.
- **Alpha is dilated only after the colour channels are flooded.** Fully
  transparent pixels carry RGB `0,0,0`; dilating alpha first fringes the mark
  with a black halo.
- **Regenerating is lossless-safe**: compression is part of the script, so the
  committed files are already the compressed output (426 KB → 145 KB).
