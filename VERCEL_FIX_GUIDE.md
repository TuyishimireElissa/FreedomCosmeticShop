# FreedomCosmeticShop - Vercel Fix Guide 🇷🇼

## 🔍 Problem Found

Your live site https://freedom-cosmetic-shop.vercel.app/ shows **"No products found"** because:

1. **`.env` had hardcoded path** `DATABASE_URL=file:/home/z/my-project/db/custom.db` 
   - This path doesn't exist on Vercel's servers, so all DB queries fail
2. **`/api/seed` route had hardcoded path** `bun run /home/z/my-project/scripts/seed.ts`
   - Seeding never worked on Vercel
3. **No Postgres database connected on Vercel**
   - Your schema.prisma is `postgresql` but Vercel had no DATABASE_URL env var
   - SQLite (`custom.db` 780KB) works locally but not on Vercel (read-only filesystem)

---

## ✅ Fixes Applied (in this workspace)

I've already fixed your code:

### 1. New file: `src/lib/fallbackData.ts`
- Contains 18 products, 3 categories, 4 brands from your seed data
- Used when DATABASE_URL is missing or DB is empty
- **Result: Your site will now show products IMMEDIATELY even without a DB**

### 2. Fixed API routes:
- `src/app/api/products/route.ts` - fallback if DB empty/fails
- `src/app/api/products/[id]/route.ts` - fallback for single product
- `src/app/api/categories/route.ts` - fallback categories
- `src/app/api/brands/route.ts` - fallback brands
- `src/app/api/banners/route.ts` - fallback banners
- `src/app/api/blog/route.ts` - fallback blog posts
- `src/app/api/seed/route.ts` - **completely rewritten** - now seeds 12 products directly via Prisma, no hardcoded paths
- `src/lib/db.ts` - reduced log verbosity (was logging every query)

### 3. Fixed `.env`
- Changed from `file:/home/z/my-project/db/custom.db` to `file:./db/custom.db`

---

## 🚀 STEP 1: Push Fixes Now (Site will show products instantly)

```bash
cd FreedomCosmeticShop
git add src/lib/fallbackData.ts
git add src/app/api/products/route.ts
git add src/app/api/products/[id]/route.ts
git add src/app/api/categories/route.ts
git add src/app/api/brands/route.ts
git add src/app/api/banners/route.ts
git add src/app/api/blog/route.ts
git add src/app/api/seed/route.ts
git add src/lib/db.ts
git add .env
git add VERCEL_FIX_GUIDE.md

git commit -m "fix: add fallback data so live site shows products without DB, fix seed route and env path"

git push origin main
```

Wait 2-3 minutes for Vercel to redeploy. Then visit https://freedom-cosmetic-shop.vercel.app/ - you should see products! 🎉

> The `_source` field in API responses tells you where data came from:
> - `database` = real DB
> - `fallback-empty-db` = DB empty, using mock data
> - `fallback-db-error` = DB connection failed, using mock data

---

## 🗄️ STEP 2: Permanent Fix - Setup Postgres (for real orders)

Fallback is great for demo, but for real orders you need Postgres.

### Option A: Supabase (Recommended - Free)

1. Go to https://supabase.com/ -> New Project
   - Name: `freedom-cosmetic-shop`
   - Region: closest to Rwanda (e.g., EU Frankfurt or Singapore)
   - DB Password: generate strong password

2. Wait 2 min for project to be ready, then:
   - Go to Project Settings -> Database
   - Scroll to "Connection string"
   - Copy **Connection Pooling** URI (port 6543) -> this is your `DATABASE_URL`
   - Copy **Direct Connection** URI (port 5432) -> this is your `DIRECT_URL`

   Example:
   ```
   DATABASE_URL=postgresql://postgres.xxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.xxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```

3. Add to Vercel:
   - Go to https://vercel.com/dashboard -> Your project -> Settings -> Environment Variables
   - Add:
     - `DATABASE_URL` = (pooler url)
     - `DIRECT_URL` = (direct url)
     - `ALLOW_SEED` = `true`
     - `NEXTAUTH_SECRET` = `your-super-long-random-string-32-chars-min`
     - `NEXTAUTH_URL` = `https://freedom-cosmetic-shop.vercel.app`

4. Redeploy on Vercel:
   - Vercel Dashboard -> Deployments -> Click ⋯ on latest -> Redeploy

5. Seed your database:
   - Once redeployed, visit: `https://freedom-cosmetic-shop.vercel.app/api/seed`
   - Should return `{ ok: true, message: "Database seeded..." }`
   - Now refresh homepage - should show `_source: database`

6. Remove allow seed (optional security):
   - After seeding, set `ALLOW_SEED=false` in Vercel env vars

### Option B: Vercel Postgres

- Vercel Dashboard -> Storage -> Create Postgres -> Follow steps -> It auto-adds DATABASE_URL
- Then same seed step above

### Option C: Neon.tech (Alternative free Postgres)

- https://neon.tech -> New Project -> Copy connection string

---

## 🔧 Local Development Fix

For local dev using SQLite:

```bash
# Restore SQLite schema for local
cp prisma/schema.sqlite.backup.prisma prisma/schema.prisma

# Fix .env already done
# file:./db/custom.db should exist (780KB)

# Generate client & push
npx prisma generate
npx prisma db push

# Seed
npx prisma db seed  # or bun run db:seed if you have bun

# Run
npm run dev
```

For local dev using Postgres (same as production), keep current schema.prisma (postgresql) and set DATABASE_URL to your Supabase URL.

---

## 📋 Checklist After Fix

- [ ] Push fixes to GitHub → Vercel redeploys with fallback products visible
- [ ] Create Supabase project
- [ ] Add DATABASE_URL + DIRECT_URL to Vercel Env Vars
- [ ] Redeploy
- [ ] Visit /api/seed to populate DB
- [ ] Verify homepage shows products with real DB
- [ ] Test checkout flow
- [ ] Buy custom domain: freedomcosmetics.rw (I can help configure)
- [ ] Add your WhatsApp number in src/app/page.tsx (currently 250788123456 placeholder)
- [ ] Add real product photos

---

## 🆘 Need Help?

If you want me to:
- Set up Supabase for you
- Replace mock images with better ones
- Add MPesa/Airtel payment integration
- Configure custom domain

Just tell me! Murakoze!

---

## Files Changed Summary

```
src/lib/fallbackData.ts (NEW - 380 lines, 18 products)
src/app/api/products/route.ts (FIXED - added fallback logic)
src/app/api/products/[id]/route.ts (FIXED - fallback for single product)
src/app/api/categories/route.ts (FIXED)
src/app/api/brands/route.ts (FIXED)
src/app/api/banners/route.ts (FIXED)
src/app/api/blog/route.ts (FIXED)
src/app/api/seed/route.ts (REWRITTEN - no more hardcoded /home/z path)
src/lib/db.ts (FIXED - reduced logging)
.env (FIXED - relative path)
```
