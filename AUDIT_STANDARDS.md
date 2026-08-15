# Audit standards and lessons learned

Rules earned by getting something wrong, not by theory. Each one names the
mistake that produced it, so the reasoning survives when the rule looks
inconvenient.

Owner asked for two files (`AUDIT_STANDARDS.md`, `LESSONS_LEARNED.md`). They
are the same file. Every lesson below is an audit-discipline rule, and
splitting them would mean two places to forget to update.

---

## 1. Verify a component actually renders before measuring it

**The mistake, 2026-08-14.** I produced a 360px mockup of the desktop category
strip and reported *"~2,268px of content, 7.3 screens of horizontal scroll,
Bundles pushed ~2,000px off-screen."* I presented it as a finding and the
owner very nearly made a design decision on it.

**It was measuring nothing.** `Navbar.tsx` line 255:

```tsx
<div className="hidden border-t border-[#EEEEEE] md:block">
```

`hidden md:block` — the strip does not exist below 768px. No phone has ever
rendered it. The owner's follow-up instruction ("hide the strip on phones")
was already true and needed no work.

**The rule.** Before measuring any layout, read the element's own visibility
classes and its parents'. Confirm the component renders at the viewport you
are measuring. `hidden`, `md:block`, `lg:hidden`, `sm:flex` and conditional
returns all change the answer.

The mobile-menu numbers in that same mockup *were* real, because that
component does render at 360px. Being right about half of it is what made the
wrong half persuasive.

---

## 2. Postgres UPDATE reports rows MATCHED, not rows CHANGED

**The mistake, 2026-08-14.** A migration set `isActive = false` on a row that
was already `false`. I wrote in the SQL comment that it *"will report 0 rows
changed."* It reported **1**.

**Why.** `UPDATE ... WHERE slug = 'hair-care'` returns the count of rows the
WHERE clause matched. Postgres does not compare old and new values and skip
no-ops. A row matched is a row reported.

**The rule.** Never predict a database operation's row count from intuition.
Either run it and record the real number, or describe the end state instead of
the count. The end state was correct; only my prediction was wrong, and a
comment that the output contradicts is worse than no comment.

**Corollary:** this is also why the statement is safe to replay. Matching and
rewriting an identical value is idempotent.

---

## 3. Read written output back, especially escapes

**The mistake, 2026-08-14.** A Python heredoc wrote a Kinyarwanda string into
`rw.ts`. The intended curly apostrophe arrived as the literal seven characters
`\u2019`:

```ts
body_oil: 'Amavuta y\u2019Umubiri', // verified-rw   // WRONG — literal escape
body_oil: 'Amavuta y’Umubiri',      // verified-rw   // right
```

TypeScript compiled it. Tests passed. It would have shipped a broken
apostrophe to every Kinyarwanda shopper.

**The rule.** After writing a file, read the affected line back and look at it.
Escape sequences, apostrophes, accented characters and anything non-ASCII pass
through several layers (shell → Python → file) and any layer can mangle them.
`tsc` cannot catch a string that is syntactically valid and semantically wrong.

**Related, same session:** a CJK character (`需要`) leaked into a SQL comment
from a mid-sentence language slip. Also caught only by reading the file back.

---

## 4. Mutation-test with input that can actually fail

**The mistake, 2026-08-14.** Two probes against `stockedFirst()` survived:
deleting the `sortOrder` tiebreak, and sorting the array in place.

**Why they survived.** `Array.prototype.sort` is stable in V8, and my sample
was already in `sortOrder`. A stable sort returns an already-ordered array
unchanged even with the comparator gutted, and sorting an already-sorted array
in place leaves it looking untouched. The tests were passing on the engine's
behaviour, not on the code under test.

**The fix.** Shuffle the input first, and assert the shuffle actually differs
from the expected output. After that: 8/8 caught.

**The rule.** A test that passes on correct code proves nothing until it fails
on broken code. When the subject is a sort, a filter, a dedupe or anything
order-sensitive, the fixture must be deliberately disordered.

