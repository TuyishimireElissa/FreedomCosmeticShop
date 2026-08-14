# Categorization Plan — Phase 1 Report

Generated 2026-08-14T20:56:25.947Z from the live production database.
**No database change has been made.** This is a proposal.

- Products analysed: **107** (active, not soft-deleted)
- Proposed moves: **67**
- Stay put: **40**
- Snapshot: PRODUCT_CATEGORY_SNAPSHOT_20260814T205552Z.json (128 rows, replay-verified)

## A. HIGH confidence moves (63)

| # | Product | From | To | Reason |
|---|---|---|---|---|
| 1 | Baby Line Perfumed Baby Petroleum Jelly | skincare | **baby-kids** | RULE1 name~"baby" |
| 2 | Bouchou Soft Soap Moisturizing & Soothing (Gentle Baby & Family Bar) | skincare | **baby-kids** | RULE1 name~"baby" |
| 3 | Boudchou Baby Ointment (Pommade Bébé) | skincare | **baby-kids** | RULE1 name~"baby" |
| 4 | Boudchou Baby Petroleum Jelly / Crème Onctueuse Protectrice | body-care | **baby-kids** | RULE1 name~"baby" |
| 5 | Johnson's Baby Aqueous Cream Lightly Fragranced 350ml | skincare | **baby-kids** | RULE1 name~"baby" |
| 6 | Vaseline Blue Seal Baby Perfumed Petroleum Jelly | skincare | **baby-kids** | RULE1 name~"baby" |
| 7 | Zwitsal Baby Body Lotion with Avocado Oil – 400ml | body-care | **baby-kids** | RULE1 name~"baby" |
| 8 | Rinju Beauté Réelle Body & Hand Cream | skincare | **body-care** | RULE1 name~"hand cream" |
| 9 | Vaseline Intensive Care Cocoa Radiant Vitalizing Body Oil | body-care | **body-oil** | GUARD E name says "body oil" — brand Vaseline is not the product type |
| 10 | Kristal Fragrance Mist (Brume Parfumée) | body-care | **fragrance** | RULE1 name~"fragrance" |
| 11 | Movit Sheen Hair Spray Olive & Argan Oil | body-care | **haircare** | RULE1 name~"hair spray" |
| 12 | Dear Body NOIR for men Body Mist | fragrance | **mens-grooming** | RULE1 name~"for men" |
| 13 | Dear Body SCARLET for Men Body Mist | fragrance | **mens-grooming** | RULE1 name~"for men" |
| 14 | More Up Aloe Vera & Vitamin E 2-in-1 Pure Petroleum Jelly | skincare | **petroleum-jelly** | RULE1 name~"petroleum jelly" |
| 15 | Vaseline Blue Seal Aloe Vera Perfumed Petroleum Jelly 240ml | skincare | **petroleum-jelly** | RULE1 name~"vaseline" |
| 16 | Vaseline Blue Seal Cocoa Butter Perfumed Petroleum Jelly | skincare | **petroleum-jelly** | RULE1 name~"vaseline" |
| 17 | Vaseline Blue Seal Men Cooling Perfumed Petroleum Jelly 240ml | mens-grooming | **petroleum-jelly** | RULE1 name~"vaseline" |
| 18 | Vaseline Blue Seal Original 100% Pure Petroleum Jelly 240ml | skincare | **petroleum-jelly** | RULE1 name~"vaseline" |
| 19 | Silky Cool Cucumber Face and Body Scrub Cream | body-care | **skincare** | RULE1 name~"face" |
| 20 | Silky Cool Milk Face and Body Scrub | body-care | **skincare** | RULE1 name~"face" |
| 21 | Asantee Papaya & Honey Soap 125g | body-care | **soap** | RULE1 name~"soap" |
| 22 | ASANTEE Tamarind & Goat Milk Herbal Soap (สบู่สมุนไพรมะขามผสมนมแพะ) | body-care | **soap** | RULE1 name~"soap" |
| 23 | Carambola Black Spots Herbal Soap with Honey | body-care | **soap** | RULE1 name~"soap" |
| 24 | Dalan Citron Frais Classic Multipurpose Soap | body-care | **soap** | RULE1 name~"soap" |
| 25 | Dalan Glycerin Soap Organic Lime | skincare | **soap** | RULE1 name~"soap" |
| 26 | Dalan Glycerin Soap Organic Olive Oil | skincare | **soap** | RULE1 name~"soap" |
| 27 | Dalan Glycerin Soap with Organic Argan Oil | body-care | **soap** | RULE1 name~"soap" |
| 28 | Dettol Juniors Glycerine Soap | body-care | **soap** | RULE1 name~"soap" |
| 29 | Dettol Original Antibacterial Soap 100g | body-care | **soap** | RULE1 name~"soap" |
| 30 | Duru Fresh Sensations Beauty Soap – Floral Infusion (Pack of 4) | body-care | **soap** | RULE1 name~"soap" |
| 31 | Duru Fresh Sensations Beauty Soap – Ocean Breeze (Pack of 4) | body-care | **soap** | RULE1 name~"soap" |
| 32 | Duru Natural Olive Soap with Olive Oil Extract | body-care | **soap** | RULE1 name~"soap" |
| 33 | Duru Perfume Beauties Beauty Soap – Orchid Charm (Pack of 4) | body-care | **soap** | RULE1 name~"soap" |
| 34 | EVA Bathing Soap Refresh (Coconut & Lavender) | body-care | **soap** | RULE1 name~"soap" |
| 35 | Extract Whitening Herbal Soap Papaya Calaman | body-care | **soap** | RULE1 name~"soap" |
| 36 | Geisha Caring Coconut & Honey Soap | body-care | **soap** | RULE1 name~"soap" |
| 37 | Geisha Soothing Aloe Vera & Honey Soap (Strong & Long Lasting Daily Bathing Bar) | body-care | **soap** | RULE1 name~"soap" |
| 38 | Imperial Leather Timeless Classic Bathing Bar Soap | body-care | **soap** | RULE1 name~"soap" |
| 39 | KOJIC WHITE X2 Double Whitening Suite Soap (By Nano D-ne) | skincare | **soap** | RULE1 name~"soap" |
| 40 | Kojie San Classic Skin Lightening Soap | skincare | **soap** | RULE1 name~"soap" |
| 41 | Lab White Atom Whitening Egg Yolk Soap | body-care | **soap** | RULE1 name~"soap" |
| 42 | MPYA Rungu-Medi Anti-Bacterial Soap | body-care | **soap** | RULE1 name~"soap" |
| 43 | NINA Family Soap Bathing Bar (Rose & Peach) | body-care | **soap** | RULE1 name~"soap" |
| 44 | Original Pure Egyptian Magic Whitening Gold Soap (With Egg Yolk & L-Glutathione) | body-care | **soap** | RULE1 name~"soap" |
| 45 | Papaya Carrot Gluta Soap Scrub Beads | body-care | **soap** | RULE1 name~"soap" |
| 46 | Protex Gentle Anti-Germ Bar Soap | body-care | **soap** | RULE1 name~"soap" |
| 47 | Pyary Ayurvedic Turmeric Soap | body-care | **soap** | RULE1 name~"soap" |
| 48 | soap | skincare | **soap** | RULE1 name~"soap" |
| 49 | Touch Me! PLEASE Whitening Soap for Oily Skin (With Natural Extracts) | body-care | **soap** | RULE1 name~"soap" |
| 50 | Turmeric Super Whitening Soap (Body Repair, Anti Dark Spots & Anti-aging) | body-care | **soap** | RULE1 name~"soap" |
| 51 | Veet Gold Vitamin C Body Corrector Soap (7 Days Whitening and Glowing Soap SPF15) | body-care | **soap** | RULE1 name~"soap" |
| 52 | Victoria Super Colorful (VSC) Carrot 7 Days Extra Whitening Soap | body-care | **soap** | RULE1 name~"soap" |
| 53 | DRODAVEN Whitening Papaya + Milk Body Lotion | body-care | **whitening** | RULE1 name~"whitening" |
| 54 | LA TCHADIENNE Whitening Lotion Super White Face & Body Lotion | body-care | **whitening** | RULE1 name~"whitening" |
| 55 | Piment Doux 5 Days Extra Whitening Milk (Lait Traitant) | body-care | **whitening** | RULE1 name~"whitening" |
| 56 | Pure Egyptian Magic Whitening Serum Gold 14 Days Face & Body Serum | skincare | **whitening** | RULE1 name~"whitening" |
| 57 | RDL Papaya Extract Whitening Hand & Body Lotion + Vitamin E | body-care | **whitening** | RULE1 name~"whitening" |
| 58 | Roushun Turmeric with Vitamin C Lighten Body Lotion | skincare | **whitening** | RULE1 name~"lighten" |
| 59 | Veet Gold Turmeric Super Whitening Oil | body-care | **whitening** | RULE1 name~"whitening" |
| 60 | Veet Gold Turmeric Super Whitening Oil | skincare | **whitening** | RULE1 name~"whitening" |
| 61 | Veet Gold Turmeric Super Whitening Oil | skincare | **whitening** | RULE1 name~"whitening" |
| 62 | White Express Lait Éclaircissant – Complexe Duo-Éclat | body-care | **whitening** | RULE1 name~"éclaircissant" |
| 63 | White Express Lait Éclaircissant – Extra Whitening Lotion 500ml | body-care | **whitening** | RULE1 name~"whitening" |

