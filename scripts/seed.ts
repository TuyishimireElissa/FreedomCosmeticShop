/**
 * Seed script for Ubumwe Beauty
 * Run via: bun run /home/z/my-project/scripts/seed.ts
 *
 * Seeds:
 *  - 3 categories (Skincare, Makeup, Haircare)
 *  - 18 products (6 per category) tailored for the Rwandan market
 *  - Prices in RWF (Rwandan Franc)
 *
 * Images use Unsplash CDN URLs (royalty-free, fast CDN, no auth required).
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Helper to slugify a string
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Image URLs from Unsplash CDN (cosmetics-themed, stable IDs)
const IMG = {
  // Skincare
  vitaminC: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop',
  hyaluronic: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop',
  cleanser: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop',
  sunscreen: 'https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=800&auto=format&fit=crop',
  moisturizer: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop',
  nightCream: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=800&auto=format&fit=crop',
  // Makeup
  foundation: 'https://images.unsplash.com/photo-1631214524020-3c8b8b8b8b8b?w=800&auto=format&fit=crop',
  lipstick: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop',
  mascara: 'https://images.unsplash.com/photo-1631214540242-3cd8c4b0b3b6?w=800&auto=format&fit=crop',
  eyeshadow: 'https://images.unsplash.com/photo-1583241800698-9c2e6b0f7c0a?w=800&auto=format&fit=crop',
  blush: 'https://images.unsplash.com/photo-1599733589046-8a35aa3271c8?w=800&auto=format&fit=crop',
  lipgloss: 'https://images.unsplash.com/photo-1599751449628-9d4a93b3f0a1?w=800&auto=format&fit=crop',
  // Haircare
  shampoo: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop',
  conditioner: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&auto=format&fit=crop',
  hairOil: 'https://images.unsplash.com/photo-1607602132700-068258431c6c?w=800&auto=format&fit=crop',
  curlCream: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&auto=format&fit=crop',
  hairMask: 'https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&auto=format&fit=crop',
  edgeControl: 'https://images.unsplash.com/photo-1607602132700-068258431c6c?w=800&auto=format&fit=crop',
}

type ProductInput = {
  name: string
  description: string
  price: number // RWF
  compareAt?: number
  images: string[]
  rating: number
  reviews: number
  stock: number
  brand: string
  featured?: boolean
}

const categories: { name: string; slug: string; description: string; image: string }[] = [
  {
    name: 'Skincare',
    slug: 'skincare',
    description: 'Cleansers, moisturizers, serums & sunscreens for healthy, glowing skin.',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop',
  },
  {
    name: 'Makeup',
    slug: 'makeup',
    description: 'Foundation, lipstick, eyeshadow & more — shades for every skin tone.',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop',
  },
  {
    name: 'Haircare',
    slug: 'haircare',
    description: 'Shampoo, conditioner, oils & treatments for textured and coily hair.',
    image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&auto=format&fit=crop',
  },
]

const productsByCategory: Record<string, ProductInput[]> = {
  skincare: [
    {
      name: 'Vitamin C Brightening Serum',
      description:
        'A potent 15% Vitamin C serum that brightens dull skin, fades dark spots, and protects against pollution. Lightweight formula absorbs quickly without stickiness. Suitable for all skin types, including sensitive skin. Apply 3-4 drops every morning before sunscreen for a radiant, even-toned complexion.',
      price: 12500,
      compareAt: 16000,
      images: [IMG.vitaminC],
      rating: 4.7,
      reviews: 124,
      stock: 48,
      brand: 'Ubumwe Glow',
      featured: true,
    },
    {
      name: 'Hyaluronic Acid Hydrating Serum',
      description:
        'Deeply hydrating serum with multi-weight hyaluronic acid that plumps fine lines and locks in moisture for up to 72 hours. Layer under moisturizer morning and night. Non-comedogenic and fragrance-free — perfect for Kigali\'s dry season.',
      price: 9800,
      images: [IMG.hyaluronic],
      rating: 4.6,
      reviews: 89,
      stock: 62,
      brand: 'Ubumwe Glow',
      featured: true,
    },
    {
      name: 'Gentle Foaming Cleanser',
      description:
        'A sulphate-free foaming cleanser that removes makeup, dirt, and excess oil without stripping the skin barrier. Formulated with glycerin and aloe vera to soothe. Pump a small amount, massage onto damp skin, rinse. Use morning and night.',
      price: 6500,
      images: [IMG.cleanser],
      rating: 4.5,
      reviews: 156,
      stock: 80,
      brand: 'Ubumwe Pure',
    },
    {
      name: 'Mineral Sunscreen SPF 50',
      description:
        'Broad-spectrum SPF 50 mineral sunscreen with zinc oxide. Leaves no white cast on dark skin tones. Water-resistant for up to 80 minutes. Essential for Rwanda\'s high UV index — apply every 2 hours when outdoors.',
      price: 11200,
      compareAt: 14000,
      images: [IMG.sunscreen],
      rating: 4.8,
      reviews: 203,
      stock: 35,
      brand: 'Ubumwe Pure',
      featured: true,
    },
    {
      name: 'Daily Moisturizing Cream',
      description:
        'A lightweight yet deeply nourishing daily moisturizer with shea butter and ceramides. Strengthens the skin barrier, smooths texture, and preps skin for makeup. Suitable for normal to dry skin. Apply a pea-sized amount morning and night.',
      price: 7800,
      images: [IMG.moisturizer],
      rating: 4.4,
      reviews: 78,
      stock: 95,
      brand: 'Ubumwe Glow',
    },
    {
      name: 'Overnight Repair Night Cream',
      description:
        'Rich night cream with retinol, peptides, and niacinamide that works while you sleep. Reduces fine lines, evens skin tone, and boosts radiance. Start with 2-3 nights per week and gradually increase. Always follow with SPF the next morning.',
      price: 14200,
      images: [IMG.nightCream],
      rating: 4.6,
      reviews: 67,
      stock: 28,
      brand: 'Ubumwe Glow',
    },
  ],
  makeup: [
    {
      name: 'Full Coverage Foundation — Deep',
      description:
        'Buildable medium-to-full coverage foundation with a natural matte finish. Formulated for melanin-rich skin tones — no ashiness, no oxidation. Long-wearing up to 16 hours. Shade "Deep" suits medium-deep to deep Rwandan skin tones. Available in 12 shades.',
      price: 15500,
      compareAt: 18500,
      images: [IMG.foundation],
      rating: 4.7,
      reviews: 198,
      stock: 42,
      brand: 'Ubumwe Color',
      featured: true,
    },
    {
      name: 'Matte Liquid Lipstick — Mocha',
      description:
        'Highly pigmented liquid lipstick that dries to a comfortable matte finish. Transfer-proof and lasts through meals. Shade "Mocha" is a warm nude brown that flatters deep skin tones. Enriched with vitamin E to prevent drying.',
      price: 6800,
      images: [IMG.lipstick],
      rating: 4.5,
      reviews: 234,
      stock: 110,
      brand: 'Ubumwe Color',
      featured: true,
    },
    {
      name: 'Volumizing Mascara — Black',
      description:
        'Lash-doubling mascara with a curved brush that lifts, curls, and volumizes in one coat. Smudge-proof and flake-free formula. Removes easily with warm water. Ophthalmologist-tested — safe for sensitive eyes and contact lens wearers.',
      price: 7200,
      images: [IMG.mascara],
      rating: 4.4,
      reviews: 145,
      stock: 88,
      brand: 'Ubumwe Color',
    },
    {
      name: 'Eyeshadow Palette — Earth Tones',
      description:
        '12-shade eyeshadow palette with matte and shimmer finishes. Warm browns, coppers, and golds that pop on dark skin. Highly pigmented and blendable. Long-wearing formula that doesn\'t crease. Perfect for day-to-night looks.',
      price: 13500,
      compareAt: 16500,
      images: [IMG.eyeshadow],
      rating: 4.6,
      reviews: 112,
      stock: 36,
      brand: 'Ubumwe Color',
      featured: true,
    },
    {
      name: 'Soft Matte Blush — Rosewood',
      description:
        'Silky powder blush that adds a natural flush of color. Shade "Rosewood" is a deep berry-rose that shows up beautifully on melanin-rich skin. Buildable formula. Contains vitamin E for smooth application. Travel-friendly compact with mirror.',
      price: 5900,
      images: [IMG.blush],
      rating: 4.3,
      reviews: 87,
      stock: 70,
      brand: 'Ubumwe Color',
    },
    {
      name: 'High-Shine Lip Gloss — Honey',
      description:
        'Non-sticky lip gloss with mirror-like shine. Shade "Honey" is a sheer golden nude that works on all skin tones. Infused with jojoba oil for hydration. Wear alone or layer over lipstick. Vanilla-mint flavor.',
      price: 5200,
      images: [IMG.lipgloss],
      rating: 4.5,
      reviews: 96,
      stock: 125,
      brand: 'Ubumwe Color',
    },
  ],
  haircare: [
    {
      name: 'Sulfate-Free Shampoo — Curl Care',
      description:
        'Gentle sulfate-free shampoo that cleanses without stripping natural oils. Formulated for curly, coily, and textured hair. Contains argan oil and shea butter to moisturize while washing. Lathers lightly. Safe for color-treated hair.',
      price: 8900,
      images: [IMG.shampoo],
      rating: 4.6,
      reviews: 167,
      stock: 56,
      brand: 'Ubumwe Mane',
      featured: true,
    },
    {
      name: 'Deep Conditioner — Moisture Lock',
      description:
        'Rich, creamy deep conditioner that restores moisture and slip to textured hair. Use weekly for 15-30 minutes under a warm cap. Reduces breakage and detangles easily. Contains hydrolyzed protein and panthenol. Paraben and silicone-free.',
      price: 9500,
      compareAt: 11500,
      images: [IMG.conditioner],
      rating: 4.7,
      reviews: 142,
      stock: 44,
      brand: 'Ubumwe Mane',
      featured: true,
    },
    {
      name: 'Hair Growth Oil — Rosemary & Peppermint',
      description:
        'Stimulating scalp oil blend with rosemary, peppermint, and castor oil. Promotes healthy hair growth and reduces shedding. Massage into scalp 2-3 times per week. Lightweight, non-greasy formula. 100ml bottle with dropper.',
      price: 7800,
      images: [IMG.hairOil],
      rating: 4.8,
      reviews: 289,
      stock: 78,
      brand: 'Ubumwe Mane',
      featured: true,
    },
    {
      name: 'Curl Defining Cream',
      description:
        'Leave-in cream that defines curls and coils without crunch. Provides hold, shine, and frizz control for up to 3 days. Apply to damp hair in sections. Contains shea butter, aloe vera, and jojoba oil. No flaking, no buildup.',
      price: 8200,
      images: [IMG.curlCream],
      rating: 4.5,
      reviews: 134,
      stock: 52,
      brand: 'Ubumwe Mane',
    },
    {
      name: 'Intensive Hair Mask — Repair',
      description:
        'Protein-rich hair mask that repairs heat and chemical damage. Use every 2 weeks in place of conditioner. Leaves hair soft, strong, and shiny. Contains keratin, biotin, and avocado oil. 250g jar — approximately 8-10 uses.',
      price: 11800,
      compareAt: 14000,
      images: [IMG.hairMask],
      rating: 4.6,
      reviews: 98,
      stock: 38,
      brand: 'Ubumwe Mane',
    },
    {
      name: 'Edge Control Gel — Strong Hold',
      description:
        'Long-lasting edge control gel that lays baby hairs flat without flaking. Strong 24-hour hold. Adds shine. Non-greasy and lightweight. Suitable for all hair types. 113g jar. A little goes a long way.',
      price: 4800,
      images: [IMG.edgeControl],
      rating: 4.4,
      reviews: 156,
      stock: 92,
      brand: 'Ubumwe Mane',
    },
  ],
}

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data (safe for re-running)
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.product.deleteMany()
  await db.category.deleteMany()
  console.log('✓ Cleared existing data')

  // Insert categories
  const categoryMap: Record<string, string> = {}
  for (const c of categories) {
    const created = await db.category.create({ data: c })
    categoryMap[c.slug] = created.id
    console.log(`✓ Created category: ${c.name}`)
  }

  // Insert products
  let productCount = 0
  for (const [catSlug, items] of Object.entries(productsByCategory)) {
    const categoryId = categoryMap[catSlug]
    for (const item of items) {
      await db.product.create({
        data: {
          name: item.name,
          slug: slugify(item.name),
          description: item.description,
          price: item.price,
          compareAt: item.compareAt ?? null,
          images: JSON.stringify(item.images),
          rating: item.rating,
          reviews: item.reviews,
          stock: item.stock,
          brand: item.brand,
          featured: item.featured ?? false,
          isActive: true,
          categoryId,
        },
      })
      productCount++
    }
  }
  console.log(`✓ Created ${productCount} products`)

  console.log('\n✅ Seed complete!')
  console.log(`   Categories: ${categories.length}`)
  console.log(`   Products: ${productCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