---

## 5. An assertion must be unique in the file it searches

**The mistake, recurring — at least five times across this engagement.**

| Assertion | Why it passed while broken |
| --- | --- |
| `toContain("orderBy: [{ sortOrder: 'asc' }...")` | the clause appears twice — top level and the `children` relation |
| `toContain('animate-pulse')` | an unrelated pulse elsewhere in the navbar |
| `toContain('disabled={empty && !selected}')` | four sibling components carry it |
| `toContain("notIn: ['', '[]']")` | guards both `shade` and `shades` |
| `lines.find(l => l.startsWith('saved:'))` | `saved:` also exists under `settings` |

Each mutation changed one occurrence; a sibling satisfied the assertion.

**The rule.** Count occurrences rather than checking presence, or scope the
search to the specific block:

```ts
const guards = source.match(/pattern/g) || []
expect(guards.length).toBe(2)          // not: expect(source).toContain(...)
```

And when slicing a file, bounds-assert the slice — a `slice(A, B)` where `B`
precedes `A` returns `''`, and `''` contains nothing, so every negative
assertion against it passes.

---

## 6. Comments strip before assertion; read raw when the target is a comment

Test helpers here strip comments before asserting, because source files
legitimately document what they replaced — a doc comment explaining *"we no
longer use `c_fill`"* would otherwise fail an assertion that `c_fill` is
absent.

**The trap.** Assertions whose target legitimately lives *in* a comment then
fail against correct code. Hit three times: `// verified-rw` markers, the
`sunscreen` rationale, and the words "curated"/"personalised" in a doc comment
explaining why the copy avoids them.

**The rule.** Use the stripped source for code assertions and the raw file for
comment assertions. Keep both helpers available and pick deliberately.

---

## 7. Skip a visual divider when a semantic one already exists

**Owner decision, 2026-08-14.** The phone menu sorts stocked categories above
coming-soon ones. I flagged that there is no visible line or heading marking
the transition. Owner chose to ship without one:

- a continuous grid reads more naturally on mobile than an interrupted one
- the **Vuba** badges already distinguish the two groups semantically
- a header costs vertical space in a menu that is already ~640px in a ~528px
  box
- users likely will not consciously notice the transition; they tap what looks
  tappable

**The rule.** *Skip visual dividers when semantic distinction already exists.
Add them when user data proves confusion.* Measure, then decide — do not add
chrome against a hypothetical.

---

## 8. Never run `prisma migrate dev` on this project

This database has **no `_prisma_migrations` table** and the repo has **no
`prisma/migrations/` folder**. Every schema change has been hand-written SQL in
`prisma/manual-migrations/`.

Pointing Prisma Migrate at a database it has never tracked makes it read the
entire live schema as drift and offer to reset — which would destroy 107+
products and 11 orders.

**The rule.** Additive SQL in `prisma/manual-migrations/`, hand-edited
`schema.prisma`, and `prisma generate`. Never `migrate dev`, never
`migrate reset`, never `db push` against production.

Every migration script must snapshot the counts that must not change, and
throw if they move:

```ts
if (after.products !== before.products) throw new Error('PRODUCT COUNT CHANGED')
```

---

## 9. Verify against live production, never against build success

A green build says the code compiles. It does not say the feature works.

Client components render nothing to `curl`, so grep the shipped
`_next/static/chunks/` instead. Confirm the new string is present **and** the
old one is gone.

**Investigate every apparent leak before reporting it.** Cleared this
engagement without a code change:

- `rw-RW` in 3 chunks — pre-existing `toLocaleLowerCase('rw-RW')` calls, not a
  speech-recognition locale
- `Gishya` — the `common.new` dictionary entry, not a product badge
- `Menyesha` — a word inside a delivery-inspection sentence
- English strings in the bundle — the English dictionary, exactly where it
  belongs

---

