/**
 * Seed script for Ubumwe Beauty — Complete 19-model schema.
 *
 * Seeds:
 *   - 4 Brands (Ubumwe Glow, Ubumwe Pure, Ubumwe Color, Ubumwe Mane)
 *   - 3 Categories (Skincare, Makeup, Haircare)
 *   - 18 Products with skinType, shades, ingredients, brand links
 *   - 2 Coupons (welcome + weekend promo)
 *   - 3 Banners (hero + promo + checkout)
 *   - 2 Blog posts
 *
 * Run via: bun run scripts/seed.ts
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

// ─── Helpers ─────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const now = new Date()
const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)

// ─── Image URLs (Unsplash CDN) ───────────────────────────────────────────────

const IMG = {
  vitaminC: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop",
  hyaluronic: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop",
  cleanser: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop",
  sunscreen: "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=800&auto=format&fit=crop",
  moisturizer: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop",
  nightCream: "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=800&auto=format&fit=crop",
  foundation: "https://images.unsplash.com/photo-1631214524020-3c8b8b8b8b8b?w=800&auto=format&fit=crop",
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
  // Brand logos
  brandGlow: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&auto=format&fit=crop",
  brandPure: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=200&auto=format&fit=crop",
  brandColor: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&auto=format&fit=crop",
  brandMane: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=200&auto=format&fit=crop",
  // Banners
  bannerHero: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&auto=format&fit=crop",
  bannerPromo: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&auto=format&fit=crop",
}

// ─── Data ────────────────────────────────────────────────────────────────────

interface BrandInput {
  name: string
  slug: string
  description: string
  logo: string
  country: string
}

const brands: BrandInput[] = [
  {
    name: "Ubumwe Glow",
    slug: "ubumwe-glow",
    description: "Skincare formulas for radiant, healthy skin. Vitamin C, hyaluronic acid, and retinol products.",
    logo: IMG.brandGlow,
    country: "Rwanda",
  },
  {
    name: "Ubumwe Pure",
    slug: "ubumwe-pure",
    description: "Gentle, everyday skincare essentials. Mineral sunscreens, sulphate-free cleansers.",
    logo: IMG.brandPure,
    country: "Rwanda",
  },
  {
    name: "Ubumwe Color",
    slug: "ubumwe-color",
    description: "Makeup for melanin-rich skin. Foundations, lipsticks, and palettes in deep shades.",
    logo: IMG.brandColor,
    country: "Rwanda",
  },
  {
    name: "Ubumwe Mane",
    slug: "ubumwe-mane",
    description: "Haircare for textured and coily hair. Sulfate-free, moisture-rich, growth-promoting.",
    logo: IMG.brandMane,
    country: "Rwanda",
  },
]

interface CategoryInput {
  name: string
  slug: string
  description: string
  image: string
}

const categories: CategoryInput[] = [
  {
    name: "Skincare",
    slug: "skincare",
    description: "Cleansers, moisturizers, serums & sunscreens for healthy, glowing skin.",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop",
  },
  {
    name: "Makeup",
    slug: "makeup",
    description: "Foundation, lipstick, eyeshadow & more — shades for every skin tone.",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop",
  },
  {
    name: "Haircare",
    slug: "haircare",
    description: "Shampoo, conditioner, oils & treatments for textured and coily hair.",
    image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&auto=format&fit=crop",
  },
]

interface ProductInput {
  name: string
  description: string
  shortDescription: string
  price: number // RWF
  compareAt?: number
  images: string[]
  rating: number
  reviewsCount: number
  stock: number
  brandSlug: string
  featured?: boolean
  // Cosmetics-specific
  skinType?: string[] // e.g., ["OILY", "COMBINATION"]
  shades?: string[] // e.g., ["Deep", "Medium"]
  ingredients?: string[]
  size?: string
  usageInstructions?: string
  warnings?: string
}

const productsByCategory: Record<string, ProductInput[]> = {
  skincare: [
    {
      name: "Vitamin C Brightening Serum",
      description:
        "A potent 15% Vitamin C serum that brightens dull skin, fades dark spots, and protects against pollution. Lightweight formula absorbs quickly without stickiness. Suitable for all skin types, including sensitive skin. Apply 3-4 drops every morning before sunscreen for a radiant, even-toned complexion.",
      shortDescription: "15% Vitamin C serum for bright, even-toned skin.",
      price: 12500,
      compareAt: 16000,
      images: [IMG.vitaminC],
      rating: 4.7,
      reviewsCount: 124,
      stock: 48,
      brandSlug: "ubumwe-glow",
      featured: true,
      skinType: ["ALL", "OILY", "COMBINATION", "NORMAL"],
      ingredients: ["Vitamin C (15%)", "Ferulic Acid", "Hyaluronic Acid", "Glycerin", "Vitamin E"],
      size: "30ml",
      usageInstructions: "Apply 3-4 drops to clean skin every morning. Follow with moisturizer and sunscreen.",
      warnings: "Patch test before first use. Avoid contact with eyes. Discontinue use if irritation occurs.",
    },
    {
      name: "Hyaluronic Acid Hydrating Serum",
      description:
        "Deeply hydrating serum with multi-weight hyaluronic acid that plumps fine lines and locks in moisture for up to 72 hours. Layer under moisturizer morning and night. Non-comedogenic and fragrance-free — perfect for Kigali's dry season.",
      shortDescription: "72-hour hydration for plump, smooth skin.",
      price: 9800,
      images: [IMG.hyaluronic],
      rating: 4.6,
      reviewsCount: 89,
      stock: 62,
      brandSlug: "ubumwe-glow",
      featured: true,
      skinType: ["ALL", "DRY", "SENSITIVE"],
      ingredients: ["Hyaluronic Acid", "Panthenol", "Glycerin"],
      size: "30ml",
      usageInstructions: "Apply 2-3 drops to damp skin morning and night. Follow with moisturizer.",
    },
    {
      name: "Gentle Foaming Cleanser",
      description:
        "A sulphate-free foaming cleanser that removes makeup, dirt, and excess oil without stripping the skin barrier. Formulated with glycerin and aloe vera to soothe. Pump a small amount, massage onto damp skin, rinse. Use morning and night.",
      shortDescription: "Sulphate-free cleanser that won't strip your skin.",
      price: 6500,
      images: [IMG.cleanser],
      rating: 4.5,
      reviewsCount: 156,
      stock: 80,
      brandSlug: "ubumwe-pure",
      skinType: ["ALL", "OILY", "COMBINATION"],
      ingredients: ["Glycerin", "Aloe Vera", "Chamomile Extract"],
      size: "150ml",
      usageInstructions: "Pump a small amount onto damp hands. Massage onto face for 30 seconds. Rinse with lukewarm water.",
    },
    {
      name: "Mineral Sunscreen SPF 50",
      description:
        "Broad-spectrum SPF 50 mineral sunscreen with zinc oxide. Leaves no white cast on dark skin tones. Water-resistant for up to 80 minutes. Essential for Rwanda's high UV index — apply every 2 hours when outdoors.",
      shortDescription: "SPF 50 with zero white cast on dark skin.",
      price: 11200,
      compareAt: 14000,
      images: [IMG.sunscreen],
      rating: 4.8,
      reviewsCount: 203,
      stock: 35,
      brandSlug: "ubumwe-pure",
      featured: true,
      skinType: ["ALL"],
      ingredients: ["Zinc Oxide 20%", "Niacinamide", "Green Tea Extract"],
      size: "50ml",
      usageInstructions: "Apply generously 15 minutes before sun exposure. Reapply every 2 hours when outdoors.",
      warnings: "For external use only. Do not use on broken skin. Stop use if rash occurs.",
    },
    {
      name: "Daily Moisturizing Cream",
      description:
        "A lightweight yet deeply nourishing daily moisturizer with shea butter and ceramides. Strengthens the skin barrier, smooths texture, and preps skin for makeup. Suitable for normal to dry skin. Apply a pea-sized amount morning and night.",
      shortDescription: "Shea butter + ceramides for a strong skin barrier.",
      price: 7800,
      images: [IMG.moisturizer],
      rating: 4.4,
      reviewsCount: 78,
      stock: 95,
      brandSlug: "ubumwe-glow",
      skinType: ["ALL", "DRY", "NORMAL"],
      ingredients: ["Shea Butter", "Ceramides", "Glycerin", "Niacinamide"],
      size: "50ml",
      usageInstructions: "Apply a pea-sized amount to face and neck after serum. Morning and night.",
    },
    {
      name: "Overnight Repair Night Cream",
      description:
        "Rich night cream with retinol, peptides, and niacinamide that works while you sleep. Reduces fine lines, evens skin tone, and boosts radiance. Start with 2-3 nights per week and gradually increase. Always follow with SPF the next morning.",
      shortDescription: "Retinol night cream for smoother skin by morning.",
      price: 14200,
      images: [IMG.nightCream],
      rating: 4.6,
      reviewsCount: 67,
      stock: 28,
      brandSlug: "ubumwe-glow",
      skinType: ["ALL", "DRY", "NORMAL", "COMBINATION"],
      ingredients: ["Retinol 0.3%", "Peptides", "Niacinamide", "Squalane"],
      size: "50ml",
      usageInstructions: "Apply a pea-sized amount to clean skin at night. Start 2-3 nights per week. Always use SPF the next morning.",
      warnings: "Do not use if pregnant. May cause mild peeling in the first 2 weeks. Avoid combining with other retinol products.",
    },
  ],
  makeup: [
    {
      name: "Full Coverage Foundation — Deep",
      description:
        "Buildable medium-to-full coverage foundation with a natural matte finish. Formulated for melanin-rich skin tones — no ashiness, no oxidation. Long-wearing up to 16 hours. Shade 'Deep' suits medium-deep to deep Rwandan skin tones. Available in 12 shades.",
      shortDescription: "16-hour matte foundation for melanin-rich skin.",
      price: 15500,
      compareAt: 18500,
      images: [IMG.foundation],
      rating: 4.7,
      reviewsCount: 198,
      stock: 42,
      brandSlug: "ubumwe-color",
      featured: true,
      shades: ["Light", "Medium", "Medium-Deep", "Deep", "Deep-Ebony", "Ebony"],
      skinType: ["ALL", "OILY", "COMBINATION"],
      ingredients: ["Hyaluronic Acid", "Vitamin E", "SPF 15"],
      size: "30ml",
      usageInstructions: "Apply with a damp beauty sponge or foundation brush. Start from the center of the face and blend outward.",
    },
    {
      name: "Matte Liquid Lipstick — Mocha",
      description:
        "Highly pigmented liquid lipstick that dries to a comfortable matte finish. Transfer-proof and lasts through meals. Shade 'Mocha' is a warm nude brown that flatters deep skin tones. Enriched with vitamin E to prevent drying.",
      shortDescription: "Transfer-proof matte lippie in warm nude brown.",
      price: 6800,
      images: [IMG.lipstick],
      rating: 4.5,
      reviewsCount: 234,
      stock: 110,
      brandSlug: "ubumwe-color",
      featured: true,
      shades: ["Mocha", "Berry", "Crimson", "Nude", "Plum", "Coral"],
      ingredients: ["Vitamin E", "Jojoba Oil", "Castor Oil"],
      size: "6ml",
      usageInstructions: "Apply to clean, dry lips. Allow 60 seconds to fully dry. Layer for more intensity.",
    },
    {
      name: "Volumizing Mascara — Black",
      description:
        "Lash-doubling mascara with a curved brush that lifts, curls, and volumizes in one coat. Smudge-proof and flake-free formula. Removes easily with warm water. Ophthalmologist-tested — safe for sensitive eyes and contact lens wearers.",
      shortDescription: "Lash-doubling mascara, smudge-proof all day.",
      price: 7200,
      images: [IMG.mascara],
      rating: 4.4,
      reviewsCount: 145,
      stock: 88,
      brandSlug: "ubumwe-color",
      shades: ["Black", "Brown-Black"],
      ingredients: ["Beeswax", "Carnauba Wax", "Panthenol"],
      size: "10ml",
      usageInstructions: "Wiggle the brush from root to tip. Apply 1-2 coats. Remove with warm water and cleanser.",
    },
    {
      name: "Eyeshadow Palette — Earth Tones",
      description:
        "12-shade eyeshadow palette with matte and shimmer finishes. Warm browns, coppers, and golds that pop on dark skin. Highly pigmented and blendable. Long-wearing formula that doesn't crease. Perfect for day-to-night looks.",
      shortDescription: "12 warm shades that pop on melanin-rich skin.",
      price: 13500,
      compareAt: 16500,
      images: [IMG.eyeshadow],
      rating: 4.6,
      reviewsCount: 112,
      stock: 36,
      brandSlug: "ubumwe-color",
      featured: true,
      ingredients: ["Mica", "Talc", "Magnesium Stearate"],
      size: "12 × 1.5g",
      usageInstructions: "Apply with an eyeshadow brush. Use matte shades for the crease, shimmers for the lid.",
    },
    {
      name: "Soft Matte Blush — Rosewood",
      description:
        "Silky powder blush that adds a natural flush of color. Shade 'Rosewood' is a deep berry-rose that shows up beautifully on melanin-rich skin. Buildable formula. Contains vitamin E for smooth application. Travel-friendly compact with mirror.",
      shortDescription: "Berry-rose blush for a natural flush on dark skin.",
      price: 5900,
      images: [IMG.blush],
      rating: 4.3,
      reviewsCount: 87,
      stock: 70,
      brandSlug: "ubumwe-color",
      shades: ["Rosewood", "Berry", "Coral", "Plum", "Bronze"],
      ingredients: ["Mica", "Vitamin E", "Talc"],
      size: "4g",
      usageInstructions: "Smile and apply to the apples of the cheeks. Blend upward toward the temples.",
    },
    {
      name: "High-Shine Lip Gloss — Honey",
      description:
        "Non-sticky lip gloss with mirror-like shine. Shade 'Honey' is a sheer golden nude that works on all skin tones. Infused with jojoba oil for hydration. Wear alone or layer over lipstick. Vanilla-mint flavor.",
      shortDescription: "Mirror-shine gloss infused with jojoba oil.",
      price: 5200,
      images: [IMG.lipgloss],
      rating: 4.5,
      reviewsCount: 96,
      stock: 125,
      brandSlug: "ubumwe-color",
      shades: ["Honey", "Clear", "Rose", "Mauve"],
      ingredients: ["Jojoba Oil", "Castor Oil", "Vitamin E"],
      size: "8ml",
      usageInstructions: "Apply directly to lips. Wear alone or over lipstick.",
    },
  ],
  haircare: [
    {
      name: "Sulfate-Free Shampoo — Curl Care",
      description:
        "Gentle sulfate-free shampoo that cleanses without stripping natural oils. Formulated for curly, coily, and textured hair. Contains argan oil and shea butter to moisturize while washing. Lathers lightly. Safe for color-treated hair.",
      shortDescription: "Sulfate-free shampoo for curly & coily hair.",
      price: 8900,
      images: [IMG.shampoo],
      rating: 4.6,
      reviewsCount: 167,
      stock: 56,
      brandSlug: "ubumwe-mane",
      featured: true,
      ingredients: ["Argan Oil", "Shea Butter", "Aloe Vera", "Panthenol"],
      size: "300ml",
      usageInstructions: "Wet hair thoroughly. Massage a small amount into scalp. Rinse. Follow with conditioner.",
    },
    {
      name: "Deep Conditioner — Moisture Lock",
      description:
        "Rich, creamy deep conditioner that restores moisture and slip to textured hair. Use weekly for 15-30 minutes under a warm cap. Reduces breakage and detangles easily. Contains hydrolyzed protein and panthenol. Paraben and silicone-free.",
      shortDescription: "Weekly deep conditioning for moisture & slip.",
      price: 9500,
      compareAt: 11500,
      images: [IMG.conditioner],
      rating: 4.7,
      reviewsCount: 142,
      stock: 44,
      brandSlug: "ubumwe-mane",
      featured: true,
      ingredients: ["Hydrolyzed Protein", "Panthenol", "Shea Butter", "Coconut Oil"],
      size: "250ml",
      usageInstructions: "After shampooing, apply generously from mid-length to ends. Leave for 15-30 minutes under a warm cap. Rinse.",
    },
    {
      name: "Hair Growth Oil — Rosemary & Peppermint",
      description:
        "Stimulating scalp oil blend with rosemary, peppermint, and castor oil. Promotes healthy hair growth and reduces shedding. Massage into scalp 2-3 times per week. Lightweight, non-greasy formula. 100ml bottle with dropper.",
      shortDescription: "Rosemary + castor oil for healthy hair growth.",
      price: 7800,
      images: [IMG.hairOil],
      rating: 4.8,
      reviewsCount: 289,
      stock: 78,
      brandSlug: "ubumwe-mane",
      featured: true,
      ingredients: ["Rosemary Oil", "Peppermint Oil", "Castor Oil", "Jojoba Oil", "Biotin"],
      size: "100ml",
      usageInstructions: "Part hair and apply a few drops directly to scalp. Massage for 5 minutes. Leave in or rinse after 2 hours.",
      warnings: "Patch test before use. Avoid contact with eyes. Do not use on broken scalp.",
    },
    {
      name: "Curl Defining Cream",
      description:
        "Leave-in cream that defines curls and coils without crunch. Provides hold, shine, and frizz control for up to 3 days. Apply to damp hair in sections. Contains shea butter, aloe vera, and jojoba oil. No flaking, no buildup.",
      shortDescription: "Frizz-free curl definition for 3 days.",
      price: 8200,
      images: [IMG.curlCream],
      rating: 4.5,
      reviewsCount: 134,
      stock: 52,
      brandSlug: "ubumwe-mane",
      ingredients: ["Shea Butter", "Aloe Vera", "Jojoba Oil", "Panthenol"],
      size: "250ml",
      usageInstructions: "Apply to damp, sectioned hair. Rake through and scrunch. Air dry or diffuse.",
    },
    {
      name: "Intensive Hair Mask — Repair",
      description:
        "Protein-rich hair mask that repairs heat and chemical damage. Use every 2 weeks in place of conditioner. Leaves hair soft, strong, and shiny. Contains keratin, biotin, and avocado oil. 250g jar — approximately 8-10 uses.",
      shortDescription: "Keratin + biotin mask for damaged hair.",
      price: 11800,
      compareAt: 14000,
      images: [IMG.hairMask],
      rating: 4.6,
      reviewsCount: 98,
      stock: 38,
      brandSlug: "ubumwe-mane",
      ingredients: ["Keratin", "Biotin", "Avocado Oil", "Argan Oil"],
      size: "250g",
      usageInstructions: "Apply to clean, damp hair. Leave for 20-30 minutes. Rinse. Use every 2 weeks.",
    },
    {
      name: "Edge Control Gel — Strong Hold",
      description:
        "Long-lasting edge control gel that lays baby hairs flat without flaking. Strong 24-hour hold. Adds shine. Non-greasy and lightweight. Suitable for all hair types. 113g jar. A little goes a long way.",
      shortDescription: "24-hour edge hold, zero flaking.",
      price: 4800,
      images: [IMG.edgeControl],
      rating: 4.4,
      reviewsCount: 156,
      stock: 92,
      brandSlug: "ubumwe-mane",
      ingredients: ["Aloe Vera", "Castor Oil", "Panthenol"],
      size: "113g",
      usageInstructions: "Apply a small amount to edges with a small brush. Smooth and shape as desired.",
    },
  ],
}

// ─── Main seed function ──────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting complete seed...")

  // Clear all existing data (order matters for foreign keys)
  await db.notification.deleteMany()
  await db.banner.deleteMany()
  await db.blogPost.deleteMany()
  await db.loyaltyPoints.deleteMany()
  await db.coupon.deleteMany()
  await db.address.deleteMany()
  await db.wishlist.deleteMany()
  await db.review.deleteMany()
  await db.delivery.deleteMany()
  await db.payment.deleteMany()
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.cartItem.deleteMany()
  await db.cart.deleteMany()
  await db.product.deleteMany()
  await db.brand.deleteMany()
  await db.category.deleteMany()
  await db.staffProfile.deleteMany()
  await db.user.deleteMany()
  console.log("✓ Cleared all existing data")

  // ─── 1. Brands ────────────────────────────────────────────────────────
  const brandMap: Record<string, string> = {}
  for (const b of brands) {
    const created = await db.brand.create({ data: b })
    brandMap[b.slug] = created.id
    console.log(`✓ Created brand: ${b.name}`)
  }

  // ─── 2. Categories ────────────────────────────────────────────────────
  const categoryMap: Record<string, string> = {}
  for (const c of categories) {
    const created = await db.category.create({ data: c })
    categoryMap[c.slug] = created.id
    console.log(`✓ Created category: ${c.name}`)
  }

  // ─── 3. Products (with brand links + cosmetics fields) ────────────────
  let productCount = 0
  for (const [catSlug, items] of Object.entries(productsByCategory)) {
    const categoryId = categoryMap[catSlug]
    for (const item of items) {
      await db.product.create({
        data: {
          name: item.name,
          slug: slugify(item.name),
          description: item.description,
          shortDescription: item.shortDescription,
          price: item.price,
          compareAt: item.compareAt ?? null,
          stock: item.stock,
          images: JSON.stringify(item.images),
          rating: item.rating,
          reviewsCount: item.reviewsCount,
          featured: item.featured ?? false,
          isNew: true,
          isActive: true,
          // Cosmetics-specific
          skinType: item.skinType ? JSON.stringify(item.skinType) : null,
          shades: item.shades ? JSON.stringify(item.shades) : null,
          ingredients: item.ingredients ? JSON.stringify(item.ingredients) : null,
          size: item.size || null,
          usageInstructions: item.usageInstructions || null,
          warnings: item.warnings || null,
          // Relations
          categoryId,
          brandId: brandMap[item.brandSlug],
        },
      })
      productCount++
    }
  }
  console.log(`✓ Created ${productCount} products`)

  // ─── 4. Coupons ───────────────────────────────────────────────────────
  await db.coupon.create({
    data: {
      code: "WELCOME10",
      description: "10% off your first order",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 5000,
      usageLimit: 1000,
      usageLimitPerUser: 1,
      startsAt: now,
      endsAt: inDays(365),
      appliesToAllProducts: true,
      isActive: true,
    },
  })
  await db.coupon.create({
    data: {
      code: "WEEKEND15",
      description: "15% off on weekends",
      type: "PERCENTAGE",
      value: 15,
      minOrderAmount: 10000,
      maxDiscountAmount: 5000,
      usageLimit: 500,
      usageLimitPerUser: 5,
      startsAt: now,
      endsAt: inDays(90),
      appliesToAllProducts: true,
      isActive: true,
    },
  })
  console.log("✓ Created 2 coupons (WELCOME10, WEEKEND15)")

  // ─── 5. Banners ───────────────────────────────────────────────────────
  await db.banner.create({
    data: {
      title: "Beauty that unites us",
      subtitle: "Authentic skincare, makeup & haircare for Rwanda.",
      image: IMG.bannerHero,
      placement: "HOME_HERO",
      sortOrder: 0,
      isActive: true,
    },
  })
  await db.banner.create({
    data: {
      title: "MTN MoMo Weekend Sale",
      subtitle: "15% off with code WEEKEND15 — pay easily with Mobile Money.",
      image: IMG.bannerPromo,
      placement: "HOME_PROMO",
      sortOrder: 1,
      isActive: true,
    },
  })
  console.log("✓ Created 2 banners")

  // ─── 6. Blog posts ────────────────────────────────────────────────────
  await db.blogPost.create({
    data: {
      title: "5 Skincare Tips for Rwanda's Climate",
      slug: "skincare-tips-rwanda-climate",
      excerpt: "Rwanda's high UV index and varying humidity call for a tailored skincare routine. Here's what works.",
      content: "# 5 Skincare Tips for Rwanda's Climate\n\nRwanda's climate is beautiful but demanding on your skin...",
      coverImage: IMG.sunscreen,
      tags: JSON.stringify(["skincare", "sunscreen", "rwanda"]),
      status: "PUBLISHED",
      publishedAt: now,
    },
  })
  await db.blogPost.create({
    data: {
      title: "How to Build a Curly Hair Routine",
      slug: "curly-hair-routine-guide",
      excerpt: "A step-by-step guide to building a curly hair routine that works for textured and coily hair types.",
      content: "# How to Build a Curly Hair Routine\n\nCurly hair needs moisture, definition, and gentle care...",
      coverImage: IMG.curlCream,
      tags: JSON.stringify(["haircare", "curly hair", "routine"]),
      status: "PUBLISHED",
      publishedAt: now,
    },
  })
  console.log("✓ Created 2 blog posts")

  console.log("\n✅ Complete seed finished!")
  console.log(`   Brands: ${brands.length}`)
  console.log(`   Categories: ${categories.length}`)
  console.log(`   Products: ${productCount}`)
  console.log(`   Coupons: 2`)
  console.log(`   Banners: 2`)
  console.log(`   Blog posts: 2`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
