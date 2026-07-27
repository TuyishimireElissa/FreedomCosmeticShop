# Kinyarwanda Translation Review Checklist

## FreedomCosmeticShop

> **Status: APPROVED FOR PRODUCTION — FLUENT REVIEW CONFIRMED BY OWNER ON 15 JULY 2026**

The owner confirmed that a fluent Kinyarwanda speaker completed and approved the review. Reviewer identity and signature details were not provided in this workspace and should be retained in the owner's external compliance records.

## Files requiring review

1. `src/lib/i18n/translations/rw.ts`
2. `src/lib/search-vocabulary.ts`

Search for this marker in both files:

```text
🔍 REVIEW
```

English remains the source/default language in:

```text
src/lib/i18n/translations/en.ts
```

French is structure-only and disabled. French is not part of this review.

---

## Reviewer information

- Reviewer name: ______________________________________
- Rwanda region/district: ______________________________
- Relevant language or retail experience: ______________
- Review date: _________________________________________
- Translation version/commit: ___________________________

---

## Review principles

For every Kinyarwanda value, confirm:

- [ ] It sounds natural to a customer in Rwanda.
- [ ] It communicates the same meaning as the English source.
- [ ] It is not a literal word-for-word translation when natural speech differs.
- [ ] The tone is respectful, clear and suitable for an online shop.
- [ ] It is understandable in Kigali and across Rwanda.
- [ ] Grammar, spelling, apostrophes and punctuation are correct.
- [ ] Variables such as `{amount}`, `{count}`, `{phone}` and `{name}` remain unchanged.
- [ ] `RWF` remains unchanged wherever a currency is shown.
- [ ] Phone guidance preserves Rwanda’s `+250` format.
- [ ] Product names, brand names and payment-provider names are not incorrectly translated.
- [ ] Safety and payment instructions cannot be misunderstood.

---

# 1. Natural customer language

Review whether the wording sounds like language used naturally by Rwanda customers and shop staff.

- [ ] Short buttons are concise and immediately understandable.
- [ ] Headings are natural rather than overly formal.
- [ ] Error messages explain what happened and what to do next.
- [ ] Confirmation messages are reassuring.
- [ ] Promotional language is not exaggerated or misleading.
- [ ] Singular/plural wording remains understandable when `{count}` changes.

Notes:

```text


```

---

# 2. E-commerce terminology

Review these proposed terms especially carefully:

| English | Current Kinyarwanda direction | Reviewer-approved wording |
|---|---|---|
| Cart | Igitebo | |
| Checkout | Kwishyura | |
| Order | Ibyo watumije / Komande | |
| Add to Cart | Shyira mu gitebo | |
| Wishlist | Ibyo nifuza | |
| Delivery | Kugeza ibicuruzwa | |
| Refund | Gusubiza amafaranga | |
| Discount | Igabanyirizwa | |
| Wholesale | Kurangura | |
| Account | Konti | |
| Track Order | Kurikirana komande | |

Confirm:

- [ ] “Igitebo” is natural for an online shopping cart.
- [ ] “Komande” versus “ibyo watumije” is used consistently and appropriately.
- [ ] “Kurangura” is appropriate for wholesale customers.
- [ ] Payment, discount and refund wording is unambiguous.

---

# 3. Cosmetics terminology

Review every cosmetics term with someone familiar with Rwanda beauty retail.

| English | Proposed Kinyarwanda/local wording | Reviewer-approved wording |
|---|---|---|
| Skincare | Kwita ku ruhu | |
| Hair Care | Kwita ku musatsi | |
| Makeup | Ibikoresho byo kwisiga | |
| Body Care | Kwita ku mubiri | |
| Fragrance / Perfume | Imibavu / Parufe | |
| Lotion | Lisiyo | |
| Cream | Kremu / Amavuta | |
| Cleanser | Isabune yo mu maso | |
| Foundation | Fondasiyo | |
| Powder | Puderi | |
| Lipstick | Lipisitiki | |
| Mascara | Masikara | |
| Serum | Serumu / Amavuta y’uruhu | |
| Sensitive Skin | Uruhu rworoshye | |
| Oily Skin | Uruhu rugira amavuta menshi | |
| Dry Skin | Uruhu rwumye | |

Confirm:

- [ ] Common loanwords are spelled the way Rwanda customers expect.
- [ ] Product-benefit language does not make medical claims.
- [ ] “100% authentic” is translated accurately and requires owner verification.
- [ ] Skin-type descriptions are respectful and clear.

---

# 4. Navigation and mobile usability

Test on both desktop and a small-screen phone.

- [ ] EN/RW selector is easy to find.
- [ ] “Ikinyarwanda” is displayed correctly.
- [ ] Navbar labels fit without overlapping.
- [ ] Mobile menu labels fit within buttons.
- [ ] Category names do not overflow or wrap awkwardly.
- [ ] Longer Kinyarwanda labels remain readable.
- [ ] Screen-reader language changes to `rw` after selecting RW.
- [ ] Switching back to EN restores `lang="en"`.

Notes:

```text


```

---

# 5. Cart and checkout

- [ ] Empty-cart wording is natural.
- [ ] Coupon and discount wording is clear.
- [ ] Subtotal, delivery and total cannot be confused.
- [ ] Address labels match Rwanda address conventions.
- [ ] Province, district and sector wording is correct.
- [ ] Landmark instructions are easy to understand.
- [ ] “Cash on Delivery” clearly means payment when goods arrive.
- [ ] Order confirmation language clearly confirms successful placement.

---

# 6. MTN MoMo and Airtel Money

