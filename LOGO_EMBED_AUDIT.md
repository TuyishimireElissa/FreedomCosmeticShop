# Site-wide logo audit — where the FC monogram is, and where it is missing

Date: 2026-08-10. Audited every page, layout and shared component in `src/`,
plus every generated asset in `public/`, plus the live production site.

**Status: all fixes in sections 2, 3 and 4 are deployed** in commit `bd4bd2a`
and verified against live production, not against the build:

- `/logo.svg` now serves the monogram. Zero `Z`-template markers, traced F
  present, gold present.
- The traced F appears **5×** on privacy, terms, shipping, returns, about,
  contact and track-order, against a **4×** baseline on pages that only have
  the header and footer — one new instance each, exactly as intended.

The mark itself is done and approved. This document is only about **coverage**:
which surfaces show it, which show something else, and which show nothing.

---

## 1. Where the mark already renders correctly

Verified by reading the source and by confirming the traced path `M249.9 32.1`
is present in the HTML served from production.

| Surface | Component | Size |
|---|---|---|
| Site header (mobile) | `Navbar.tsx` | `md` 32px, simplified |
| Site header (desktop) | `Navbar.tsx` | `lg` 40px, full |
| Site footer | `Footer.tsx` | `sm` 24px |
| Admin sidebar | `AdminSidebar.tsx` | `sm` 24px |
| Admin header avatar fallback | `AdminHeader.tsx` | 36px |
| Login / Register / Forgot password | `(auth)/*` | 44–48px |
| Account page | `account/page.tsx` | 20px badge |
| Checkout | `checkout/page.tsx` | 24px badge |
| Wholesale invoice preview | `WholesaleInvoices.tsx` | 24px badge |
| Loading screen | `loading.tsx` | 64px |
| Error screen | `error.tsx` | 64px |
| 404 | `not-found.tsx` | 80px |
| Favicons, app icons, maskable icon | `public/*.png` | generated |
| OpenGraph / social preview | `public/og-image.png` | generated |
| Order confirmation email | `email.ts` → `/logo-icon.png` | 48px, live 200 OK |

All generated PNGs were re-measured this session and every one of them carries
both rose and gold pixels, so none of them silently reverted to the old lotus.

---

## 2. DEFECT — a stale "Z" logo was live on the domain (FIXED)

`public/logo.svg` is **not** the FreedomCosmeticShop mark. It is a leftover
starter-template logo: a dark charcoal rounded square with a white letter **Z**.
I rasterised it to confirm rather than guessing from the path data.

It is live right now: `https://freedom-cosmetic-shop.vercel.app/logo.svg`
returns it with HTTP 200.

It is referenced by `src/server/services/flutterwave.ts:224`, which passes it
to the card payment modal as the merchant logo. A customer paying by card would
see a **Z** where the shop's logo should be.

**Impact today: zero.** `/api/config/features` reports `card: false`, so the
Flutterwave modal never opens. This is a latent defect, not a live customer
problem — but it is a wrong-brand file being served from the shop's own domain,
and it is the kind of thing that only gets noticed at the worst moment.

Fixing the asset fixes the payment modal without touching any payment code.

**Fix applied.** `brand-src/render-mark.mjs` now generates `public/logo.svg`
from the same traced geometry as every other asset, so it cannot drift again.
No payment code was touched.

---

## 3. Surfaces showing a generic icon where the mark belongs (FIXED)

These were not empty — they rendered a placeholder from the icon library, which
reads as "unbranded template" rather than "this shop".

| Surface | Showed before | Why it matters |
|---|---|---|
| `AdminLoginScreen.tsx` | `Sparkles` in a circle | The door to the shop's admin panel |
| `AdminView.tsx` | `Shield` in a circle | Header fallback when no logo uploaded |
| `LogoUploader.tsx` | the plain text `FreedomCosmeticShop` | Tells the owner there is no logo when a default mark exists |
| `InvoicePrinter.tsx` | brand name as text only | A printed invoice is a customer-facing document |

All four now render the monogram. The invoice needed a new helper,
`src/lib/brand-logo-svg.ts`, because it builds an HTML string and cannot use a
React component — the helper reads the same path module rather than keeping a
second copy of the geometry. It sets `print-color-adjust: exact` so "save ink"
mode does not print the logo as a white silhouette.