## 10. Contrast is arithmetic, not opinion

Compute the ratio inside the test rather than asserting it from memory.

**Applied, 2026-08-14.** A brief specified white text on `fcs-brand` #B76E79
for the Vuba badge. Measured: **3.80:1** — below the 4.5:1 AA floor, and 10px
is not large-scale text so the 3:1 exemption does not apply. This codebase
already fails a build over `#C77B85` at 3.18:1, so shipping 3.80:1 would
contradict a rule it enforces elsewhere.

I stopped and asked. Owner chose white on `fcs-brand-strong` #A85D68 —
**4.74:1**, passes AA, visually near-identical.

**The rule.** When a brief specifies a colour, measure it before using it. When
it fails, present the measured alternatives and let the owner choose. Do not
silently substitute, and do not silently comply.

---

## 11. Distinguish a stale assertion from a regression

Every phase of this engagement broke tests. **Not one was a regression.** All
were assertions pinned to source text that an intentional change had moved.

**The rule.** When a test fails, prove the underlying guarantee still holds
*before* editing the assertion. Then rewrite it to assert the behaviour rather
than the literal, and leave a comment saying what changed and why.

A test updated without that check is indistinguishable from a test deleted to
make a build green.

---

## 12. The brief is frequently wrong; measure first

Recorded because it has been true in every phase:

| Brief said | Reality |
| --- | --- |
| "unequal product photo sizes" | containers were identical; the *images* differed |
| "#1F8A4C is ~5.2:1" | 4.38:1, fails AA |
| "build a search system" | it already existed |
| "extend `/api/search`" | that route returns 404; the real one is `/api/products` |
| "101-product catalogue" | 106, now 107 |
| "Shyira mu gare" | `igare` is a **bicycle**; correct is `igitebo` |
| "Imikara" for makeup | not a Kinyarwanda word; correct is `Ibikoresho byo kwisiga` |
| "Umuhondo" for brown | `umuhondo` is **yellow**; brown is `ikigina` |
| "`prisma migrate dev`" | would offer to reset production |
| "these two tests will break" | neither did; two entirely different ones did |

**The rule.** Query the live database, hit the live API, and grep the shipped
bundle before implementing. Where the brief is wrong, deviate, and record the
deviation and the measurement in writing.

---

## 13. Never invent data to satisfy a spec

Features declined this engagement because the data does not exist:

- **colour search** — no colour column, no tags, `shadeHex` NULL on all rows
- **"Authentic" badge** — `isAuthentic` false on 106/106
- **"New" badge** — would render on 100% of cards, so it says nothing
- **"Free delivery" badge** — threshold is 50,000 RWF on the *order*; the
  dearest product is 24,000
- **"Notify me"** — 0 products out of stock, and SMS and email are both
  disabled
- **"Customers also viewed"** — identical inputs to the existing similarity
  rail; would list the same four products twice

**The rule.** Hide the section rather than render an empty box, and say plainly
which owner action would light it up.

---

## 14. A green assertion is worthless until you have seen it go red

Phase 4 shipped 22 assertions. 21 were real. One was decorative:

```ts
expect(code).not.toContain("from '@/components/ui/table'")   // single quotes
```

The component writes its imports in **double** quotes. The needle could never
match, so the assertion passed no matter what the file contained. Adding a
shadcn `Table` import — exactly what the check existed to prevent — left the
suite green.

It was caught only by mutating the source and watching the count stay at 22.

**The rule.** Every new assertion gets a mutation that should break it, and the
mutation itself is asserted to have landed (`assert s != orig, "DID NOT APPLY"`)
before the result is believed. For string checks, prefer a quote-agnostic regex
over `toContain` on a quoted literal.

---

## 15. HTTP 200 is not the same as working

The re-categorisation moved 20 of 23 products out of Skin Care. The routine
quiz filtered on `category.slug = 'skincare'`, so six of nine skin concerns
started returning nothing. Live checks after the migration all passed:

