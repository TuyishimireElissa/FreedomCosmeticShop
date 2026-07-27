# FreedomCosmeticShop

Next.js commerce and administration application for a cosmetics store in Rwanda.

## Current operating model

- Storefront, admin workspace, and API are one Next.js application.
- PostgreSQL is accessed through Prisma.
- Cloudinary stores product media.
- Custom JWT authentication uses revocable access/refresh token generations.
- Guest order tracking requires the checkout phone number or a signed order-access token.
- Online payments, SMS, email, Algolia, and Redis are **disabled until their credentials and feature flags are configured**.
- Production payment and communication services fail closed; simulated delivery/payment behavior is development-only.

## Requirements

- Node.js 20 or newer (Vercel currently uses Node.js 24)
- PostgreSQL 14+
- npm

## Local setup

```bash
cp .env.example .env.local
npm ci
npx prisma generate
npm run dev
```

Use a development PostgreSQL database. Never commit `.env*`, database files, exports, backups, screenshots containing customer data, or provider credentials.

## Quality gates

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

The production dependency audit must have zero known high/critical vulnerabilities before deployment.

## Database schema changes

The project historically had no Prisma migration baseline. Review and apply files in `prisma/manual-migrations/` against the intended database before deploying source that depends on them. Every script is written to be idempotent. Create a managed migration baseline before future schema work.

## First owner account

`scripts/seed.ts` creates an owner only when no account exists for `ADMIN_PHONE`. It never resets an existing owner's password, MFA, role, or sessions.

Required one-time seed variables:

- `ADMIN_PHONE`
- `ADMIN_NAME`
- `ADMIN_EMAIL` (optional)
- `ADMIN_SEED_PASSWORD`

Run:

```bash
npm run db:seed
```

Remove the seed password from the environment after use. Production `/api/seed` is permanently blocked.

## Service activation

Do not turn on a feature flag until the corresponding provider credentials, webhook secret, callback URL, and end-to-end test are complete.

### Mobile Money

Requires PayPack credentials and `ENABLE_REAL_PAYMENTS=true`. Configure the verified webhook URL and secret.

### Cards

Requires Flutterwave public/secret keys, webhook hash, verified redirect URL, and `ENABLE_REAL_PAYMENTS=true`.

### SMS and recovery

Requires Africa's Talking or Pindo credentials. Without SMS, password recovery returns a clear unavailable response rather than claiming a code was delivered.

### Email

Requires Resend credentials, a verified sender in `EMAIL_FROM`, and `ENABLE_EMAIL_NOTIFICATIONS=true`.

### Search indexing

Algolia is optional. Prisma search remains the fallback. Enabling indexing requires application ID, search key, and admin key.

## Security invariants

- Full order lists/details are admin-only.
- Customer tracking requires proof and returns a minimized response.
- Payment initiation/status requires a signed order-access token or authenticated ownership.
- Online payment status is changed only by verified provider webhooks.
- Destructive actions use explicit role/permission policies.
- Public real-time streams exclude order, customer, payment, rider, and user-specific data.
- Refresh tokens are rotated and session generations are revoked on logout/password/security changes.
- `SUPER_ADMIN` is accepted consistently by the admin shell.
- Backup download/restore is restricted to `SUPER_ADMIN`.

See `SECURITY.md` for reporting and operational response guidance.
