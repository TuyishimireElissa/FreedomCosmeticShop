export const dynamic = 'force-dynamic'

/**
 * GET  /api/admin/products/[id]/pricing — get wholesale pricing tiers for a product
 * PUT  /api/admin/products/[id]/pricing — set wholesale pricing tiers
 *
 * Section 3: Product Pricing Management
 *
 * PUT body:
 *   {
 *     wholesaleActive: boolean,
 *     minWholesaleQty: number,
 *     tiers: [
 *       { tierName: "Buy 6+", minQuantity: 6, maxQuantity: 11, pricePerUnit: 7500, discountPercent: 12 },
 *       { tierName: "Buy 12+", minQuantity: 12, maxQuantity: 23, pricePerUnit: 7000, discountPercent: 18 },
 *       ...
 *     ]
 *   }
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, PERMISSIONS } from "@/lib/permissions"
import { broadcastProductEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const TierSchema = z.object({
  tierName: z.string().min(1).max(50),
  minQuantity: z.number().int().min(1),
  maxQuantity: z.number().int().min(1).nullable(),
  pricePerUnit: z.number().int().min(0),
  discountPercent: z.number().int().min(0).max(100),
})

const PricingSchema = z.object({
  wholesaleActive: z.boolean().default(true),
  minWholesaleQty: z.number().int().min(1).default(6),
  tiers: z.array(TierSchema).min(1),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_READ)
    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        price: true,
        costPrice: true,
        wholesaleActive: true,
        minWholesaleQty: true,
        pricing: {
          include: { tiers: { orderBy: { minQuantity: "asc" } } },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Missing pricing stays unconfigured; the server never invents fallback tiers.
    const tiers = product.pricing?.tiers || []

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        retailPrice: product.price,
        costPrice: product.costPrice,
        wholesaleActive: product.wholesaleActive,
        minWholesaleQty: product.minWholesaleQty,
      },
      tiers,
      hasCustomPricing: !!product.pricing,
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    return NextResponse.json({ error: "Failed to fetch pricing" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)
    const { id } = await params
    const body = await req.json()
    const parsed = PricingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const configuredTiers = [...parsed.data.tiers]
      .sort((a, b) => a.minQuantity - b.minQuantity)
      .map((tier) => ({
        ...tier,
        discountPercent: product.price > 0
          ? Math.max(0, Math.round(((product.price - tier.pricePerUnit) / product.price) * 100))
          : 0,
      }))

    for (let index = 0; index < configuredTiers.length; index += 1) {
      const tier = configuredTiers[index]
      if (tier.maxQuantity !== null && tier.maxQuantity < tier.minQuantity) {
        return NextResponse.json({ error: "A tier maximum cannot be below its minimum" }, { status: 400 })
      }
      const previous = configuredTiers[index - 1]
      if (previous && (previous.maxQuantity === null || tier.minQuantity <= previous.maxQuantity)) {
        return NextResponse.json({ error: "Wholesale pricing tiers cannot overlap" }, { status: 400 })
      }
    }

    // Update product wholesale fields
    await db.product.update({
      where: { id },
      data: {
        wholesaleActive: parsed.data.wholesaleActive,
        minWholesaleQty: parsed.data.minWholesaleQty,
      },
    })

    // Upsert ProductPricing + replace tiers
    const existingPricing = await db.productPricing.findUnique({ where: { productId: id } })

    if (existingPricing) {
      // Delete old tiers + update pricing
      await db.wholesaleTier.deleteMany({ where: { pricingId: existingPricing.id } })
      await db.productPricing.update({
        where: { id: existingPricing.id },
        data: {
          retailPrice: product.price,
          priceType: "WHOLESALE",
        },
      })
      // Create new tiers
      await db.wholesaleTier.createMany({
        data: configuredTiers.map((t) => ({
          pricingId: existingPricing.id,
          tierName: t.tierName,
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          pricePerUnit: t.pricePerUnit,
          discountPercent: t.discountPercent,
        })),
      })
    } else {
      // Create new pricing + tiers
      await db.productPricing.create({
        data: {
          productId: id,
          retailPrice: product.price,
          priceType: "WHOLESALE",
          tiers: {
            create: configuredTiers.map((t) => ({
              tierName: t.tierName,
              minQuantity: t.minQuantity,
              maxQuantity: t.maxQuantity,
              pricePerUnit: t.pricePerUnit,
              discountPercent: t.discountPercent,
            })),
          },
        },
      })
    }

    // Broadcast update
    await broadcastProductEvent("updated", {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
    }, { source: adminUser.name })

    // Audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "PRODUCT_UPDATE",
      entityType: "PRODUCT",
      entityId: product.id,
      description: `Updated wholesale pricing for ${product.name}: ${configuredTiers.length} tiers, wholesaleActive=${parsed.data.wholesaleActive}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ success: true, message: "Wholesale pricing saved" })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error("Pricing update error:", error)
    return NextResponse.json({ error: "Failed to save pricing" }, { status: 500 })
  }
}
