# Thumbnails were downloading full-size artwork

**Date:** 2026-08-13 · **Commit:** see `fix(images): size thumbnails to the box they render in`

## What was wrong

Ten surfaces handed the stored image URL straight to the browser with no
Cloudinary transformation:

```tsx
<img src={item.image} className="h-10 w-10 object-cover" />
```

The browser downloaded the full asset, then threw away roughly 99% of the
pixels while painting a 40px square.

This is a **different defect** from the product-card ratio work in `ef009a4`.
That one was about *shape* (images arriving at different aspect ratios). This
one is about *weight* (images arriving at the wrong size entirely). Fixing the
cards did not touch these ten surfaces because they never called a helper.

## Measured, against live production data

| Surface | Stored URL | Rendered box | Before | After | Saved |
| --- | --- | --- | ---: | ---: | ---: |
| Product photo | 1024×1024 | 80px | 120,222 B | 1,893 B | **98.4%** |
| Order snapshot | `w_1200` | 56px | 286,104 B | 632 B | **99.8%** |
| Blog cover | `w_1200` | 768px | 24,150 B | 8,556 B | **64.6%** |

Averaged over 12 sampled catalogue images, the originals are **77 kB each**
(907 kB for 12).

### Why the order case is the worst

`OrderItem.image` is a snapshot frozen at checkout. Queried live:

- 16 of 163 order items carry an image
- **8 of those 16 are Cloudinary `/fetch/` URLs with a baked-in `w_1200`**

The live database holds orders of **44 and 43 items**. Those pages pulled
1200px artwork dozens of times over to paint a column of 56px squares. On a
Rwandan mobile connection that is the difference between a page that loads and
one that does not.

## The fix

A new `thumbnailImageUrl(url, size, { height? })` in
`src/lib/cloudinary-images.ts`. It pins **both** width and height and pads with
`c_pad,b_auto`.

`buildCloudinaryUrl` gained an optional `height`. The existing `ratio` flag and
every current caller behave exactly as before — verified by assertion, not by
assumption.

### Surfaces changed

| File | Box | Treatment |
| --- | --- | --- |
| `storefront/TrackOrderView.tsx` | 48px | `thumbnailImageUrl` |
| `app/account/orders/page.tsx` | 56px | `thumbnailImageUrl` |
| `app/account/wishlist/page.tsx` | grid | `productCardImageUrl` + srcSet |
| `wholesale/WholesaleDashboard.tsx` | 64px | `thumbnailImageUrl` |
| `admin/AdminView.tsx` | 40px | `thumbnailImageUrl` |
| `admin/AdminAnalytics.tsx` ×2 | 40px | `thumbnailImageUrl` |
| `admin/AdminOverview.tsx` ×2 | 40px | `thumbnailImageUrl` |
| `admin/AdminMobilePanel.tsx` | 32px | `thumbnailImageUrl` |
| `admin/AdminSettings.tsx` | 80×56 | `thumbnailImageUrl` + `height` |
| `blog/BlogPostContent.tsx` | 768px | `optimizedImageUrl` + srcSet |
| `admin/AdminView.tsx` (logo) | 120px | `optimizedImageUrl` |

## Decisions and deviations

**The wishlist got the product-card treatment, not a thumbnail.** It is a
product grid, so it now matches every other product grid on the site: 4:5 box,
`productCardSrcSet`, `aspect-[4/5]`. Leaving it `aspect-square` would have
reintroduced the exact inconsistency `ef009a4` removed.

**`c_pad`, not `c_fill`** — same reasoning as the card fix. Cropping a 40px
thumbnail of a bottle removes the label, which is the only thing that makes it
recognisable at that size.

**Thumbnails use `object-contain`, not `object-cover`.** The image is already
padded to the box, so `object-cover` would crop it a second time. This also
matches `CartDrawer`, which was set to `object-contain` in `ef009a4`.

**Blog cover kept width-only (`optimizedImageUrl`).** It is a 16:8 banner —
forcing a square box would letterbox it. Width-only is correct here.

**The admin logo is sized but the field is `null` in production.** Verified:
`storeSettings.logoUrl` is `null`, so no owner-uploaded logo exists yet and
this path renders the fallback today. Fixed anyway, because the moment the
owner uploads a logo it would have shipped at full resolution into a 120px
slot.

## My own errors, caught in the process

1. **I missed a surface.** My first pass mapped nine `<img>` tags. The test I
   wrote to guard against raw bindings immediately failed on a tenth — the
   admin header logo. The regression guard found a real gap in my own audit
   within a minute of being written.

2. **I shipped a broken regex into the test.** I wrote `[\s\S]{0,400?}` — an
   invalid quantifier that matched nothing, so the "thumbnails contain rather
   than crop" test would have passed vacuously. It only surfaced because the
   assertion had a bounds check (`toBeGreaterThan(0)`) on the match count.

3. **One assertion was vacuous and mutation testing proved it.** My clamp test
   asserted only `w_1`. Removing the clamp entirely still passed, because
   `buildCloudinaryUrl` clamps width independently. The real risk was the
   *height*: unclamped, `size 0` produces `height: 0`, which reads as "no
   height" and silently falls back to the cropping `c_fill` branch. The
   assertion now checks `w_1,h_1` **and** `c_pad` **and** `not c_fill`.

## Verification

`src/lib/__tests__/thumbnail-image-size.test.ts` — 25 tests.

**Mutation tested: 12 of 12 mutations caught.** Each mutation was confirmed to
have actually modified the file before trusting the result. Mutations included
reverting each surface to its raw binding, swapping `c_pad` for `c_fill`,
dropping the height (the original bug), removing the clamp, and making
thumbnails eager.

Gates: tsc clean · lint 0 errors / 6 pre-existing warnings · **1,376 tests
passing, up from 1,351** · build 66/66 · **shared JS 103 kB, unchanged**.

## Not done

- **No re-upload or re-processing.** All of this is delivery-time
  transformation. The stored originals are untouched.
- **`OrderItem.image` still stores `w_1200` URLs at write time.** The read path
  now rewrites them, so this is cosmetic rather than costly, but new snapshots
  will keep being written oversized. Worth fixing at the source later.
- **`AdminProductManager` / `AdminProductImageManager` previews left alone.**
  Those render `blob:` object URLs for files not yet uploaded; a Cloudinary
  transform cannot apply and the helper correctly passes them through.
