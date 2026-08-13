# Phase 2 — search overlay and voice input

**Date:** 2026-08-13 · **Commit:** `fd13d69` · Live and verified

## What was actually missing

Sections **D** (recent searches), **E** (trending), **F** (instant results) and
**G** (empty state) of the brief already existed in
`SearchWithSuggestions.tsx`. Checked before writing code.

What did not exist:

- voice input
- category quick-chips
- a full-screen mobile overlay (the phone search button opened a bare text strip)
- a focus trap

Desktop is untouched — the existing inline combobox already works, has ARIA
roles, and supports arrow-key navigation.

## Voice search

Native Web Speech API. **0 packages added.**

### iOS is a bigger problem than the brief said

The brief notes *"iOS Safari does NOT support it"*. True, but understated: on
iOS **every** browser — Chrome, Firefox, Edge — is Safari's WebKit underneath,
because Apple forbids other engines. So the microphone must be hidden for all
iOS users, not just Safari users.

Detection is capability-based (`'webkitSpeechRecognition' in window`), never
user-agent sniffing. When absent the microphone **is not rendered at all**. A
button that silently does nothing is worse than no button.

### There is no Kinyarwanda speech model

No shipping browser has `rw-RW`. Requesting it throws
`language-not-supported` or silently returns garbage.

`en-US` is used for **both** languages. That is the honest choice here: the
catalogue is overwhelmingly English product names (Nivea, Vaseline, Veet Gold,
"Vitamin C"), and the search layer already transliterates Kinyarwanda. A
Kinyarwanda speaker saying *"seramu"* transcribes near *"serum"*, which
`expandSearchQuery` resolves to 4 real products. Documented in the hook so
nobody later "fixes" this to `rw-RW` and breaks it.

**Verified live:** the shipped bundle sets `s.lang="en-US"`.

### Other behaviours

| Concern | Handling |
| --- | --- |
| SSR | `supported` starts `false`, upgrades in an effect — no hydration mismatch |
| Permission denied | `not-allowed` / `service-not-allowed` → distinct `denied` state |
| User says nothing | `no-speech` / `aborted` are **not** errors |
| Slow speaker | 2s silence timer restarts on every interim fragment |
| Unmount mid-listen | recogniser aborted, so the recording indicator goes out |

## Deliberately absent

**Colour swatches (Section C).** No colour column, no tags column, `shadeHex`
NULL on all 106 live products. Seven swatches each returning zero results.
Owner decision 2026-08-13.

**Makeup chip.** All 6 makeup rows are `isDeleted: true` seed data — 0 live.
`/api/categories` already hides the category; the overlay now agrees.

**QR / scan button.** No barcode scanner exists anywhere in this codebase.

## Trending terms — all verified against live production

| term | hits |
| --- | ---: |
| vitamin C | 14 |
| amavuta (body oil) | 53 |
| hair food | 10 |
| seramu (serum) | 4 |
| MIADI | 2 |

**I dropped "sunscreen" from the brief's list.** It *does* return 3 hits, but I
checked what they are: Veet Gold Vitamin C Soap, Pure Egyptian Magic Whitening
Gold Soap, Purec Egyptian Gold Lotion. **Not one is a sunscreen.** They match
only because the vocabulary expands `sunscreen → "sun protection"` and those
descriptions contain "sun". Promoting it as trending would advertise stock that
does not exist. Same for the brief's `"cream yo kurinda izuba"` — 52 hits of
ordinary body cream.

## Kinyarwanda corrections

- The brief's **"Imikara"** is not a word for makeup. The established term
  already in `rw.ts` is **"Ibikoresho byo kwisiga"**. (Moot anyway — the chip
  was dropped.)
- Category labels are lifted from the existing `categories` translation block
  rather than invented.
- All new `rw` strings carry `// verified-rw`, asserted by test.

## My own errors

**1. Two real React violations.** I wrote to a ref during render in the hook,
and passed `searchTriggerRef.current` from `Navbar` during its render. Both
were flagged by `react-hooks/refs`. These are not lint noise — writing a ref
during render misbehaves under StrictMode double-invocation. Fixed properly
(assign inside an effect; pass the ref object, not `.current`) rather than
suppressed with a disable comment.

**2. Three of my own tests failed on first run** because they asserted strings
that exist only in doc comments, which the test helper strips.

Worst of the three: the "does not write to a ref during render" check used
`/^\s*onResultRef\.current = onResult\s*$/m`, which **also matches the
correctly-indented line inside the effect**. It would have passed vacuously
whether the bug was present or not. It now excises the effect block and
asserts on the remainder.

## Verification

**59 new tests. Mutation tested: 23 of 23 caught**, each confirmed to have
actually modified the file before trusting the result. Mutations included
swapping capability detection for UA sniffing, making `supported` start true,
requesting `rw-RW`, dropping the Tab trap, removing `aria-modal`, never
restoring focus or body scroll, shipping a raw image, and adding sunscreen and
the makeup chip back.

**Live bundle grepped after deploy:** `webkitSpeechRecognition`, `aria-modal`,
`Ndumva` (Kinyarwanda "listening"), and all five trending queries present.
`Imikara`, `Umutuku`, `Zahabu` absent.

One apparent leak investigated and cleared: `rw-RW` appears in 3 chunks, but
every occurrence is a pre-existing `toLocaleLowerCase('rw-RW')` or a
`toLocaleDateString` call — correct locale usage, unrelated to speech.

**Accessibility:** `role="dialog"` + `aria-modal`, Tab trapped, Escape closes,
focus returns to the trigger, `aria-live` announces "Listening",
`aria-pressed` on the mic, body scroll locked and restored, 44px+ targets,
listening pulse gated behind `motion-reduce`.

Gates: tsc clean · lint 0 errors / 6 pre-existing warnings · **1,471 tests
passing (was 1,412)** · build 66/66 · **shared JS 103 kB unchanged** · 0 new
packages.

Live after deploy: `/` 94ms, `/products` 691ms, facets 200, similar 200,
search recall unchanged (vitamin 22, uruhu 70, vitanin 26, xyzfake 0).

## Still open for the owner

- **No sunscreen stock.** `izuba` returns 0. Real inventory gap.
- **No makeup stock.** 0 live products in the category.
- Voice search cannot be tested from this sandbox (no microphone, no browser).
  It needs a real Android/Chrome device. The code path is unit-tested and the
  bundle is verified, but the microphone itself is untested by me — I will not
  claim otherwise.
