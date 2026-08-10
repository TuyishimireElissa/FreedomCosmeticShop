# Brand assets

Everything branded in `/public` is **generated**. Do not hand-edit those PNGs —
edit this pipeline and re-run it, otherwise the next regeneration silently
overwrites the change.

```bash
node   brand-src/render-mark.mjs        # SVG component -> PNG masters
python3 brand-src/build-brand-assets.py # masters -> every /public asset
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

- Rose `#DFA6A0` → `#CA7370` — the F and the profile, as a gradient
- Gold `#D9B26A` → `#A8752D` — the C and the leaf branch
- Cream `#FEF9F6` — apple-touch tile ground
- Charcoal `#1a1a1a` — "Freedom" wordmark
- Grey `#777777` — "COSMETIC SHOP" line (matches the Navbar tagline grey)

## Inputs

- `mark-full.png` / `mark-simple.png` — the FC monogram, rendered from
  `src/components/ui/logo.tsx` by `render-mark.mjs`. **The React component is
  the source of truth**: the site renders that SVG inline, and these PNGs exist
  only because favicons and OpenGraph cannot consume SVG. Never hand-edit them.
- `icon-mark.png` — the retired lotus mark. Kept so the previous brand can be
  regenerated if needed.
- `fonts/` — Playfair Display + Inter, fetched on first run (SIL Open Font
  Licence). Gitignored; ~3 MB of reproducible binaries do not belong in the repo.
- `icon-raw.png` — original generated art before background removal. Gitignored.

## Notes for whoever touches this next

- **Wordmarks are rendered from real font files, not from an image model.**
  Image models misspell "FreedomCosmeticShop" and drift off the brand hex.
  Typesetting them here makes spelling and colour exact and repeatable.
- **The tiny favicons use the simplified F+C art, not dilation.** `solidify()`
  floods every pixel to flat rose, which was right for the single-colour lotus
  and would erase the gold C. Sizes at or below 32px pass `simple=True`
  instead, which drops the leaf branch and facial profile — unreadable at
  16px — while keeping both brand colours. `solidify()` is retained but is no
  longer called by any icon.
- **The OG wordmark is measured, not fixed.** The FC monogram is 1.35:1 where
  the lotus was square, so it takes ~250px more of the 1200px canvas; the old
  fixed font size pushed "Shop" off the right edge. `build_og()` now shrinks
  the wordmark until the lockup fits the safe width.
- **Alpha is dilated only after the colour channels are flooded.** Fully
  transparent pixels carry RGB `0,0,0`; dilating alpha first fringes the mark
  with a black halo.
- **Regenerating is lossless-safe**: compression is part of the script, so the
  committed files are already the compressed output (426 KB → 145 KB).
