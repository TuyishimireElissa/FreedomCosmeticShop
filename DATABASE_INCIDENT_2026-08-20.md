# Database incident and recovery — 2026-08-20

**Status: SITE IS BACK UP.** All APIs return 200.
**Catalogue is empty — 116 products must be re-entered.**

---

## Live status now

| Endpoint | Before | Now |
|---|---|---|
| `/api/products` | 500 | **200** |
| `/api/categories` | 500 | **200** |
| `/api/brands` | 503 | **200** |
| `/`, `/products`, `/faq`, `/admin`, `/login` | broken data | **200** |
| `/admin/products/import` | — | **200** |
| `/admin/products/content-status` | — | **200** |

---

## Your admin login

| | |
|---|---|
| URL | <https://freedomcosmeticshop.com/login> |
| Phone | `+250790215965` |
| Password | `Mamaga@@##12` |
| Role | SUPER_ADMIN |

Password hash **verified against the database** — this will work. You will be
prompted to change it at first login (`mustChangePassword: true`).

**Change it soon.** It was sent in plain text in this conversation.

---

## What was wrong — four separate faults

1. **Old Supabase project deleted.** `hsdqahltrqjeaskhheis` had no DNS record at
   all. A paused project still resolves; this one did not exist. Confirmed by
   connecting with a deliberately wrong password and getting the *same*
   "tenant not found" error, which proves it was not a credentials problem.

2. **New project was empty.** `yemvglhisrhvzrvatxkr` (eu-west-2, London)
   connected fine but had **0 tables** in `public`. A fresh project, not a
   restore.

3. **`.co` vs `.com` typo** in the production `DATABASE_URL`
   (`pooler.supabase.co` does not resolve; `.com` does).

4. **Missing `pgbouncer=true`.** This one cost the most time. The pooled
   connection on port 6543 runs in transaction mode, and without that flag
   Prisma failed with `prepared statement "s0" already exists`. Categories and
   brands worked while products did not, because the failing path reused a
   prepared statement.

---

## What I did

| Step | Result |
|---|---|
| Confirmed new DB empty before writing | 0 tables — safe to proceed |
| `prisma db push` | 63 tables created |
| 11 manual migrations | 61 statements, 0 failures |
| `pg_trgm` + 4 trigram search indexes | verified present |
| Foundation seed | admin, 17 categories, 6 brands, 5 delivery zones, store settings, 2 coupons |
| Repointed 3 Vercel env vars | `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL` |
| Fixed `.co` → `.com` | done |
| Added `pgbouncer=true&connection_limit=1` | done |
| Redeployed twice | READY |

Delivery fees restored correctly: Kigali 1,000 · Northern 3,000 · Southern
3,000 · Eastern 3,500 · Western 4,000, free over 50,000 RWF.

---

## Important: another agent was working in parallel

While I was auditing, **11 commits were pushed to `origin/main`** that I did not
write — the full 23-field product content infrastructure:

```
54946ee test: phase 6 product schema and metadata coverage
b901dac feat(seo): 23-field product schema and metadata
45c7674 test: phase 5 display coverage
55aadd0 feat(products): enhanced 23-field product display
8927c35 test: content completeness model, stats route and dashboard
2eb1a93 feat(admin): content completeness dashboard
e86151b test: bulk import parsing, safety rules and route contract
38458ea feat(admin): bulk content import for the 23 product fields
19f9f6b test: product content 23-field coverage
4471088 feat(api): expose and validate the 23 product content fields
526eb18 feat(db): add product content-infrastructure columns
```

**This caused a real failure.** My first `db push` used my older local schema,
so the 8 new columns (`nameRw`, `descriptionRw`, `shortDescriptionRw`,
`suitableFor`, `seoKeywords`, `seoKeywordsRw`, `whatsappShareText`,
`uniqueSellingPoints`) were missing while the deployed code expected them —
which is why `/api/products` kept returning 500 after everything else worked.

Fixed by fast-forwarding to `origin/main` and applying
`20260817_product_23_fields.sql`. `prisma db push` now reports
**"already in sync"**.

**My local branch is now at `54946ee`, matching production.** The bulk import
tool and content dashboard that agent built are live and will make re-entering
the catalogue much faster.

---

## What is still gone

| | |
|---|---|
| Products | **0** — 116 lost |
| Orders | **0** — 11 lost |
| Customers | **0** — 6 lost |
| Product images | **safe on Cloudinary** (`dohoc0tmp`) |

The images survived because Cloudinary is a separate service. When you re-add a
product you can point at the existing image URLs rather than re-uploading.

---

## Next steps

1. **Log in and change the password.**
2. **Re-add products** via `/admin/products/import` (bulk JSON) or the normal
   product form.
3. **Set up backups before anything else.** This is the one thing that turned a
   bad afternoon into data loss. I recommend:
   - enable Supabase daily backups / PITR on the new project (Pro tier)
   - a `pg_dump` script committed to the repo
   - a periodic catalogue JSON export checked into git

Say the word and I will build the backup tooling next.

---

## One correction to my earlier report

I previously wrote that the old project was "deleted or replaced" and that
someone had edited `DATABASE_URL` yesterday at 19:02 UTC. That timestamp was
accurate, but I framed it as the probable cause. In fact the edit looks like an
attempt to *point at the new project* that was left half-finished — the
password was updated while the old project ref and a typo'd host remained. The
project deletion was the root cause; the bad env var was a second, independent
fault on top of it.
