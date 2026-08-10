# Logo rebrand — Phase 0 audit

Read-only. No code written. Baseline **1,000 tests / 124 files**, HEAD `1430aab`.

---

## 1. Reference image analysis

`Screenshot 2026-08-07 194655.png` — 429 × 317 px, aspect **1.353**.

Colours extracted programmatically by HLS clustering, not by eye:

| Element | Measured | Notes |
|---|---|---|
| Background | `#FEF9F6` | warm cream, 26k px — **not** transparent in the source |
| Rose family | avg `#D07E7A`, 13,511 px | hue ≈ 0–10° |
| Gold family | avg `#C99B54`, 8,696 px | hue ≈ 30–40° |

**Both letters are gradient-filled, not flat.** Measured endpoints:

```
ROSE   darkest  #CA7370 at (209,230)   lightest #F1DAD7 at (230,256)
GOLD   darkest  #A8752D at (240,279)   lightest #ECDABE at (158,202)
```

Geometry, in source pixels:

| Element | x range | y range |
|---|---|---|
| F top bar | 98–251 | 31–59 |
| F stem | 118–149 | 60–250 |
| Woman's profile (rose) | 151–265 | 31–282 |
| C letter (gold) | 157–270 | 92–293 |
| Leaf branch (gold) | 271–361 | 96–303 |

An ASCII density map confirms the composition: the F is a serif letterform on
the left, the C is a thick crescent whose interior negative space **is** the
woman's profile, and a five-leaf branch enters from the lower right.

## 2. Current logo placements

**The brief says "text wordmark" — that is not what is there.** Every
placement already renders a raster image:

| File | Line | Current |
|---|---|---|
| `layout/Navbar.tsx` | 129 | `<Image src="/logo-icon.png">` (mobile, 9×9) |
| `layout/Navbar.tsx` | 138 | `<Image src="/logo.png">` (desktop lockup) |
| `layout/Footer.tsx` | 32 | `<Image src="/logo-icon.png">` 40×40 + `tradingName` text |
| `admin/AdminSidebar.tsx` | 124 | `<Image src="/logo-icon.png">` 40×40 + "FreedomCosmetic" text |
| `brand/BrandMark.tsx` | 7 | maps `icon → /logo-icon.png`, `badge → /logo-badge.png` |
| `wholesale/WholesaleInvoices.tsx` | 116 | `<BrandMark variant="badge">` |
| `app/layout.tsx` | 37–46 | favicon.ico, 16/32 png, apple-touch-icon |
| `public/site.webmanifest` | — | android-chrome 192/512, `theme_color #B76E79` |

## 3. 🚨 The existing logo is a completely different design

I profiled every asset in `/public` for gold pixels:

```
public/logo-icon.png      512x512   rose_px=4111   gold_px=0
public/logo.png           800x200   rose_px=697    gold_px=0
public/favicon-32x32.png  32x32     rose_px=37     gold_px=0
```

**Zero gold in any of them.** Rendering `logo-icon.png` confirms it: the
current mark is a **rose-pink lotus flower**, geometrically unrelated to the
FC monogram in the reference.

This is a **rebrand**, not a raster-to-SVG conversion. Worth stating plainly
because it changes the blast radius:

- 13 asset files in `/public` become stale (`logo.png`, `logo-icon.png`,
  `logo-badge.png`, `logo-dark.png`, favicons ×3, android-chrome ×2,
  apple-touch-icon, icon-maskable, og-image)
- `og-image.png` (46 KB) carries the old lotus and is what appears when
  anyone shares the shop on WhatsApp — the single most visible surface for a
  WhatsApp-first business
- `site.webmanifest` `theme_color` is `#B76E79`, tuned to the lotus rose

## 4. Colour conflicts with the shipped design system

The brief specifies `#C77B85` for the F and silhouette. Two problems:

**`#C77B85` is banned in this codebase.** It measures **3.18:1** on white,
fails WCAG AA, and `umweto-contrast.test.ts` fails the build if it appears.
It was rejected earlier this engagement for exactly this reason.

**It is also not the reference colour.** The measured rose is `#D07E7A`
average, `#CA7370` at its darkest — the brief's value is a different, lighter
pink.

The brief's gold `#D4A574` is likewise lighter than the measured `#C99B54`.

For a **logo** this matters less than for text: a decorative mark is exempt
from AA contrast, which applies to text and UI controls. But `#C77B85` cannot
appear in the file without failing an existing test, and I will not weaken
that test.

**Proposal:** use the measured values as gradients — rose `#CA7370 → #DFA6A0`,
gold `#A8752D → #D9B26A` — which reproduce the reference faithfully *and*
avoid the banned constant. If you want flat fills instead, `#C0706C` rose and
`#B98A3E` gold are the closest flat equivalents.

## 5. Favicon generation — tooling is available

`sharp` is already a dependency (used by Next.js image optimisation) and
Pillow is present. Both PNG and multi-resolution `.ico` can be generated in
this environment from the SVG. No new packages needed.

## 6. What I recommend changing in the plan

**The brief's `<Logo size="xl">` = 120px is fine, but `sm: 24px` is too small
for this mark.** The reference has a five-leaf branch and a facial profile
inside the C; at 24px those collapse into noise. The current code already
solves this with a two-asset strategy (`badge` for ≤32px, `icon` above). I
suggest the same: a **simplified monogram variant** for ≤32px that drops the
leaves and the facial detail, keeping just F + C.

**Phase 3 favicons should wait until Phase 1 is approved**, since every icon
derives from the final SVG.

---

## Decisions I need

| # | Question | Recommendation |
|---|---|---|
| 1 | Confirm this is a rebrand, replacing the lotus everywhere? | yes — otherwise two logos ship side by side |
| 2 | Colours: measured gradients vs the brief's `#C77B85`/`#D4A574`? | measured — `#C77B85` fails AA and breaks an existing test |
| 3 | Simplified variant at ≤32px? | yes — leaves and face are unreadable at 24px |
| 4 | Regenerate `og-image.png` too? | yes — it is the WhatsApp share preview |
| 5 | `theme_color` `#B76E79` → gold or keep rose? | keep rose; it matches `--fcs-brand` |
