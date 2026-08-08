# Decisions taken under delegated authority

You said: *"do what you think is better in all of them until finished, then deploy."*
This records the judgement calls I made so you can reverse any of them.

---

## The four open WhatsApp questions — my answers

### 1. Cash on Delivery
**Decision: leave COD exactly as it is. No change.**

COD today is a real checkout method restricted to Kigali City
(`orders/create/route.ts:30`) and it sets the order straight to `CONFIRMED`.
It is the **only** payment path that currently works, because Paypack has no
credentials. Disabling it would leave the shop with no way to complete an
order at all.

Rewriting it into "record the method after delivery" is a checkout business-logic
change, and every brief you have written forbids that without explicit approval.
So I left it alone.

### 2. "Confirmed in minutes"
**Decision: never wrote it.**

Nothing in the codebase supports a response-time promise — no SLA, no staffing
config, no queue. The concierge card says what is true and nothing more. If you
want a time claim, tell me one you can actually honour and I will add it.

### 3. Nyarugenge sector vs nationwide
**Decision: nationwide, because the database says so.**

`DeliveryZoneSettings` has five active zones covering the whole country:

| Zone | Fee | Free over | Days |
| --- | ---: | ---: | ---: |
| Kigali same-day | 1,000 | 50,000 | 1 |
| Northern | 3,000 | 50,000 | 3 |
| Southern | 3,000 | 50,000 | 3 |
| Eastern | 3,500 | 50,000 | 3 |
| Western | 4,000 | 50,000 | 4 |

"Nyarugenge sector" appeared only in your prompt. The running system is the
source of truth, so I used it — and I did not surface any delivery claim that
these rows do not support.

### 4. WhatsApp message builder
**Decision: extend `whatsapp-service.ts`. Do not create `lib/whatsapp/`.**

Two builders already exist (`buildProductOrderMessage`, `buildCartOrderMessage`)
plus a wholesale set. A third module would be the point where they drift apart.
Nothing was built yet — this is the decision for whenever the WhatsApp checkout
work resumes.

---

## The "duplicate products" were not duplicates

Your brief listed Veet Gold Turmeric ×3 and Dabur Herbolene ×2 for deletion.
I checked before deleting and found **size variants**:

```
Veet Gold Turmeric Oil    200 ml   RWF  7,000
                          300 ml   RWF  8,000
                          500 ml   RWF 10,000
Dabur Herbolene Jelly     225 ml   RWF  3,500
                          425 ml   RWF  5,800
```

Prices rise consistently with volume. **Deleting them would have destroyed real
sellable stock.** The defect was presentational: size rendered at 11px above the
title while the price sat below in 16px bold, so three sizes looked like three
prices for one product. Size now sits beside the price. No product data changed.

---

## Deployed this session

| Commit | What |
| --- | --- |
| `3e6a949` | Warm Editorial design system |
| `9b1c68e` | Product size beside price |

**Design system:** 187 colour usages consolidated onto the existing `--fcs-*`
tokens, which previously had **zero** uses. Five near-identical roses reduced to
two intentional ones. Georgia display face on 8 large-type moments — 0 KB, since
it ships on every Android and iOS device. WhatsApp reframed from "Need Help?" to
*"Ntuzi icyakubera?"* on an ivory editorial card.

**Accessibility, measured:**
- 173 brand-rose text usages — 3.80:1 ❌ → **5.49:1 ✅**
- 66 muted-text usages — 2.54:1 ❌ → **4.83:1 ✅**

**Performance:** JS **103 kB unchanged** · CSS **+2 bytes** · 0 packages ·
0 font files · homepage TTFB **66 ms**.

**Tests:** 725 → **728 passing**, tsc clean, lint clean, build 65/65.

---

## What is still blocked on you

1. **Paypack credentials + KYC** — the code is fixed and deployed
   (`ff6e1bf` corrected six real integration defects), but no credentials are
   set, so `/api/config/features` still reports `payments.enabled: false`.
   Walkthrough is in `PAYPACK_SETUP_GUIDE.md`.
2. **Pindo SMS** — start the RURA Sender ID approval now; it takes 2–5 days
   and will otherwise become the next bottleneck.
3. **Your email and physical address** — still owner placeholders, so customers
   have no way to reach you except WhatsApp.
4. **Reviews** — 0 in the database. The biggest trust gap on a cosmetics site.
5. **Product content** — `howToUse` 0/101, `ingredients` 1/101. This is also
   why the beauty quiz returns nothing: it filters on fields that are empty.

Item 1 is the only one that decides whether the shop can take money.
