/**
 * POST /api/admin/products/bulk-pricing
 *
 * Section 3: Bulk wholesale price update for multiple products.
 *
 * Body:
 *   {
 *     productIds: string[],
 *     tiers: [
 *       { minQuantity: 6, maxQuantity: 11, discountPercent: 12 },
 *       { minQuantity: 12, maxQuantity: 23, discountPercent: 18 },
 *       { minQuantity: 24, maxQuantity: 47, discountPercent: 24 },
 *       { minQuantity: 48, maxQuantity: null, discountPercent: 29 },
 *     ],
 *     wholesaleActive: boolean,
 *     minWholesaleQty: number,
 *   }
 *
 * Applies the discount percentages to each product's retail price
 * to calculate the wholesale tier prices.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, PERMISSIONS } from "@/lib/permissions"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const BulkTierSchema = z.object({
  minQuantity: z.number().int().min(1),
  maxQuantity: z.number().int().min(1).nullable(),
  discountPercent: z.number().int().min(0).max(100),
})

const BulkPricingSchema = z.object({
  productIds: z.array(z.string()).min(1),
  tiers: z.array(BulkTierSchema).min(1),
  wholesaleActive: z.boolean().default(true),
  minWholesaleQty: z.number().int().min(1).default(6),
})

export async function POST(req: Request) {
  try {
    const adminUser = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)
    const body = await req.json()
    const parsed = BulkPricingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const { productIds, tiers, wholesaleActive, minWholesaleQty } = parsed.data

    // Fetch all products
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isDeleted: false },
      select: { id: true, name: true, price: true },
    })

    if (products.length === 0) {
      return NextResponse.json({ error: "No valid products found" }, { status: 404 })
    }

    let updatedCount = 0

    for (const product of products) {
      // Calculate tier prices from retail price + discount %
      const calculatedTiers = tiers.map((t) => {
        const pricePerUnit = Math.round(product.price * (1 - t.discountPercent / 100))
        const tierName = t.minQuantity === 1 ? "Retail" : `Buy ${t.minQuantity}+`
        return {
          tierName,
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          pricePerUnit,
          discountPercent: t.discountPercent,
        }
      })

      // Update product wholesale fields
      await db.product.update({
        where: { id: product.id },
        data: { wholesaleActive, minWholesaleQty },
      })

      // Upsert pricing + tiers
      const existing = await db.productPricing.findUnique({ where: { productId: product.id } })

      if (existing) {
        await db.wholesaleTier.deleteMany({ where: { pricingId: existing.id } })
        await db.productPricing.update({
          where: { id: existing.id },
          data: { retailPrice: product.price, priceType: "WHOLESALE" },
        })
        await db.wholesaleTier.createMany({
          data: calculatedTiers.map((t) => ({ ...t, pricingId: existing.id })),
        })
      } else {
        await db.productPricing.create({
          data: {
            productId: product.id,
            retailPrice: product.price,
            priceType: "WHOLESALE",
            tiers: { create: calculatedTiers },
          },
        })
      }

      updatedCount++
    }

    // Audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "PRODUCT_UPDATE",
      entityType: "PRODUCT",
      entityId: null,
      description: `Bulk wholesale pricing applied to ${updatedCount} products: ${tiers.length} tiers, wholesaleActive=${wholesaleActive}`,
      req,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Wholesale pricing applied to ${updatedCount} product${updatedCount !== 1 ? "s" : ""}`,
      updatedCount,
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error("Bulk pricing error:", error)
    return NextResponse.json({ error: "Failed to apply bulk pricing" }, { status: 500 })
  }
}
