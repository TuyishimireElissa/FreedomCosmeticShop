# Production deployment

## 1. Pre-deployment gates

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Do not deploy if any command fails.

## 2. Environment

Create variables from `.env.example` in Vercel. Use separate production secrets; never paste values into source, documentation, issues, or screenshots.

Minimum production variables:

- `DATABASE_URL` — transaction pool URL with `pgbouncer=true&connection_limit=1`
- `DIRECT_URL` — direct/session database URL for schema administration
- `NEXTAUTH_SECRET` or `JWT_SECRET` — at least 32 random characters
- `MFA_ENCRYPTION_KEY` — distinct 32+ character secret
- `CRON_SECRET` — at least 32 random characters
- Cloudinary credentials
- verified `NEXT_PUBLIC_APP_URL`
- verified `NEXT_PUBLIC_WHATSAPP` when available

Provider features remain disabled until all associated values are configured.

## 3. Database hardening migration

Before deploying the security-hardened source, apply:

```text
prisma/manual-migrations/20260727_security_hardening.sql
```

Review the target database and run the SQL through the Supabase SQL editor or another authenticated administration connection. The script is idempotent.

## 4. Deploy

Vercel deploys the `main` branch. Verify the deployment build, then promote only after smoke tests pass.

## 5. Required smoke tests

- `/api/health` reports a connected database.
- Anonymous `GET /api/orders` returns `401`.
- Anonymous `GET` and `PATCH /api/orders/:id` return `401`.
- Tracking without the checkout phone/token returns `404`.
- Payment status without an order-access token returns `404`.
- Anonymous `/api/admin/*` requests return `401`.
- `SUPER_ADMIN` can sign in through `/admin` and `/login`.
- Production `/api/seed` returns `404`.
- Online payment options are hidden when providers are unavailable.
- Password recovery reports unavailable while SMS is not configured.

## 6. Post-deployment security

1. Enable MFA for every privileged account.
2. Store backup codes offline.
3. Review unresolved security alerts.
4. Confirm no database files, exports, archives, or credentials exist in Git history.
5. Rotate credentials immediately after any suspected disclosure.
6. Reconcile stale pending payments/orders manually before enabling providers.
