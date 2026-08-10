# Site-wide logo audit — where the FC monogram is, and where it is missing

Date: 2026-08-10. Audited every page, layout and shared component in `src/`,
plus every generated asset in `public/`, plus the live production site.

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

## 2. DEFECT — a stale "Z" logo is live on the domain

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

---

## 3. Surfaces showing a generic icon where the mark belongs

These are not empty — they render a placeholder from the icon library, which
reads as "unbranded template" rather than "this shop".

| Surface | Shows today | Why it matters |
|---|---|---|
| `AdminLoginScreen.tsx:236` | `Sparkles` in a circle | The door to the shop's admin panel |
| `AdminView.tsx:481` | `Shield` in a circle | Header fallback when no logo uploaded |
| `LogoUploader.tsx:167` | the plain text `FreedomCosmeticShop` | Tells the owner there is no logo when a default mark exists |
| `InvoicePrinter.tsx:192` | brand name as text only | A printed invoice is a customer-facing document |

`LogoUploader` is the most misleading of the four. Its "Current Logo" box shows
bare text when nothing is uploaded, so the owner is told the shop has no logo —
when in fact the FC monogram is the default everywhere.

---

## 4. Surfaces with no mark, where adding one is a judgement call

The navbar and footer already carry the mark on every one of these pages, so
adding another is reinforcement, not a fix. Listed for the owner to choose.

- `InformationPage.tsx` dark header band — covers **about, privacy, terms,
  shipping, returns** in a single edit
- `/contact` page header
- `/track-order` header (currently a generic `Package` icon)
- Empty states: empty bag, empty wishlist, no orders yet

Contrast is not a blocker on the dark band. Measured against `#1a1a1a`:
rose `#CA7370` 5.14:1, `#D07E7A` 5.76:1, `#DFA6A0` 8.37:1;
gold `#A8752D` 4.35:1, `#C99B54` 6.88:1, `#D9B26A` 8.72:1. All pass AA.

---

## 5. Deliberately NOT adding the mark

Recording these so the decision is not silently revisited:

- **Product cards, category tiles, search results.** Repeating a logo beside
  every product is watermarking. It competes with the product photo, which is
  the thing that actually sells.
- **The bottom navigation bar.** Five tap targets on a 360px screen. A logo
  would either shrink the targets below 44px or replace a navigation item.
- **Blog posts and FAQ body copy.** The chrome already brands the page.
- **`site.webmanifest` / theme colour.** Already correct at `#B76E79`.

---

## 6. Structural issue found while auditing (not a logo problem)

`/admin` renders **two stacked headers**. `admin/layout.tsx` renders
`AdminHeader`, and `admin/page.tsx` renders `<AdminView embedded />` whose own
sticky header at `AdminView.tsx:472` is **not** gated by the `embedded` prop —
only its tab strip is, at line 711.

This is pre-existing and unrelated to branding. I have not touched it. Flagging
it because I found it and it will cost the owner vertical space on every admin
screen. It should be fixed on its own, with its own tests.
