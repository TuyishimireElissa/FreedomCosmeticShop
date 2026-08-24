# PHASE 0 — DIAGNOSTIC AUDIT: WHATSAPP PRICING BUTTON (MOBILE)

**Date:** 2026-08-24 · **Local HEAD:** `4128cc6` (== deployed, state READY)
**Scope:** read-only. No code changed. No database record touched. `git status` clean; 85/85 pricing tests green.

---

## VERDICT — ROOT CAUSE CONFIRMED IN SOURCE AND IN THE SHIPPED BUNDLE

**The button opens `https://wa.me/?text=…` — with NO recipient phone. WhatsApp then
shows its "choose a chat" picker instead of opening a specific chat, and on mobile
(especially iOS Safari, where the 302 hand-off to the `whatsapp://` custom scheme is
flaky) this silently fails or leaves a blank tab.**

| | |
|---|---|
| Call site | `AdminWhatsAppPricing.tsx:102` — `buildPriceRequestUrl(message)` — **one argument, no phone** |
| URL produced | `https://wa.me/?text=<encoded message>` (no `wa.me/<number>`) |
| Live redirect (measured) | `https://wa.me/?text=test` → **302** → `https://api.whatsapp.com/send/?text=test&type=custom_url&app_absent=0` (picker flow) |
| Same with a number | → `…send/?phone=250790215965&text=test&type=phone_number` (direct chat) |

Confirmed in the **shipped production bundle** (`page-3e75cb32141a2bdd.js`), not only in source:

```js
// minified buildPriceRequestUrl, live on freedomcosmeticshop.com
function y(e,t){let s=(t||"").replace(/\D/g,"");return"".concat(s?"https://wa.me/".concat(s):"https://wa.me/","?text=").concat(encodeURIComponent(e))}

// shipped anchor (matches source AdminWhatsAppPricing.tsx:275-277)
("a",{href:H,target:"_blank",rel:"noopener noreferrer",className:"…bg-fcs-whatsapp-pill…"})
```

`H` is the result of `y(message)` with no phone → `https://wa.me/?text=…`.

---

## CORRECTIONS TO THE BRIEF (I checked, do not take on faith)

1. **It is NOT `window.open`.** The button is a proper anchor
   (`href={waUrl} target="_blank" rel="noopener noreferrer"`) at
   `AdminWhatsAppPricing.tsx:275-277` — confirmed in source **and** in the shipped
   bundle. The popup-blocker hypothesis is **wrong**. The bug is the missing phone
   number, not a blocked popup.
2. **The text IS correctly encoded** — `encodeURIComponent(message)` at
   `whatsapp-pricing.ts:467-471`. Not an encoding bug.
3. **Button label:** the brief says "Ohereza ibiciro kuri WhatsApp". The shipped
   label is **"Fungura muri WhatsApp"** (`pricing.open_whatsapp`). The step heading
   is "1. Ohereza ubusabe bw'ibiciro". This is the same button — flagging so we
   audited the right element.

---

## OTHER FINDINGS

- `buildPriceRequestUrl(message, phone?)` **supports a phone** but no caller supplies
  one. Only call site in the app is line 102; tests call it with one arg too.
- **No father's number exists anywhere**: no config value, no env reference, no row
  mentioned in repo docs. Shop numbers in code: `+250790215965` (main / admin
  account — **do not assume this is the father**) and `+250785361796` (ALT ordering
  line), both in `src/lib/business-config.ts:30-31`. Live-DB check was not possible
  this session (credentials were not restored to the workspace yet); the last
  verified state from repo docs is 1 user (the admin).
- **The shop already has the right pattern** — `whatsapp-service.ts:188-198`:
  `isDesktopWhatsApp()` → `web.whatsapp.com/send?phone=…` on desktop,
  `wa.me/<number>?text=…` on mobile. The pricing feature built its own URL builder
  instead of reusing this, and dropped the phone.
- **There is no failure surface.** If WhatsApp never opens, the only fallback is the
  Copy button — and it copies the **message text** (not a link), with no hint that
  says "if WhatsApp didn't open, paste this into the chat with your father".
- `fitsWhatsAppUrl` also accepts a phone param; the length math is unaffected by
  adding one (~16 chars, well inside the 1800 budget).

---

## OPEN QUESTION FOR THE OWNER (blocks any fix)

**Who is the recipient? Please give the father's WhatsApp number** (international
format, e.g. +2507XXXXXXXX). Without it, the fix is guessing the wrong person —
`+250790215965` is the owner/admin account, and I will **not** assume it is the
father.

### RESOLVED 2026-08-24
Owner answered: `0790215965` → **+250790215965** — the same line as the
admin/owner account. Set on the owner's explicit instruction
(`QUICK_PRICE_WHATSAPP_RECIPIENT`). Flagged in chat + commit: if the father uses
a different number, one line in `business-config.ts` (or
`NEXT_PUBLIC_QUICK_PRICE_RECIPIENT`) changes it. Fixed in commits `b7211e1`,
`9aed9b3` (+ this doc).

## PROPOSED FIX DIRECTION (Phase 1 — NOT DONE YET, awaiting approval)

1. Pass the father's number into `buildPriceRequestUrl(message, phone)` at line 102
   (or reuse `buildWhatsAppUrl` from `whatsapp-service.ts`).
2. Use the shop's existing mobile/desktop switch: mobile → `wa.me/<number>?text=…`;
   desktop → `web.whatsapp.com/send?phone=…&text=…` (opens WhatsApp Web directly,
   no picker).
3. Drop `target="_blank"` (or handle via click) so the custom-scheme hand-off does
   not strand a blank tab on iOS.
4. Add a visible fallback hint next to the button: "If WhatsApp did not open, tap
   Copy and paste the message into the chat with [father]" — and keep the existing
   Copy button as the recovery path.
5. No new packages. No i18n key needed beyond existing + one new bilingual warning
   string. No cart/auth/payment code touched.

---

PHASE 0 DIAGNOSTIC COMPLETE — Awaiting approval for fix.
