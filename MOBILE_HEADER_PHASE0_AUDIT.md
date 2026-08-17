# Phase 0 — mobile header, search and language switcher (read only)

Performed 2026-08-17 against `HEAD = 2540202`, the live site, and a 360px
mobile user agent. No code written, nothing changed.

---

## ⚠️ TWO FINDINGS THAT CHANGE THE BRIEF

### 1. A fixed BottomNav already owns Cart and Account on mobile

`src/components/layout/BottomNav.tsx:85` renders
`fixed inset-x-0 bottom-0 z-50 ... md:hidden` with five items:

| | Home | Search | Categories | **Cart** (badge) | **Account** |

The brief's target header is:

```
☰   [LOGO]      RW|EN  🛒  👤
```

Adding cart and account to the header would put **the same two controls twice
on one 360px screen**, ~600px apart. That is not a cramped header, it is a
duplicated one — and it costs the header width that the language toggle
actually needs.

**Recommendation:** header gets **☰ · logo · RW|EN · 🔍**. Cart and account
stay in BottomNav, where a thumb already reaches them.

### 2. A language switcher already exists — it is just hidden on mobile

`src/components/ui/LanguageSelector.tsx` (105 lines) already ships **four
variants**, including a `pills` variant that is almost exactly the Phase 1
design:

```tsx
// LanguageSelector.tsx:47 — variant="pills"
role="group" aria-label="Choose language"
aria-pressed={language === item.code}
className={... 'bg-fcs-brand-strong text-white' : 'text-gray-600' ...}
```

The only reason a phone user cannot switch language is
`Navbar.tsx:157`:

```tsx
<LanguageSelector variant="navbar" className="hidden md:block" />
```

**The `pills` variant is currently rendered nowhere.** Phase 1 is largely
"mount and polish what exists", not "build new". Rule 10 says extend, never
duplicate — so a new `LanguageToggle.tsx` would be the wrong move.

---

## SECTION 1 — Current header

`src/components/layout/Navbar.tsx` (354 lines).

| Aspect | Value | Line |
|---|---|---|
| Wrapper | `sticky top-0 z-50 bg-white/95 backdrop-blur-md` | 112 |
| Height | **`h-14` (56px) mobile**, `md:h-16` desktop | 116 |
| Padding | `px-4`, `md:px-6`, `lg:px-8` | 116 |
| Elevation | border + `shadow-fcs-2` once scrolled, via `useScrolled()` | 81, 113 |

**Live at 360px the header row is:**

```
[☰ 44px]  [logo 40px]  ....................  [🔍 44px]
```

Burger is at `Navbar.tsx:247`, search icon at `:145`. Everything else —
language, wishlist, quiz, WhatsApp — is `hidden md:*`.

Header height is **already 56px**, exactly what the brief asks for.

## SECTION 2 — Language switcher

| | |
|---|---|
| Component | `src/components/ui/LanguageSelector.tsx` |
| Variants | `navbar` (dropdown), `mobile` (2-col grid), `pills`, `footer` |
| State | `useLanguage()` from `src/lib/i18n/LanguageContext.tsx:92` |
| Persistence | `localStorage` key `fcs_language` (`LanguageContext.tsx:21`) |
| Languages | `LANGUAGES.filter(l => l.available)` — **rw + en** |
| Reload on change? | **No.** `setLanguageState` + context re-render only |
| Mobile access today | Burger menu → `variant="mobile"` at `Navbar.tsx:323` |

So a phone user must **open the burger and scroll** to change language.

## SECTION 3 — Search

| Component | Lines | Where |
|---|---|---|
| `SearchWithSuggestions.tsx` | 330 | header, `hidden ... md:block` (`Navbar.tsx:141`) |
| `SearchOverlay.tsx` | 470 | full-screen, opened by the mobile icon (`Navbar.tsx:284`) |
| `HomeSearch.tsx` | 71 | homepage body only |

**On mobile there is no search bar — only a 44px icon** that opens the overlay.
Voice lives inside the overlay (`SearchOverlay.tsx:271`, hidden unless
`voice.supported`), so it is two taps away.

## SECTION 4 — Mobile menu

Burger at `Navbar.tsx:247`, panel at `:290`. Contains category links, quiz,
WhatsApp support, wishlist, account, and `LanguageSelector variant="mobile"`
at `:323`. Body scroll locks while open (`:74`).

