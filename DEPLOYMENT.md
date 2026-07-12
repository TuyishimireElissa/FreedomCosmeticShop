# FreedomCosmeticShop — Vercel Deployment Guide

## Project: freedomcosmeticshop
## Target URL: https://freedomcosmeticshop.vercel.app

This is a SINGLE Next.js app (storefront + admin + API all in one).

## Step 1: Install Vercel CLI + Login

```bash
npm install -g vercel
vercel login
# Login with: tuyishimire-elissa account
```

## Step 2: Deploy as NEW project

```bash
cd /home/z/my-project

# Remove any old .vercel link
rm -rf .vercel

# Deploy as new project
vercel

# Answer prompts:
# Set up and deploy? → Y
# Which scope? → tuyishimire-elissa
# Link to existing project? → N
# Project name? → freedomcosmeticshop
# In which directory? → ./
# Want to override settings? → N
```

## Step 3: Set Environment Variables

Use the Vercel Dashboard (easiest):
1. Go to: https://vercel.com/tuyishimire-elissa/freedomcosmeticshop/settings/environment-variables
2. Add EACH variable below:

| Variable | Value | Environments |
|----------|-------|-------------|
| DATABASE_URL | [ROTATED_DATABASE_URL] | Production |
| DIRECT_URL | [ROTATED_DATABASE_URL] | Production |
| CLOUDINARY_CLOUD_NAME | dohoc0tmp | All |
| CLOUDINARY_API_KEY | 524578837153868 | Production |
| CLOUDINARY_API_SECRET | [ROTATED_CLOUDINARY_API_SECRET] | Production |
| NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME | dohoc0tmp | All |
| NEXT_PUBLIC_APP_URL | https://freedomcosmeticshop.vercel.app | All |
| NEXT_PUBLIC_CURRENCY | RWF | All |
| NEXT_PUBLIC_WHATSAPP | +250780000000 | All |
| NEXT_PUBLIC_SUPABASE_URL | https://hsdqahltrqjeaskhheis.supabase.co | All |
| JWT_SECRET | [GENERATE_A_RANDOM_JWT_SECRET] | Production |
| JWT_REFRESH_SECRET | [GENERATE_A_RANDOM_REFRESH_SECRET] | Production |
| STORE_NAME | FreedomCosmeticShop | All |
| STORE_CURRENCY | RWF | All |
| STORE_TIMEZONE | Africa/Kigali | All |

## Step 4: Redeploy with env vars

```bash
vercel --prod
```

## Step 5: Create database tables on Supabase

After deployment, run from your local machine:

```bash
cd /home/z/my-project
export DATABASE_URL="[ROTATED_DATABASE_URL]"
export DIRECT_URL="[ROTATED_DATABASE_URL]"
npx prisma db push
npx prisma generate
```

## Step 6: Seed database

```bash
npx tsx scripts/seed.ts
```

## Step 7: Delete old project

Go to: https://vercel.com/tuyishimire-elissa/samuel-cosmetic-shop/settings
Scroll to bottom → Click "Delete Project" → Type: samuel-cosmetic-shop → Delete

## Step 8: Verify

- Website: https://freedomcosmeticshop.vercel.app
- Admin: https://freedomcosmeticshop.vercel.app (click admin icon)
- Admin login: +250788123456 / Admin@2026
