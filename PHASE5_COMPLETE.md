# Phase 5 — Coming Soon panel

Shipped `a4b675d`, live and verified.

## What changed for your customers

Tapping a category with no stock used to show:

> **No products match your filters**
> *Try removing a filter or using a broader search.*

The shopper had applied no filter. They tapped **Isabune** from the menu. The
message told them to undo something they never did, and offered a *Clear
filters* button that would have changed nothing. Seven of your sixteen
categories land here.

Now they see a proper panel:

> **Biraza vuba**
> Ntabwo turaba dufite ibicuruzwa byo mu cyiciro "Shampoo" muri iki gihe.
> Twandikire kuri WhatsApp tumenye icyo ushaka.
>
> [ Duhamagare tuvuge iki cyiciro ]  [ Reba ibicuruzwa byose ]

The WhatsApp button opens a chat with the category name already written into
the message, so you know what they came looking for.

## Two different messages, because your data says they are different

`_count` only counts products with stock above zero, so a category that **sold
out** looked exactly like one that **never had stock**. Telling a customer
"coming soon" about something they bought last month would be a lie.

I added a second count that ignores stock. Measured on your live database:

| category | live | ever had | shows |
|---|---|---|---|
| shampoo, nail-care, deodorant, hair-growth, natural-organic, mens-grooming | 0 | 0 | **Biraza vuba** / Coming soon |
| makeup | 0 | 6 rows, 2 past orders | **Byashize** / Out of stock right now |

## The wording question you left open

Two of your briefs disagreed — `"Bizaza vuba"` in one, `"Turaritegura — biraza
vuba!"` in another. You told me to choose, so I chose **"Biraza vuba"**:

- the **Vuba** badge already on your menu trains the eye on that word
- **"Byashize"** is what your shop already says for sold out (`common.sold_out`)

Reusing words your customers have already seen beats inventing a third phrase.
All four Kinyarwanda strings are marked `// verified-rw`.

## What I deliberately did not add

- **No launch date.** There isn't one. Promising a month you might miss is worse
  than saying nothing.
- **No "notify me".** SMS and email are both switched off in your config. A
  sign-up form would collect requests nobody can answer — the same reason the
  notify button was left off the product card.
- **No new page.** It renders on the category URL you already have, so links
  keep working and there is no extra redirect on a 3G connection.

## Safety: the panel only appears when the shopper did nothing wrong

`ProductGrid` is shared with search, so the condition is narrow. The panel shows
only when a category is selected **and** recognised, there is **no** search
term, **no** other filter is applied, and the count is zero. Anything else and
the original "no products match your filters" message is correct, and still
appears.

## Verified

- Contrast computed, not assumed — all six colour pairs pass WCAG AA
  (heading 16.43:1 · body 4.56:1 · WhatsApp 4.55:1 · Browse 5.18:1 · hover
  4.74:1 · icon 3.59:1 against a 3:1 requirement)
- 1,766 tests passing / 152 files, up from 1,744 / 151
- 22 new assertions, **18 mutations, all caught**
- Build 67/67. **Shared JS still 103 kB.** `/products` grew 0.1 kB. 0 packages added
- Live: all 7 empty categories return HTTP 200; all 8 strings and every `fcs-*`
  token confirmed present in the deployed bundle; stocked categories still show
  their products

### Two mistakes of mine, caught before release

**An invalid colour class.** I wrote `text-fcs-charcoal`. That token does not
exist — it is `fcs-text`. Tailwind emits nothing for an unknown class, so the
heading would have rendered in the browser default colour and **every test and
the build would still have passed**. Caught by checking each class against
`tailwind.config.ts`. Now rule 18.

**Four weak assertions.** Three mutations survived a green suite: unfiltering
one of two `_count` blocks, short-circuiting the WhatsApp guard with `true ||`,
and deleting a Kinyarwanda phrase that was also quoted in a comment. All three
were my tests being decorative rather than the code being wrong. Fixed and
re-verified. Now rules 19 and 20.

## Where the category work stands

| Phase | Status |
|---|---|
| 1–3 categories, schema, navigation | done |
| Auto-categorisation of 107 products | done |
| 4 admin category screen | done |
| 5 Coming Soon panel | **done** |

Six categories stay empty until you stock them — no amount of sorting fills
them: **makeup, nail care, deodorant, shampoo, hair growth, natural & organic**.
**Men's Grooming** is empty too, after your decision that all perfume belongs in
Fragrance; it needs aftershave, beard or razor stock.
