/**
 * POST /api/seed - Seeds DB with products + ADMIN USERS
 * Fixes admin login problem
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

const IMG = {
  vitaminC: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop",
  hyaluronic: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop",
  cleanser: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop",
  sunscreen: "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=800&auto=format&fit=crop",
  moisturizer: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop",
  nightCream: "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=800&auto=format&fit=crop",
  foundation: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop",
  lipstick: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop",
  mascara: "https://images.unsplash.com/photo-1631214540242-3cd8c4b0b3b6?w=800&auto=format&fit=crop",
  eyeshadow: "https://images.unsplash.com/photo-1583241800698-9c2e6b0f7c0a?w=800&auto=format&fit=crop",
  blush: "https://images.unsplash.com/photo-1599733589046-8a35aa3271c8?w=800&auto=format&fit=crop",
  lipgloss: "https://images.unsplash.com/photo-1599751449628-9d4a93b3f0a1?w=800&auto=format&fit=crop",
  shampoo: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop",
  conditioner: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&auto=format&fit=crop",
  hairOil: "https://images.unsplash.com/photo-1607602132700-068258431c6c?w=800&auto=format&fit=crop",
  curlCream: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&auto=format&fit=crop",
  hairMask: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&auto=format&fit=crop",
  edgeControl: "https://images.unsplash.com/photo-1607602132700-068258431c6c?w=800&auto=format&fit=crop",
  bannerHero: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&auto=format&fit=crop",
  bannerPromo: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&auto=format&fit=crop",
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

export async function POST() {
  try {
    const now = new Date()
    const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)

    console.log("🌱 Starting seed with admin users...")

    // Check existing counts
    const existingProducts = await db.product.count().catch(() => 0)
    const existingUsers = await db.user.count().catch(() => 0)
    const existingCategories = await db.category.count().catch(() => 0)

    // ─── 0. Create Admin Users FIRST (Fixes admin login problem) ───
    const adminPasswordHash = await hashPassword("admin123")
    const adminPasswordHash2 = await hashPassword("Admin@2026")
    const customerPasswordHash = await hashPassword("customer123")

    // Admin 1: +250780000000 - Main admin per user credentials
    const admin1Phone = "+250780000000"
    const admin1 = await db.user.upsert({
      where: { phone: admin1Phone },
      update: {
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        isDeleted: false,
        name: "Freedom Admin",
        email: "admin@freedomcosmeticshop.rw",
        userType: "BOTH",
        wholesaleStatus: "APPROVED",
        businessName: "FreedomCosmeticShop",
      },
      create: {
        name: "Freedom Admin",
        phone: admin1Phone,
        email: "admin@freedomcosmeticshop.rw",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        userType: "BOTH",
        wholesaleStatus: "APPROVED",
        businessName: "FreedomCosmeticShop",
        loyaltyPoints: 0,
      },
    })
    console.log(`✓ Admin 1: ${admin1.phone} / admin123`)

    // Admin 2: +250788123456 - Old admin
    const admin2Phone = "+250788123456"
    await db.user.upsert({
      where: { phone: admin2Phone },
      update: { passwordHash: adminPasswordHash2, role: "ADMIN", isDeleted: false },
      create: {
        name: "Elissa Admin",
        phone: admin2Phone,
        email: "elissa@freedomcosmeticshop.rw",
        passwordHash: adminPasswordHash2,
        role: "ADMIN",
        userType: "BOTH",
        wholesaleStatus: "APPROVED",
        businessName: "FreedomCosmeticShop",
      },
    })
    console.log(`✓ Admin 2: ${admin2Phone} / Admin@2026`)

    // Test Customer
    const customerPhone = "+250780000001"
    await db.user.upsert({
      where: { phone: customerPhone },
      update: { passwordHash: customerPasswordHash, role: "CUSTOMER", isDeleted: false },
      create: {
        name: "Test Customer",
        phone: customerPhone,
        email: "customer@test.rw",
        passwordHash: customerPasswordHash,
        role: "CUSTOMER",
        userType: "RETAIL",
        loyaltyPoints: 100,
      },
    })
    console.log(`✓ Customer: ${customerPhone} / customer123`)

    // If we have products already, just return admin creation success
    if (existingProducts > 0 && existingCategories > 0) {
      return NextResponse.json({
        ok: true,
        message: `Admin users created/updated. DB already has ${existingProducts} products and ${existingUsers} users`,
        admins: [
          { phone: "+250780000000", password: "admin123", role: "ADMIN" },
          { phone: "+250788123456", password: "Admin@2026", role: "ADMIN" },
          { phone: "+250780000001", password: "customer123", role: "CUSTOMER" },
        ],
      })
    }

    // ─── 1. Brands ───
    const brandsData = [
      { name: "Freedom Glow", slug: "freedom-glow", description: "Skincare for radiant skin", logo: IMG.vitaminC, country: "Rwanda" },
      { name: "Freedom Pure", slug: "freedom-pure", description: "Gentle everyday essentials", logo: IMG.cleanser, country: "Rwanda" },
      { name: "Freedom Color", slug: "freedom-color", description: "Makeup for melanin-rich skin", logo: IMG.foundation, country: "Rwanda" },
      { name: "Freedom Mane", slug: "freedom-mane", description: "Haircare for textured hair", logo: IMG.shampoo, country: "Rwanda" },
    ]
    const brandMap: Record<string, string> = {}
    for (const b of brandsData) {
      const existing = await db.brand.findFirst({ where: { slug: b.slug } })
      let created
      if (existing) {
        created = existing
      } else {
        created = await db.brand.create({ data: b })
      }
      brandMap[b.slug] = created.id
    }

    // ─── 2. Categories ───
    const catsData = [
      { name: "Skincare", slug: "skincare", description: "Cleansers, moisturizers, serums & sunscreens", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop" },
      { name: "Makeup", slug: "makeup", description: "Foundation, lipstick, eyeshadow & more", image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop" },
      { name: "Haircare", slug: "haircare", description: "Shampoo, conditioner, oils & treatments", image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&auto=format&fit=crop" },
    ]
    const catMap: Record<string, string> = {}
    for (const c of catsData) {
      const existing = await db.category.findFirst({ where: { slug: c.slug } })
      let created
      if (existing) created = existing
      else created = await db.category.create({ data: c })
      catMap[c.slug] = created.id
    }

    // ─── 3. Products ───
    const products = [
      { name: "Vitamin C Brightening Serum", cat: "skincare", brand: "freedom-glow", price: 12500, compareAt: 16000, rating: 4.7, reviews: 124, stock: 48, featured: true, images: [IMG.vitaminC], desc: "15% Vitamin C serum for bright, even-toned skin. Fades dark spots.", short: "15% Vitamin C serum for bright skin" },
      { name: "Hyaluronic Acid Hydrating Serum", cat: "skincare", brand: "freedom-glow", price: 9800, rating: 4.6, reviews: 89, stock: 62, featured: true, images: [IMG.hyaluronic], desc: "72-hour hydration for plump, smooth skin", short: "72-hour hydration serum" },
      { name: "Gentle Foaming Cleanser", cat: "skincare", brand: "freedom-pure", price: 6500, rating: 4.5, reviews: 156, stock: 80, featured: false, images: [IMG.cleanser], desc: "Sulphate-free cleanser", short: "Sulphate-free cleanser" },
      { name: "Mineral Sunscreen SPF 50", cat: "skincare", brand: "freedom-pure", price: 11200, compareAt: 14000, rating: 4.8, reviews: 203, stock: 35, featured: true, images: [IMG.sunscreen], desc: "SPF 50 with zero white cast", short: "SPF 50 zero white cast" },
      { name: "Full Coverage Foundation — Deep", cat: "makeup", brand: "freedom-color", price: 15500, compareAt: 18500, rating: 4.7, reviews: 198, stock: 42, featured: true, images: [IMG.foundation], desc: "16-hour matte foundation for melanin-rich skin", short: "16-hour matte foundation" },
      { name: "Matte Liquid Lipstick — Mocha", cat: "makeup", brand: "freedom-color", price: 6800, rating: 4.5, reviews: 234, stock: 110, featured: true, images: [IMG.lipstick], desc: "Transfer-proof matte lippie", short: "Transfer-proof matte lippie" },
      { name: "Volumizing Mascara — Black", cat: "makeup", brand: "freedom-color", price: 7200, rating: 4.4, reviews: 145, stock: 88, featured: false, images: [IMG.mascara], desc: "Smudge-proof mascara", short: "Smudge-proof mascara" },
      { name: "Eyeshadow Palette — Earth Tones", cat: "makeup", brand: "freedom-color", price: 13500, compareAt: 16500, rating: 4.6, reviews: 112, stock: 36, featured: true, images: [IMG.eyeshadow], desc: "12 shades for melanin-rich skin", short: "12 warm shades for dark skin" },
      { name: "Sulfate-Free Shampoo — Curl Care", cat: "haircare", brand: "freedom-mane", price: 8900, rating: 4.6, reviews: 167, stock: 56, featured: true, images: [IMG.shampoo], desc: "Sulfate-free for curly hair", short: "Sulfate-free shampoo" },
      { name: "Deep Conditioner — Moisture Lock", cat: "haircare", brand: "freedom-mane", price: 9500, compareAt: 11500, rating: 4.7, reviews: 142, stock: 44, featured: true, images: [IMG.conditioner], desc: "Weekly deep conditioning", short: "Weekly deep conditioner" },
      { name: "Hair Growth Oil — Rosemary & Peppermint", cat: "haircare", brand: "freedom-mane", price: 7800, rating: 4.8, reviews: 289, stock: 78, featured: true, images: [IMG.hairOil], desc: "Promotes healthy hair growth", short: "Hair growth oil" },
      { name: "Edge Control Gel — Strong Hold", cat: "haircare", brand: "freedom-mane", price: 4800, rating: 4.4, reviews: 156, stock: 92, featured: false, images: [IMG.edgeControl], desc: "24-hour edge hold", short: "24-hour edge hold" },
    ]

    let createdCount = 0
    for (const p of products) {
      const slug = slugify(p.name)
      const existing = await db.product.findFirst({ where: { slug } })
      if (!existing) {
        await db.product.create({
          data: {
            name: p.name,
            slug,
            description: p.desc,
            shortDescription: p.short,
            price: p.price,
            compareAt: (p as any).compareAt || null,
            stock: p.stock,
            images: JSON.stringify(p.images),
            rating: p.rating,
            reviewsCount: p.reviews,
            featured: p.featured,
            isNew: true,
            isActive: true,
            categoryId: catMap[p.cat],
            brandId: brandMap[p.brand],
          }
        })
        createdCount++
      }
    }

    // ─── 4. Coupons ───
    const coupon1 = await db.coupon.findFirst({ where: { code: "BEAUTY20" } })
    if (!coupon1) {
      await db.coupon.create({
        data: { code: "BEAUTY20", description: "20% off first order", type: "PERCENTAGE", value: 20, minOrderAmount: 5000, usageLimit: 1000, usageLimitPerUser: 1, startsAt: now, endsAt: inDays(365), appliesToAllProducts: true, isActive: true }
      })
    }
    const coupon2 = await db.coupon.findFirst({ where: { code: "WEEKEND15" } })
    if (!coupon2) {
      await db.coupon.create({
        data: { code: "WEEKEND15", description: "15% off weekends", type: "PERCENTAGE", value: 15, minOrderAmount: 10000, maxDiscountAmount: 5000, usageLimit: 500, usageLimitPerUser: 5, startsAt: now, endsAt: inDays(90), appliesToAllProducts: true, isActive: true }
      })
    }

    // ─── 5. Banners ───
    const bannerCount = await db.banner.count()
    if (bannerCount === 0) {
      await db.banner.create({ data: { title: "Rwanda's #1 Beauty Store 🇷🇼", subtitle: "100% Authentic Products - Pay with MTN MoMo", image: IMG.bannerHero, placement: "HOME_HERO", sortOrder: 0, isActive: true }})
      await db.banner.create({ data: { title: "Beauty that unites us ✨", subtitle: "Made for Rwandan beauty", image: IMG.bannerPromo, placement: "HOME_HERO", sortOrder: 1, isActive: true }})
    }

    // ─── 6. Store Settings ───
    const existingSettings = await db.storeSettings.findFirst()
    if (!existingSettings) {
      await db.storeSettings.create({
        data: {
          storeName: "FreedomCosmeticShop",
          storeShortName: "Freedom Cosmetic",
          storeTagline: "Rwanda's Beauty Freedom",
          storeEmail: "hello@freedomcosmeticshop.rw",
          storePhone: "+250780000000",
          storeWhatsApp: "+250780000000",
          storeAddress: "Kigali, Rwanda",
          primaryColor: "#B76E79",
          currency: "RWF",
          timezone: "Africa/Kigali",
        }
      })
    }

    return NextResponse.json({
      ok: true,
      message: `Seeded successfully: ${createdCount} new products, 3 categories, 4 brands, admin users created`,
      admins: [
        { phone: "+250780000000", password: "admin123", role: "ADMIN", name: "Freedom Admin" },
        { phone: "+250788123456", password: "Admin@2026", role: "ADMIN", name: "Elissa Admin" },
        { phone: "+250780000001", password: "customer123", role: "CUSTOMER", name: "Test Customer" },
      ],
      counts: { products: await db.product.count(), users: await db.user.count(), categories: await db.category.count() }
    })
  } catch (error) {
    console.error("Seed failed:", error)
    return NextResponse.json({ error: "Failed to seed database", details: String(error), stack: error instanceof Error ? error.stack : undefined }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
