# FreedomCosmeticShop — Vercel Deployment Guide

## Prerequisites
- Vercel CLI installed: `npm install -g vercel`
- Logged in to Vercel: `vercel login` (use tuyishimire-elissa account)
- Project linked to existing: `vercel link` → select `samuel-cosmetic-shop`

## Step 1: Set Environment Variables on Vercel

Run these commands ONE BY ONE (each will prompt you to paste the value):

```bash
# Database (Supabase — use port 6543 for pooler)
vercel env add DATABASE_URL production
# Paste: postgresql://postgres.hsdqahltrqjeaskhheis:Mama%23%23311%4020@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

vercel env add DIRECT_URL production
# Paste: postgresql://postgres.hsdqahltrqjeaskhheis:Mama%23%23311%4020@aws-1-eu-central-1.pooler.supabase.com:6543/postgres

# Cloudinary
vercel env add CLOUDINARY_CLOUD_NAME production
# Paste: dohoc0tmp

vercel env add CLOUDINARY_API_KEY production
# Paste: 524578837153868

vercel env add CLOUDINARY_API_SECRET production
# Paste: ggf5-0eqMOIvtxQXokzy6-Nr1yU

vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production
# Paste: dohoc0tmp

# Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste: https://hsdqahltrqjeaskhheis.supabase.co

# Auth
vercel env add JWT_SECRET production
# Paste: freedomcosmeticshop-jwt-secret-rwanda-2024-very-strong

vercel env add JWT_REFRESH_SECRET production
# Paste: freedomcosmeticshop-refresh-secret-rwanda-2024

# Store
vercel env add NEXT_PUBLIC_APP_URL production
# Paste: https://samuel-cosmetic-shop.vercel.app

vercel env add NEXT_PUBLIC_CURRENCY production
# Paste: RWF

vercel env add NEXT_PUBLIC_WHATSAPP production
# Paste: +250780000000

vercel env add STORE_NAME production
# Paste: FreedomCosmeticShop
```

## Step 2: Deploy to Vercel

```bash
cd /home/z/my-project
vercel --prod
```

## Step 3: Run Database Migration on Vercel

After the first deploy, you need to create the database tables on Supabase.
Go to the Supabase SQL Editor (https://supabase.com/dashboard/project/hsdqahltrqjeaskhheis/sql/new)
and run the SQL from: `prisma/migrations/init.sql`

OR run this command locally with the Supabase connection:

```bash
# Set the DATABASE_URL temporarily for migration
export DATABASE_URL="postgresql://postgres.hsdqahltrqjeaskhheis:Mama%23%23311%4020@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
export DIRECT_URL="postgresql://postgres.hsdqahltrqjeaskhheis:Mama%23%23311%4020@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

npx prisma db push
npx prisma generate
```

## Step 4: Seed the Database

After tables are created, seed initial data:

```bash
npx prisma db seed
```

OR run the seed script:

```bash
npx tsx scripts/seed.ts
```

## Step 5: Verify

- Website: https://samuel-cosmetic-shop.vercel.app
- Admin: https://samuel-cosmetic-shop.vercel.app (click admin icon)
- Admin login: +250788123456 / Admin@2026

## Important Notes

1. The Prisma schema is set to PostgreSQL (`provider = "postgresql"`)
2. Supabase pooler uses port 6543 (not 5432)
3. The `?pgbouncer=true&connection_limit=1` is required for Supabase pooler
4. The `DIRECT_URL` is used for migrations (no pgbouncer param)
5. All 29 models will be created on Supabase
6. The seed script creates admin user + sample products