## B. MEDIUM confidence moves (4) — need your review

| # | Product | From | To | Reason |
|---|---|---|---|---|
| 1 | Dabur Herbolene Aloe Jelly | skincare | **petroleum-jelly** | RULE2 desc~"petroleum jelly" |
| 2 | Dabur Herbolene Aloe Jelly | skincare | **petroleum-jelly** | RULE2 desc~"petroleum jelly" |
| 3 | Dove Original Beauty Cream Bar 100g | body-care | **soap** | GUARD C name says "Bar" + description says cleansing/bathing bar |
| 4 | Purec Egyptian Gold 14Days Face & Body Lotion | skincare | **whitening** | GUARD G whitening is the headline claim in shortDescription |

## C. Stay put (40)

Every one of these was confirmed by a keyword rule that matched the category they are already in. **Zero products fell through to RULE 4** — there is no true "unclassifiable" product in the catalogue.

| Product | Category | Confirmed by |
|---|---|---|
| American Dream Cocoa Butter Lemon Cream | body-care | RULE1 name~"cocoa butter" |
| Bismid Skin Glowing Bath with Carrot Oil | body-care | RULE1 name~"bath" |
| 777 MEN Super Love Perfume Set (2 Pcs) | fragrance | RULE1 name~"perfume" |
| BARA Eau De Parfum 2-Piece Luxury Gift Set | fragrance | RULE1 name~"eau de parfum" |
| Barakkat Rouge 540 Eau De Parfum | fragrance | RULE1 name~"eau de parfum" |
| Barakkat Rouge 540 Fragrance Mist (Brume Parfumée) | fragrance | RULE1 name~"fragrance" |
| Bath & Baby Week Beauty Summery Body Mist | fragrance | RULE1 name~"body mist" |
| Bath & Body Week LES FLORAUX Lune Smell Body Mist | fragrance | RULE1 name~"body mist" |
| BLEU DE PARFUM Paris 50ml Eau de Parfum Set | fragrance | RULE1 name~"eau de parfum" |
| Change De Canal Fragrance Mist (Brume Parfumée) | fragrance | RULE1 name~"fragrance" |
| Coconut Fantasy Fine Fragrance Mist | fragrance | RULE1 name~"fragrance" |
| Dear Body Autumn Cicada Fine Fragrance Mist | fragrance | RULE1 name~"fragrance" |
| Dear Body Be Myself Fine Fragrance Mist | fragrance | RULE1 name~"fragrance" |
| Dear Body Border Girl Fine Fragrance Mist | fragrance | RULE1 name~"fragrance" |
| Dear Body Brilliant Sunflower Fine Fragrance Mist | fragrance | RULE1 name~"fragrance" |
| Dear Body Noir Fragrance Mist | fragrance | RULE1 name~"fragrance" |
| Dear Body Sweet Vanilla Fine Fragrance Mist | fragrance | RULE1 name~"fragrance" |
| Intense Wood Fragrance Mist (Brume Parfumée) | fragrance | RULE1 name~"fragrance" |
| MAYORA Eau De Parfum 2-Piece Luxury Gift Set | fragrance | RULE1 name~"eau de parfum" |
| ONIRO Fragrance Mist (Brume Parfumée) | fragrance | RULE1 name~"fragrance" |
| Oud For Glory (Bade'e Al Oud) Fragrance Mist (Brume Parfumée) | fragrance | RULE1 name~"fragrance" |
| SCANOAL A PARIS Eau de Parfum Spray Set (2 Pcs) | fragrance | RULE1 name~"eau de parfum" |
| Super Love Eau De Parfum 2-Piece Gift Set | fragrance | RULE1 name~"eau de parfum" |
| SUPER LOVE' RED Eau de Parfum 2PCS Gift Set | fragrance | RULE1 name~"eau de parfum" |
| Sweet Rose Eau de Parfum Spray for Women | fragrance | RULE1 name~"eau de parfum" |
| VERLORNA La Vaid East Bellah Fragrance Mist – 250ml | fragrance | RULE1 name~"fragrance" |
| VERLORNA MY LOVE Fragrance Mist – 250ml | fragrance | RULE1 name~"fragrance" |
| VERLORNA SUAWACE Fragrance Mist – 250ml | fragrance | RULE1 name~"fragrance" |
| Verlorna World Barakkat Rouge 540 Body Mist | fragrance | RULE1 name~"body mist" |
| Verlorna World Fantsly | fragrance | RULE2 desc~"fragrance" |
| Verlorna World For Away Body Mist | fragrance | RULE1 name~"body mist" |
| Verlorna World Ideal Fragrance Mist | fragrance | RULE1 name~"fragrance" |
| Yara Pink Fragrance Mist (Brume Parfumée) | fragrance | RULE1 name~"fragrance" |
| Cantu Shea Butter for Natural Hair Coconut Curling Cream | haircare | GUARD D hair signal in name outranks body/skin keyword |
| DAX Pomade Now With Lanolin | haircare | RULE1 name~"pomade" |
| Mega Growth Break-Free Hair & Scalp Food | haircare | RULE1 name~"scalp" |
| MIADI Hair Curl Activator Gel | haircare | RULE1 name~"curl activator" |
| MIADI Hair Mouldin' Gel Wax (With Olive Oil) | haircare | RULE2 desc~"scalp" |
| The Original Sunny Isle Jamaican Black Castor Oil | haircare | RULE2 desc~"scalp" |
| Exfoliating Gold Face & Body Scrub (With Natural Exfoliating Fruit Shells & Gold Pearl) | skincare | RULE1 name~"face" |

## D. Distribution

| sortOrder | Category (RW) | slug | now | after | change |
|---|---|---|---|---|---|
| 1 | Kwita ku ruhu | skincare | 23 | **3** | -20 |
| 2 | Kwita ku mubiri | body-care | 44 | **3** | -41 |
| 3 | Isabune | soap | 0 | **33** | +33 |
| 4 | Imibavu | fragrance | 33 | **32** | -1 |
| 5 | Kwera no Kurangaza | whitening | 0 | **12** | +12 |
| 6 | Kwita ku musatsi | haircare | 6 | **7** | +1 |
| 7 | Ibikoresho byo kwisiga | makeup | 0 | **0** | — |
| 8 | Ibikoresho by'abagabo | mens-grooming | 1 | **2** | +1 |
| 9 | Abana | baby-kids | 0 | **7** | +7 |
| 10 | Amavuta y'Umubiri | body-oil | 0 | **1** | +1 |
| 11 | Vaseline | petroleum-jelly | 0 | **7** | +7 |
| 12 | Gukura Umusatsi | hair-growth | 0 | **0** | — |
| 13 | Kamere | natural-organic | 0 | **0** | — |
| 14 | Ifarasi | nail-care | 0 | **0** | — |
| 15 | Deodorante | deodorant | 0 | **0** | — |
| 16 | Shampoo | shampoo | 0 | **0** | — |

Stocked categories: **5 → 10**. Vuba badges: **11 → 6**.

## E. Products that genuinely fit 2+ categories (36)

Primary chosen by rule priority; alternatives recorded here as the brief requires.

| Product | Primary | Also matches |
|---|---|---|
| Baby Line Perfumed Baby Petroleum Jelly | **baby-kids** | petroleum-jelly (name~"petroleum jelly"), fragrance (name~"perfume") |
| Bouchou Soft Soap Moisturizing & Soothing (Gentle Baby & Family Bar) | **baby-kids** | soap (name~"soap") |
| Boudchou Baby Petroleum Jelly / Crème Onctueuse Protectrice | **baby-kids** | petroleum-jelly (name~"petroleum jelly") |
| Johnson's Baby Aqueous Cream Lightly Fragranced 350ml | **baby-kids** | fragrance (name~"fragrance") |
| Vaseline Blue Seal Baby Perfumed Petroleum Jelly | **baby-kids** | petroleum-jelly (name~"vaseline"), fragrance (name~"perfume") |
| Zwitsal Baby Body Lotion with Avocado Oil – 400ml | **baby-kids** | body-care (name~"body lotion") |
| Vaseline Intensive Care Cocoa Radiant Vitalizing Body Oil | **body-oil** | petroleum-jelly (name~"vaseline") |
| Cantu Shea Butter for Natural Hair Coconut Curling Cream | **haircare** | body-care (name~"shea butter") |
| Dear Body NOIR for men Body Mist | **mens-grooming** | fragrance (name~"body mist") |
| Dear Body SCARLET for Men Body Mist | **mens-grooming** | fragrance (name~"body mist") |
| Vaseline Blue Seal Aloe Vera Perfumed Petroleum Jelly 240ml | **petroleum-jelly** | fragrance (name~"perfume") |
| Vaseline Blue Seal Cocoa Butter Perfumed Petroleum Jelly | **petroleum-jelly** | fragrance (name~"perfume"), body-care (name~"cocoa butter") |
| Vaseline Blue Seal Men Cooling Perfumed Petroleum Jelly 240ml | **petroleum-jelly** | fragrance (name~"perfume") |
| Exfoliating Gold Face & Body Scrub (With Natural Exfoliating Fruit Shells & Gold Pearl) | **skincare** | body-care (name~"body scrub") |
| Silky Cool Cucumber Face and Body Scrub Cream | **skincare** | body-care (name~"body scrub") |
| Silky Cool Milk Face and Body Scrub | **skincare** | body-care (name~"body scrub") |
| Duru Perfume Beauties Beauty Soap – Orchid Charm (Pack of 4) | **soap** | fragrance (name~"perfume") |
| EVA Bathing Soap Refresh (Coconut & Lavender) | **soap** | body-care (name~"bathing") |
| Extract Whitening Herbal Soap Papaya Calaman | **soap** | whitening (name~"whitening") |
| Geisha Soothing Aloe Vera & Honey Soap (Strong & Long Lasting Daily Bathing Bar) | **soap** | body-care (name~"bathing") |
| Imperial Leather Timeless Classic Bathing Bar Soap | **soap** | body-care (name~"bathing") |
| KOJIC WHITE X2 Double Whitening Suite Soap (By Nano D-ne) | **soap** | whitening (name~"whitening") |
| Kojie San Classic Skin Lightening Soap | **soap** | whitening (name~"lightening") |
| Lab White Atom Whitening Egg Yolk Soap | **soap** | whitening (name~"whitening") |
| NINA Family Soap Bathing Bar (Rose & Peach) | **soap** | body-care (name~"bathing") |
| Original Pure Egyptian Magic Whitening Gold Soap (With Egg Yolk & L-Glutathione) | **soap** | whitening (name~"whitening") |
| Touch Me! PLEASE Whitening Soap for Oily Skin (With Natural Extracts) | **soap** | whitening (name~"whitening") |
| Turmeric Super Whitening Soap (Body Repair, Anti Dark Spots & Anti-aging) | **soap** | whitening (name~"whitening") |
| Veet Gold Vitamin C Body Corrector Soap (7 Days Whitening and Glowing Soap SPF15) | **soap** | whitening (name~"whitening"), skincare (name~"spf") |
| Victoria Super Colorful (VSC) Carrot 7 Days Extra Whitening Soap | **soap** | whitening (name~"whitening") |
| DRODAVEN Whitening Papaya + Milk Body Lotion | **whitening** | body-care (name~"body lotion") |
| LA TCHADIENNE Whitening Lotion Super White Face & Body Lotion | **whitening** | skincare (name~"face"), body-care (name~"body lotion") |
| Pure Egyptian Magic Whitening Serum Gold 14 Days Face & Body Serum | **whitening** | skincare (name~"face") |
| Purec Egyptian Gold 14Days Face & Body Lotion | **whitening** | skincare (name~"face"), body-care (name~"body lotion") |
| RDL Papaya Extract Whitening Hand & Body Lotion + Vitamin E | **whitening** | body-care (name~"body lotion") |
| Roushun Turmeric with Vitamin C Lighten Body Lotion | **whitening** | body-care (name~"body lotion") |

## F. RISK ASSESSMENT

### RISK 1 — HIGH — Skincare and Body Care are gutted

| Category | Now | After | Loss |
|---|---|---|---|
| Kwita ku mubiri (body-care) | 44 | **3** | −93% |
| Kwita ku ruhu (skincare) | 23 | **3** | −87% |

These are the two biggest categories in the shop and the rules empty them almost completely. This is not a bug in the rules — it is what the brief's priority order literally says: a bar of soap that is also body care is filed under Soap, because Soap is checked first. But the outcome is that **the two categories a customer is most likely to tap now hold three items each.**

**No category drops to zero**, so nothing breaks structurally.

Options:
- **1a — Accept.** Categories become strict and precise. Soap is soap; body care is what is left over.
- **1b — Keep soap and whitening products in a "browse" sense too.** Not possible today: `Product.categoryId` is a single non-nullable field. One product = one category. Multi-category needs a schema change (new join table) — a much bigger job, and outside this brief.
- **1c — Move fewer things.** For example: leave the 12 whitening lotions in body-care and only move actual bar soaps. You decide the line.

### RISK 2 — HIGH — The homepage's four big tiles all change

`CategoryGrid` on the homepage picks the four categories with the most products, largest first.

- Now: **Kwita ku mubiri (44), Imibavu (33), Kwita ku ruhu (23), Kwita ku musatsi (6)**
- After: **Isabune (33), Imibavu (32), Kwera no Kurangaza (12), Abana (7)**

Your homepage would lead with Soap and Whitening. That is a merchandising decision, not a technical one. Worth a deliberate yes or no.

### RISK 3 — MEDIUM — The skin quiz loses most of its stock

`/api/quiz/recommend` hard-filters `category.slug` to `skincare`, `haircare`, or `makeup` **and** `stock > 0`.

| Quiz path | Pool now | Pool after |
|---|---|---|
| Skin | 23 | **3** |
| Hair | 6 | 7 |
| Makeup | 0 | 0 |

A customer answering "skin" would be recommended from three products. The quiz would still return results, so no crash — but the recommendations get thin. Fixing it properly means widening the quiz's skin path to include whitening / petroleum-jelly / soap. That is a code change and belongs in its own commit, after this one.

### RISK 4 — MEDIUM — Your mobile menu changes while you are testing it

You are on a device right now checking a layout of **5 stocked + 11 Vuba**. After this migration it becomes **10 stocked + 6 Vuba**, and `stockedFirst()` reorders the tiles.

Vuba badge would disappear from: Isabune, Kwera no Kurangaza, Abana, Amavuta y'Umubiri, Vaseline.
Vuba badge stays on: Ibikoresho byo kwisiga, Gukura Umusatsi, Kamere, Ifarasi, Deodorante, Shampoo.

**Recommendation: finish your mobile test first and give the green light on the current layout.** Otherwise you will be testing a layout that no longer exists. This is a data change and can be applied any time — there is no reason to race it.

### RISK 5 — LOW — Bulk moves

Four moves are large: soap 33, whitening 12, baby-kids 7, petroleum-jelly 7. The brief asks me to flag anything that looks like a mass reassignment. All four are keyword-driven and individually listed in section A, so they are auditable — but 33 products moving on the word "soap" is exactly the kind of thing worth a second look.

### RISK 6 — LOW — One stale test fixture

`src/lib/__tests__/category-nav-data-driven.test.ts:272` builds a **synthetic** fixture using today's real numbers (23, 44, 33, 0…). It is hand-written sample data, not a live query, so it will **not** fail after the migration. No test change needed. Confirmed by reading the file, not assumed.

## G. DATA QUALITY PROBLEMS FOUND (not categorisation — please read)

Auditing the catalogue turned up five things that are worth your attention regardless of what you decide about categories. **I have changed none of them.**

### G1 — A junk test product is live on your shop

| field | value |
|---|---|
| name | `soap` |
| slug | `soap` |
| description | `ggy` |
| usageInstructions | `4ff` |
| price | 2,300 RWF |
| stock | **96** |
| brand | Freedom Glow |
| created | 2026-07-23 |
| id | `cmrxot6sb0002emxghg18nhay` |

This is visible to customers right now at `/products/soap`. It looks like a test row from when the shop was set up. It also has 96 units of stock, so it counts as real inventory. **My rules would move it to Isabune, which would put a product called "soap" with the description "ggy" at the top of your new Soap category.** Recommend you soft-delete or fix it instead. Your call — I have not touched it.

### G2 — "Veet Gold Turmeric Super Whitening Oil" exists three times

| price | stock | category | slug |
|---|---|---|---|
| 10,000 | 50 | body-care | `veet-gold-turmeric-super-whitening-oil` |
| 8,000 | 50 | skincare | `...-1` |
| 7,000 | 50 | skincare | `...-2` |

Same name, three different prices. Either these are three different sizes (and the names should say so), or two are accidental duplicates. A customer seeing the same product at 7,000 / 8,000 / 10,000 will not trust the shop.

### G3 — "Dabur Herbolene Aloe Jelly" exists twice

225 ml at 3,500 RWF and 425 ml at 5,800 RWF. This one is **probably legitimate** — two sizes — but the names are identical, so the customer cannot tell them apart in a grid. Suggest renaming to include the size.

### G4 — Your product metadata is nearly empty

Measured across the 107 live products:

| field | filled |
|---|---|
| description | 107/107 |
| shortDescription | 107/107 |
| usageInstructions | 107/107 |
| volume | 103/107 |
| size | 98/107 |
| skinType | 23/107 |
| ingredients | **4/107** |
| brandId | **2/107** |
| hairType | **0/107** |
| shades / shade | 0–1/107 |
| fragranceNotes | **0/107** |
| countryOfOrigin | 0/107 |

Two consequences for this task:
- **Rule 3 (brand-based) is effectively dead.** Only 2 of 107 products have a brand record, and both are "Freedom Glow". Brand names like Cantu, Nivea, Movit and Vaseline exist only inside the product *name* text, so I matched them there. The brand table itself gave me nothing.
- **`tags` does not exist.** The brief asks me to read `product.tags`. There is no such column on the Product model. I used name + shortDescription + description instead.

### G5 — Three categories have no possible inventory

`makeup`, `nail-care`, `deodorant` — I searched every product name **and** every description for `lipstick, mascara, foundation, eyeshadow, eyeliner, concealer, blush, nail, manicure, deodorant, roll-on, antiperspirant`. **Zero hits anywhere in the catalogue.** Same for `shampoo`: zero, except one description that says "before shampooing" about a castor oil.

These are not categorisation gaps. You do not stock these products. `hair-growth` and `natural-organic` are likewise empty — several soaps say "herbal" or "organic", but they are soaps first under the brief's own priority order.

So after this migration **six categories still show Vuba**, and no amount of re-categorising will fill them. Only new stock will.

## H. Deviations from the brief — flagged

I did not follow the brief literally in seven places. Each one is here so you can reverse any of them.

**1. `usageInstructions` excluded from Rule 2.** The brief says analyse the description. My first run also read usage text and classified *The Original Sunny Isle Jamaican Black Castor Oil* as **Shampoo**, because its instructions say "…before shampooing". Usage text describes a routine, not the product. Excluded it. (**GUARD A**)

**2. Brand names stripped before matching.** *Bath & Baby Week Beauty Summery Body Mist* is a perfume. The rules saw "baby" and "bath" in the brand name and tried to file it under Abana. I strip nine brand phrases before matching: `bath & baby week, bath & body week, american dream, white express, lab white, kojic white, more up, touch me, mega growth`. (**GUARD B**)

**3. A cleansing bar is soap.** *Dove Original Beauty Cream Bar* has no "soap" in its name, so no rule caught it — it would have gone to Skincare on the word "face". Its description calls it a cleansing bar. Guard fires only when the name contains "Bar" **and** the description says cleansing/bathing/beauty bar. Marked MEDIUM. (**GUARD C**)

**4. Hair beats butter.** *Cantu Shea Butter for Natural Hair Coconut Curling Cream* matched "shea butter" → Body Care. It is a hair product; the brief's own Rule 3 says Cantu = haircare. If the name contains hair/curl/scalp, haircare wins over a body/skin keyword. (**GUARD D**)

**5. A body oil is not petroleum jelly.** *Vaseline Intensive Care Cocoa Radiant Vitalizing Body Oil* matched the brand word "vaseline" → Vaseline category. It is a body oil. The brief itself says only file it under Vaseline if that is the product. This single product is the only thing in Amavuta y'Umubiri. (**GUARD E**)

**6. Owner-assigned products are never auto-moved.** You added *Sunny Isle Jamaican Black Castor Oil* to Haircare by hand on 2026-08-14. Your manual choice outranks my rules. The guard is in the code, though after fixing #1 the engine agrees with you anyway, so it did not need to fire. (**GUARD F**)

**7. Headline whitening claim promotes.** *Purec Egyptian Gold 14Days Face & Body Lotion* matched "face" → Skincare, but its own summary opens "A high-performance **whitening** face and body lotion". When whitening is the first claim in shortDescription, it wins. Marked MEDIUM. Same logic caught *Roushun Turmeric with Vitamin C Lighten Body Lotion*. (**GUARD G**)

**Keywords I added** beyond the brief's list, because the catalogue is partly French/Kinyarwanda: `savon`, `parfum`, `brume`, `eclaircissant`/`éclaircissant`, `whiten`, `brighten`, `lighten`, `curl activator`, `scalp`, `bathing`, `bath`. Removed `"cologne"` from men's grooming (the brief puts it in both men's and fragrance; fragrance is checked later, so leaving it in men's would have mis-filed unisex perfumes — no product actually uses the word).

**One inconsistency I could not resolve on my own** — see Question 3 below.

## I. QUESTIONS I NEED ANSWERED BEFORE EXECUTING

### Q1 — Do you accept body-care 44→3 and skincare 23→3?
This is the whole decision. Everything else is detail. If the answer is no, tell me where the line is and I will re-run.

### Q2 — Homepage tiles would become Soap / Fragrance / Whitening / Baby. Is that the shop you want customers to see first?

### Q3 — Men's perfume: which rule wins?
The brief's priority order puts men's grooming **above** fragrance, so any perfume with "men" in the name lands in Ibikoresho by'abagabo. That gives an inconsistent result:

| Product | Lands in | Because |
|---|---|---|
| Dear Body **NOIR for men** Body Mist | mens-grooming | "for men" |
| Dear Body **SCARLET for Men** Body Mist | mens-grooming | "for men" |
| **777 MEN** Super Love Perfume Set | fragrance | "777 MEN" is one token; "for men" not present |

Three men's fragrances, two go one way and one goes the other. Pick one:
- **(a)** All men's perfume stays in **Imibavu**. Men's grooming is for shaving/beard products only. Then men's grooming ends up with **0 products** and gets a Vuba badge.
- **(b)** All three go to **Ibikoresho by'abagabo** (I add "777 men" / bare "men" as a name keyword).
- **(c)** Leave as the brief's order produces — inconsistent, not recommended.

Note: under every option, *Vaseline Blue Seal Men Cooling* moves out of men's grooming into Vaseline, because petroleum-jelly is checked first. That is the only product in men's grooming today.

### Q4 — The junk `soap` product (G1). Delete, fix, or move it as-is?

### Q5 — Should I wait until your mobile test is finished?
My recommendation is yes. See Risk 4.