Review these instructions with someone who regularly uses Mobile Money.

- [ ] MTN MoMo wording uses familiar Rwanda terminology.
- [ ] Airtel Money wording is equally clear.
- [ ] The customer understands that a prompt appears on their phone.
- [ ] The customer understands where to enter their PIN.
- [ ] No text asks the customer to share their PIN with the shop or rider.
- [ ] Waiting, success, failure and timeout states are clearly different.
- [ ] `078/079` guidance remains correct for MTN.
- [ ] `072/073` guidance remains correct for Airtel.
- [ ] Amounts always retain `RWF`.

Security sentence to approve carefully:

```text
Your PIN is entered only on your phone. We never see it.
```

Reviewer-approved Kinyarwanda:

```text

```

---

# 7. Authentication, OTP and account security

- [ ] Login and registration language is clear.
- [ ] Password terminology is consistent.
- [ ] OTP is explained as a six-digit code.
- [ ] Expired and invalid OTP messages are distinguishable.
- [ ] Account-lockout language is calm but appropriately serious.
- [ ] Error messages do not reveal sensitive account information.
- [ ] “Do not share this code” is direct and understandable.
- [ ] Password-reset wording cannot be confused with account registration.

Notes:

```text


```

---

# 8. Order tracking and delivery

- [ ] Pending, confirmed, processing, shipped, delivered and cancelled are distinct.
- [ ] Returned and refunded are not translated as the same action.
- [ ] Rider information is clear.
- [ ] Estimated-delivery wording does not promise a guaranteed time.
- [ ] Delivery-address wording matches Rwanda usage.
- [ ] “Call rider” and “WhatsApp rider” actions are obvious.

Approved status translations:

| Status | Approved Kinyarwanda |
|---|---|
| Pending | |
| Confirmed | |
| Processing | |
| Shipped / Out for delivery | |
| Delivered | |
| Cancelled | |
| Returned | |
| Refunded | |

---

# 9. Errors and empty states

- [ ] Network-error wording tells the customer to check connectivity.
- [ ] Server-error wording does not blame the customer.
- [ ] Retry wording is clear.
- [ ] Empty cart, wishlist, orders and search results are distinct.
- [ ] Search hints use natural cosmetics vocabulary.
- [ ] No error message is threatening or confusing.

---

# 10. WhatsApp messages

- [ ] General-help message sounds natural.
- [ ] Order-help message keeps the order number variable.
- [ ] Product inquiry is polite and clear.
- [ ] Return request does not promise automatic approval.
- [ ] Wholesale inquiry uses appropriate business language.
- [ ] Share messages preserve product names, prices, `RWF` and URLs.

---

# 11. FAQ and policy summaries

- [ ] FAQ answers match actual store functionality.
- [ ] Return period matches the owner-approved policy.
- [ ] Delivery fees match production settings.
- [ ] Delivery time estimates are accurate.
- [ ] Authenticity claims are verified by the owner.
- [ ] Privacy wording matches the actual Privacy Policy.
- [ ] No translation creates a stronger legal promise than the English text.

---

# 12. Local search vocabulary

Review `src/lib/search-vocabulary.ts` separately.

For each mapping, confirm that a Rwanda customer using the term would reasonably expect the mapped products.

Required tests:

- [ ] `uruhu` should lead to skincare products.
- [ ] `umusatsi` should lead to haircare products.
- [ ] `amavuta` should lead to relevant oils, lotions or creams.
- [ ] `isabune` should lead to soap or cleansers.
- [ ] `kwisiga` should lead to makeup.
- [ ] `imibavu` should lead to fragrance/perfume.
- [ ] Loanword spellings reflect real Rwanda customer usage.
- [ ] Search mappings do not make medical claims.
- [ ] Broad terms do not create mostly irrelevant results.

Price-search language:

- [ ] `munsi ya 10000 RWF` is natural and clear.
- [ ] `kutarenza 10000 RWF` is natural and clear.
- [ ] `hagati ya 5000 na 15000 RWF` is natural and clear.

---

# Correction format

Provide every correction using this format:

```text
English key: checkout.momo_waiting_title
English source: Check Your Phone!
Current Kinyarwanda: Reba telefoni yawe!
Correction: [reviewer correction]
Reason: [grammar, natural speech, terminology, tone, or accuracy]
File: src/lib/i18n/translations/rw.ts
Line: [line number]
```

For search vocabulary:

```text
Search term: [current local term]
Current mappings: [mapped terms]
Correction: [replacement term or mappings]
Reason: [customer usage or relevance]
File: src/lib/search-vocabulary.ts
```

---

# Final technical verification after corrections

Run:

```bash
npm test
npm run typecheck
npm run build
```

Then verify manually:

- [ ] EN is still the default.
- [ ] RW switches without a reload.
- [ ] EN switches back without a reload.
- [ ] The selected language survives navigation.
- [ ] The selected language survives refresh.
- [ ] Mobile selector works.
- [ ] French is not selectable.
- [ ] RWF remains unchanged.
- [ ] No translation key is shown to customers.
- [ ] No page layout breaks.

---

# Reviewer sign-off

I confirm that I reviewed the Kinyarwanda translations and local search vocabulary for natural Rwanda usage, meaning, grammar, spelling, customer clarity and safety.

- Reviewer name: ______________________________________
- Signature: ___________________________________________
- Date: ________________________________________________
- Approved for production: **YES / NO**
- Outstanding corrections: _____________________________

## Owner approval

- Owner name: __________________________________________
- Signature: ___________________________________________
- Date: ________________________________________________
- Approved for production: **YES / NO**
