# Missing production environment variables

Audited 2026-08-01 against the live Vercel project (`prj_TcJH8QnJKOVzkkG7EJT4fscMIyL6`).

**20 of 63** declared variables are set. The 43 below are absent. Nothing here
is a secret — this file lists *names and purposes only*.

The site runs fine without most of them. Two groups genuinely block revenue and
are called out first.

---

## 🔴 Blocking: customers cannot pay

Checkout collects an order but cannot take money until one of these is
configured. This is the single highest-value gap on the project.

| Variable | Purpose |
| --- | --- |
| `PAYPACK_CLIENT_ID` | Paypack app id — MTN MoMo / Airtel Money collections |
| `PAYPACK_CLIENT_SECRET` | Paypack app secret |
| `PAYPACK_ENVIRONMENT` | `sandbox` or `production` |
| `PAYPACK_WEBHOOK_SECRET` | Verifies inbound Paypack callbacks |
| `PAYPACK_WEBHOOK_URL` | Callback URL registered with Paypack |
| `FLW_PUBLIC_KEY` | Flutterwave public key — card payments |
| `FLW_SECRET_KEY` | Flutterwave secret key |
| `FLW_ENCRYPTION_KEY` | Flutterwave payload encryption |
| `FLW_WEBHOOK_HASH` | Verifies inbound Flutterwave callbacks |
| `FLW_WEBHOOK_URL` | Callback URL registered with Flutterwave |
| `ENABLE_REAL_PAYMENTS` | Master switch; leave off until the above are live |

**Mobile money is how Rwanda pays.** Paypack (MoMo + Airtel) matters more than
Flutterwave here; card is the minority path.

## 🔴 Blocking: no order confirmations reach customers

Orders are recorded but the customer is never told. Expect support load and
chargebacks until this is fixed.

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Transactional email provider |
| `EMAIL_FROM` | Sender address on order mail |
| `EMAIL_REPLY_TO` | Where customer replies land |
| `ENABLE_EMAIL_NOTIFICATIONS` | Email master switch |
| `AT_API_KEY` | Africa's Talking — SMS |
| `AT_USERNAME` | Africa's Talking account |
| `AT_SENDER_ID` | Registered SMS sender id |
| `PINDO_API_KEY` | Pindo — alternative Rwandan SMS gateway |
| `ENABLE_SMS_NOTIFICATIONS` | SMS master switch |

SMS matters more than email for this market. `EMAIL_FROM` must be on a domain
you control and have verified — a `.vercel.app` sender will be spam-filtered.

## 🟠 Admin bootstrap

Only needed to run `npm run db:seed`. **The store already has a `SUPER_ADMIN`,
so these are not required** — see the warning in `MISSION_LOG.md`.

| Variable | Purpose |
| --- | --- |
| `ADMIN_PHONE` | Seed admin login, `+2507XXXXXXXX` |
| `ADMIN_SEED_PASSWORD` | Seed admin password, 12+ chars, mixed case + digit + symbol |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_NAME` | Seed admin display name |
| `ADMIN_EMAILS` | Comma-separated allow-list for elevated access |
| `ADMIN_ACCESS_KEY` | Extra gate on admin bootstrap routes |
| `SECURITY_OWNER_PHONE` | Recipient for security alerts |

## 🟡 Optional: search, cache, media

Absent means the feature falls back or stays off. Nothing breaks.

| Variable | Purpose |
| --- | --- |
| `ALGOLIA_APP_ID`, `ALGOLIA_ADMIN_API_KEY`, `ALGOLIA_SEARCH_API_KEY`, `ALGOLIA_INDEX_NAME` | Hosted search; falls back to Postgres queries |
| `ENABLE_SEARCH_INDEXING` | Search indexing switch |
| `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Distributed cache and rate limiting |
| `ENABLE_REDIS_CACHE` | Cache switch |
| `CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset (signed uploads already work) |
| `SUPABASE_PROJECT_REF` | Convenience for tooling |

⚠️ Without Redis, rate limiting is **per-instance in memory**. Vercel runs
several instances, so limits are looser than they look. Worth fixing before a
marketing push.

## ⚪ Cosmetic / redundant

| Variable | Purpose |
| --- | --- |
| `APP_NAME`, `NEXT_PUBLIC_APP_NAME` | Display name; `business-config.ts` already hardcodes it |
| `APP_URL` | Superseded by `NEXT_PUBLIC_APP_URL`, which **is** set |
| `NEXT_PUBLIC_COUNTRY` | Defaults to Rwanda |
| `NODE_ENV` | Vercel sets this automatically — **do not set it manually** |

---

## Local development

`npm run build` needs a JWT secret to collect page data. Create a **gitignored**
`.env.local` with throwaway values — never real credentials:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL="postgresql://u:p@localhost:5432/db"
DIRECT_URL="postgresql://u:p@localhost:5432/db"
NEXTAUTH_SECRET=<48 random hex chars>
JWT_SECRET=<48 random hex chars>
JWT_REFRESH_SECRET=<48 random hex chars>
MFA_ENCRYPTION_KEY=<48 random hex chars>
CRON_SECRET=<48 random hex chars>
```

Generate each with `openssl rand -hex 24`. `.gitignore` already blocks `.env*`
(except `.env.example`); confirm with `git check-ignore -v .env.local`.

## Suggested order

1. **Paypack** — unblocks MoMo, the dominant payment method.
2. **SMS (Africa's Talking or Pindo)** — customers expect an SMS confirmation.
3. **Resend + a verified sending domain** — email receipts.
4. **Redis** — before any campaign that drives real traffic.
5. Everything else is optional.