`LogoUploader` is the most misleading of the four. Its "Current Logo" box shows
bare text when nothing is uploaded, so the owner is told the shop has no logo —
when in fact the FC monogram is the default everywhere.

---

## 4. Surfaces with no mark — three added, empty states left alone

The navbar and footer already carry the mark on every one of these pages, so
adding another is reinforcement rather than a fix.

**Added:**

- `InformationPage.tsx` dark header band — covers **about, privacy, terms,
  shipping, returns** in a single edit
- `/contact` page header — where a first-time buyer checks the shop is real
- `/track-order` header — was a generic `Package` icon, and this page is often
  the first thing someone sees, because it is reachable from a WhatsApp link

**Not added, owner's call:** the empty states (empty bag, empty wishlist, no
orders yet). A logo in an empty box is decoration; those screens need a clear
next action more than they need branding. Say the word and I will add it.

Contrast is not a blocker on the dark band. Measured against `#1a1a1a`:
rose `#CA7370` 5.14:1, `#D07E7A` 5.76:1, `#DFA6A0` 8.37:1;
gold `#A8752D` 4.35:1, `#C99B54` 6.88:1, `#D9B26A` 8.72:1. All pass AA.

---

## 5. Repeating surfaces — I argued against these and was wrong (NOW ADDED)

I originally declined to put the mark on product cards, category tiles and the
bottom nav. The owner overruled me and was right to. Recording my errors:

- **"A sixth nav item makes tap targets too small."** **False.** I never did
  the arithmetic. Six items at 320px, the narrowest common phone, is 53px
  each — above the 44px guideline. Not a real constraint.
- **"Watermarking fights the product photo."** A taste opinion presented as an
  engineering objection. The owner's call to make, not mine.

**The one real constraint, found by measuring:** the mark is ~2,950 characters
of path data simplified, ~6,500 full. A 48-product listing with an inline copy
per card is **~138 KB of extra DOM**. So the geometry is emitted once per page
as an SVG sprite (`LogoSprite`, mounted by `SiteChrome`) and each placement
renders a ~40 byte `<use>` reference (`LogoRef`). Verified live: the shipped
bundles contain **0** inlined copies of the path data.

Placements: product cards bottom-left (only free corner — discount top-left,
wishlist top-right, Quick View bottom-right), category tiles top-left, and the
bottom nav Home tab, where the mark **replaces** the house glyph rather than
adding a sixth item.

**Contrast bug caught before shipping:** photo category tiles carry a
bottom-up scrim protecting the caption, so the top-left corner shows the raw
photo. Against a beige or skin-tone image the rose measures **1.54:1** and the
mark vanishes. Photo tiles now get a white chip; flat colour tiles do not need
one. Product cards need no chip either — `object-contain` with padding on a
white-to-grey gradient keeps that corner near-white.

## 5b. Still deliberately NOT adding the mark

- **Blog posts and FAQ body copy.** The chrome already brands the page.
- **`site.webmanifest` / theme colour.** Already correct at `#B76E79`.

---

## 6. Architecture change made along the way

The traced paths used to be constants inside `src/components/ui/logo.tsx`.
They now live in `src/lib/brand-logo-paths.ts`, a plain data module.

Two reasons. Three consumers need the geometry and only one renders JSX — the
component, the invoice generator, and the PNG build. And Vitest runs with
`jsx: "preserve"`, so it cannot import a `.tsx` at all; the old tests scraped
the paths back out of the component with a regex, which meant a rename could
make the scrape return an empty string and **every bounds assertion would have
passed vacuously**. The tests now import the real values.

`vectorise-logo.py` and `render-mark.mjs` were repointed. I verified a full
round-trip rewrites the data module byte-identically and that both PNG masters
regenerate byte-identically, so the pipeline itself is unchanged.

---

## 7. Structural issue found while auditing (not a logo problem)

`/admin` renders **two stacked headers**. `admin/layout.tsx` renders
`AdminHeader`, and `admin/page.tsx` renders `<AdminView embedded />` whose own
sticky header at `AdminView.tsx:472` is **not** gated by the `embedded` prop —
only its tab strip is, at line 711.

This is pre-existing and unrelated to branding. I have not touched it. Flagging
it because I found it and it will cost the owner vertical space on every admin
screen. It should be fixed on its own, with its own tests.