## SECTION 5 — Sticky behaviour

Header is `sticky top-0`. **There is no scroll-hide of any kind today** — it
stays put. `useScrolled()` (`src/hooks/use-scrolled.ts`) only toggles the
shadow. There is **no `use-scroll-direction` hook**; Phase 4 would add one.

## SECTION 6 — Touch targets

**Already compliant.** Six `h-11 w-11` / `min-h-11` targets in Navbar (44px),
and BottomNav uses `min-h-11` throughout. The brief's rule 22 is satisfied by
the current code; no violation found to fix.

## SECTION 7 — Breakpoints

Tailwind defaults: `sm 640` · `md 768` · `lg 1024` · `xl 1280`.
**`md` (768px) is the mobile/desktop line** used consistently across Navbar and
BottomNav — matching the brief's "below 768px".

## SECTION 8 — Tests at risk

**123 assertions across 9 files reference `Navbar.tsx` directly:**

| File | Tests |
|---|---|
| `search-overlay-voice.test.ts` | 39 |
| `category-nav-data-driven.test.ts` | 27 |
| `brand-logo.test.ts` | 19 |
| `warm-brutalism-tokens.test.ts` | 17 |
| `premium-design-system.test.ts` | 5 |
| `low-data-toggle.test.ts` | 5 |
| `quiz-home-navigation.test.ts` | 4 |
| `wholesale-honest-page.test.ts` | 4 |
| `whatsapp-navigation.test.ts` | 3 |

Restructuring the header is the single riskiest thing in this brief. Several of
these assert exact class strings and element order.

Baseline: **1,918 passing / 160 files**, shared JS **103 kB**, build 70/70.

## SECTION 9 — Gap analysis

| Feature | Current | Target | Gap |
|---|---|---|---|
| Language on mobile | ❌ burger only | pills in header | **Mount the existing `pills` variant + restyle** |
| Search on mobile | icon → overlay | sticky bar | **New component** |
| Voice on mobile | 2 taps (inside overlay) | 1 tap from bar | Wire into the new bar |
| Header height | 56px | 56px | ✅ none |
| Tap targets | 44px | 44px | ✅ none |
| Sticky header | yes | yes | ✅ none |
| Scroll hide/show | none | hide search on scroll down | **New hook** |
| Cart + account in header | in BottomNav | brief wants header | ⚠️ **would duplicate — recommend not doing** |

## SECTION 10 — Files to modify

| Phase | File | Change |
|---|---|---|
| 1 | `src/components/ui/LanguageSelector.tsx` | restyle `pills` to spec — **extend, not replace** |
| 1 | `src/components/layout/Navbar.tsx` | mount pills in the mobile row |
| 2 | `src/components/layout/Navbar.tsx` | spacing only; height already correct |
| 3 | `src/components/layout/MobileSearchBar.tsx` | **new** |
| 3 | `src/components/layout/Navbar.tsx` | mount below header, `md:hidden` |
| 3 | i18n `rw.ts` / `en.ts` | placeholder key if not reusable |
| 4 | `src/hooks/use-scroll-direction.ts` | **new** |
| 5 | `src/lib/__tests__/mobile-header.test.ts` | **new** |

Not touched: `BottomNav.tsx`, `SearchOverlay.tsx`, `SearchWithSuggestions.tsx`,
`LanguageContext.tsx`.

---

## Questions before Phase 1

1. **Cart and account in the header — skip them?** They are already in
   BottomNav; adding them duplicates two controls on a 360px screen. I
   recommend **☰ · logo · RW|EN · 🔍** and leaving BottomNav alone.
2. **Extend `LanguageSelector`'s `pills` variant rather than create
   `LanguageToggle.tsx`?** Rule 10 says extend, never duplicate, and `pills`
   is already 90% of the spec.
3. **Sticky search bar plus sticky header plus fixed BottomNav** costs roughly
   100px of vertical chrome on a 360×640 screen — about 16% of the viewport.
   Accept, or should the search bar scroll away entirely (Phase 4 behaviour
   applied from the start)?
4. The brief says search bar height **44px** and header **56px**; both are fine,
   but confirm you want the search bar *always* mounted on mobile rather than
   only on the homepage and `/products`.

---

**PHASE 0 AUDIT COMPLETE — Awaiting approval.**