- `/api/quiz/recommend` → **200 OK**
- valid JSON, `success: true`
- no error in the logs

The endpoint was answering perfectly. It was answering with an empty list.

Measured afterwards against the pre-migration snapshot: acne 3 → 0,
dark_spots 7 → 0, sensitivity 12 → 0, uneven_tone 5 → 0.

**The rule.** For any endpoint that returns a *collection*, assert on the
count, not the status code. A silent empty result is harder to spot than a
crash and does more damage, because nothing alerts.

---

## 16. Read the picture before calling data junk

Two products were reported as data-quality problems in the Phase 1 audit. Both
reports were wrong, and both would have destroyed live inventory:

| flagged as | actually |
|---|---|
| junk test row named `soap`, description `ggy` | a real **Dettol Fresh 4-bar pack** — Cloudinary photo, 96 in stock, 3 already sold |
| three duplicate "Veet Gold Turmeric Oil" rows | three **sizes** — SKUs `…-500ML/300ML/200ML`, prices laddered, 4 orders bought two sizes together |

The evidence was one `curl` and one `SELECT sku` away in both cases. Acting on
the first report would have hidden a stocked product; acting on the owner's
instruction for the second would have hidden the **best seller** (10 units,
70,000 RWF) while keeping a variant with zero sales.

**The rule.** Before recommending that any row be hidden or deleted: open the
image, read the SKU, and count the orders. Bad *text* is not the same as a bad
*product*.

---

## 17. Re-run the classifier after the data changes under it

The move plan was built, approved at 67 rows, then two products were repaired
first. Re-running the classifier against the repaired data showed it now wanted
to drag the three Veet oils **back** into `whitening` — their names still
contain the word "Whitening" — silently undoing a fix the owner had just
approved.

Executing the approved 67-row list would have reverted an approved change.

**The rule.** A plan is only valid against the state it was computed from. After
any write, regenerate the plan and diff it against the approved one. Pin
owner decisions by primary key so no rule can outvote them.

---

## 18. Verify a class name exists before shipping it

Phase 5 used `text-fcs-charcoal`. The token in `tailwind.config.ts` is
`--fcs-text`; **`fcs-charcoal` does not exist**. Tailwind does not error on an
unknown utility — it emits nothing — so the heading would have rendered in the
browser default colour on a warm ivory card, and every test and the build would
have passed.

It was caught by grepping each class against the config before commit, not by
any tooling.

**The rule.** Every design token used in new markup is grepped against
`tailwind.config.ts` in the same session it is written. An invalid Tailwind
class is silent: no build error, no test failure, no console warning.

---

## 19. Assert against shipped code, not the raw file

A Phase 5 test checked that four Kinyarwanda phrases were present, reading the
**raw** file. The component also *documents* those phrases in its header
comment. Deleting the real string left the comment behind, and the assertion
passed on the comment alone.

The same file already had a comment-stripped copy prepared for exactly this
reason; the assertion simply used the wrong variable.

**The rule.** Read RAW only when asserting on comments themselves (for example
`// verified-rw` markers). For anything that must reach a customer, assert
against the comment-stripped source. Keep both variables in the test file and
name them so the difference is obvious.

---

## 20. Count the occurrences, then mutate each one

Three Phase 5 mutations survived a green suite, all the same shape:

| assertion | why it passed anyway |
|---|---|
| `_count` keeps its stock filter | two `_count` blocks exist (parent + children); one filtered copy satisfied it |
| four `// verified-rw` markers | asserted `>= 3`, so removing one left three |
| WhatsApp guard present | asserted the text existed, not that it still decided anything — `= true \|\|` short-circuited it |

Each was found by mutating and watching the count stay at 21/21.

**The rule.** Before writing an assertion, `grep -c` the anchor. If it appears
more than once, assert the exact count and mutate **each** occurrence
separately. For a boolean guard, assert that it is still derived, not merely
that its name appears.
