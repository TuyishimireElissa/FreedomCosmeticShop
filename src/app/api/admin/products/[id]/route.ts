export const dynamic = 'force-dynamic'

/**
 * /api/admin/products/[id]
 *
 * GET    — fetch a single product for admin editing
 * PUT    — update product fields
 * DELETE — soft-delete a product (sets isDeleted=true)
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  DESTRUCTIVE_OPERATIONS,
  requireDestructiveOperation,
  requirePermission,
  PERMISSIONS,
  rateLimit,
} from "@/lib/permissions"
import { broadcastProductEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"
import { indexProduct, unindexProduct } from '@/server/services/search'
import { serializeProductJsonColumns } from '@/lib/product-json'

const UpdateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(300).optional().nullable(),
  price: z.number().int().positive().optional(),
  wholesalePrice: z.number().int().positive().optional().nullable(),
  compareAt: z.number().int().min(0).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  sku: z.string().max(100).optional().nullable(),
  realSku: z.string().max(100).optional().nullable(),
  costPrice: z.number().int().min(0).optional().nullable(),
  supplierId: z.string().optional().nullable(),
  manufacturedDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  periodAfterOpening: z.number().int().min(1).max(120).optional().nullable(),
  batchNumber: z.string().max(100).optional().nullable(),
  volume: z.string().max(100).optional().nullable(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  skinType: z.array(z.string()).optional().nullable(),
  shades: z.array(z.string()).optional().nullable(),
  ingredients: z.array(z.string()).optional().nullable(),
  size: z.string().optional().nullable(),
  usageInstructions: z.string().optional().nullable(),
  warnings: z.string().optional().nullable(),
  // ─── Content infrastructure (23-field project, Phase 2) ──────────────
  nameRw: z.string().max(200).optional().nullable(),
  shortDescriptionRw: z.string().max(300).optional().nullable(),
  descriptionRw: z.string().max(5000).optional().nullable(),
  suitableFor: z.object({
    skinType: z.array(z.string().min(1).max(50)).max(10).optional(),
    hairType: z.array(z.string().min(1).max(50)).max(10).optional(),
    ageRange: z.string().max(50).optional(),
    gender: z.string().max(50).optional(),
  }).optional().nullable(),
  uniqueSellingPoints: z.array(z.string().min(1).max(200)).max(10).optional(),
  seoKeywords: z.string().max(1000).optional().nullable(),
  seoKeywordsRw: z.string().max(1000).optional().nullable(),
  whatsappShareText: z.string().max(2000).optional().nullable(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).strict()

function serializeProduct(p: {
  images: string
  skinType: string | null
  shades: string | null
  ingredients: string | null
  [key: string]: unknown
}) {
  // Parsed defensively so one malformed legacy JSON column cannot 500 the
  // whole edit screen. See src/lib/product-json.ts.
  return serializeProductJsonColumns(p)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_READ)
    const { id } = await params

    const product = await db.product.findFirst({
      where: { id, isDeleted: false },
      include: {
        category: true,
        brand: true,
        supplier: true,
        productImages: { orderBy: { sortOrder: "asc" } },
        batches: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ product: serializeProduct(product) })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin product GET error:", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Section 11: Permission check + rate limiting
    const adminUser = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)
    const rl = rateLimit(`admin:${adminUser.id}:product-update`, { maxActions: 60, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limited. Too many product updates. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 1000) / 1000)) } }
      )
    }
    const { id } = await params
    const body = await req.json()

    const parsed = UpdateProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.product.findFirst({
      where: { id, isDeleted: false },
    })
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    const nextPrice = parsed.data.price ?? existing.price
    const nextCompareAt = parsed.data.compareAt === undefined ? existing.compareAt : parsed.data.compareAt
    const nextWholesalePrice = parsed.data.wholesalePrice === undefined ? existing.wholesalePrice : parsed.data.wholesalePrice
    if (nextCompareAt !== null && nextCompareAt !== 0 && nextCompareAt <= nextPrice) {
      return NextResponse.json({ error: 'Compare-at price must be greater than the selling price' }, { status: 400 })
    }
    if (nextWholesalePrice !== null && nextWholesalePrice > nextPrice) {
      return NextResponse.json({ error: 'Wholesale price cannot exceed the retail price' }, { status: 400 })
    }
    const nextManufactured = parsed.data.manufacturedDate === undefined ? existing.manufacturedDate : parsed.data.manufacturedDate ? new Date(parsed.data.manufacturedDate) : null
    const nextExpiry = parsed.data.expiryDate === undefined ? existing.expiryDate : parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null
    if (nextManufactured && nextExpiry && nextExpiry <= nextManufactured) {
      return NextResponse.json({ error: 'Expiry date must be after the manufactured date' }, { status: 400 })
    }

    // Serialize array fields
    const data: Record<string, unknown> = { ...parsed.data }
    if (data.manufacturedDate !== undefined) data.manufacturedDate = data.manufacturedDate ? new Date(data.manufacturedDate as string) : null
    if (data.expiryDate !== undefined) data.expiryDate = data.expiryDate ? new Date(data.expiryDate as string) : null
    if (data.images) data.images = JSON.stringify(data.images)
    if (data.skinType !== undefined) {
      data.skinType = data.skinType ? JSON.stringify(data.skinType) : null
    }
    if (data.shades !== undefined) {
      data.shades = data.shades ? JSON.stringify(data.shades) : null
    }
    if (data.ingredients !== undefined) {
      data.ingredients = data.ingredients ? JSON.stringify(data.ingredients) : null
    }
    // If name changed, regenerate slug (but check uniqueness)
    if (data.name && data.name !== existing.name) {
      let slug = (data.name as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      const slugExists = await db.product.findFirst({
        where: { slug, id: { not: id } },
      })
      if (slugExists) slug = `${slug}-${Date.now().toString(36)}`
      data.slug = slug
    }

    const updated = await db.product.update({
      where: { id },
      data,
      include: {
        category: true,
        brand: true,
        supplier: true,
        productImages: { orderBy: { sortOrder: "asc" } },
        batches: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    })

    const updatedImages = (() => { try { return JSON.parse(updated.images) as string[] } catch { return [] } })()
    void indexProduct({ id: updated.id, name: updated.name, slug: updated.slug, price: updated.price, image: updatedImages[0] || '', brand: updated.brand?.name, category: updated.category.name })
      .catch((error) => console.error('Product search indexing failed:', error instanceof Error ? error.message : 'unknown'))

    // ─── Section 2: Real-time broadcast with smart event detection ───
    // Compare old vs new values to emit specific events that the storefront
    // can react to (price changes, stock alerts, featured toggles, etc.)
    const changes: string[] = []

    // Price change detection
    if (parsed.data.price !== undefined && parsed.data.price !== existing.price) {
      changes.push(`price: ${existing.price} → ${updated.price}`)
      await broadcastProductEvent("priceChange", {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        price: updated.price,
        oldPrice: existing.price,
      }, { source: adminUser.name })
    }

    // Stock change detection
    if (parsed.data.stock !== undefined && parsed.data.stock !== existing.stock) {
      changes.push(`stock: ${existing.stock} → ${updated.stock}`)
      const threshold = updated.lowStockThreshold || 5

      if (updated.stock === 0) {
        // Out of stock
        await broadcastProductEvent("outOfStock", {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          stock: 0,
        }, { source: adminUser.name })
      } else if (updated.stock <= threshold && existing.stock > threshold) {
        // Crossed below low-stock threshold
        await broadcastProductEvent("stockLow", {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          stock: updated.stock,
          threshold,
        }, { source: adminUser.name })
      }
    }

    // Featured toggle detection
    if (parsed.data.featured !== undefined && parsed.data.featured !== existing.featured) {
      changes.push(`featured: ${existing.featured} → ${updated.featured}`)
      await broadcastProductEvent("featured", {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        featured: updated.featured,
      }, { source: adminUser.name })
    }

    // Always emit a general "updated" event (covers name, description, images, etc.)
    // This ensures any storefront view showing this product refreshes its data.
    await broadcastProductEvent("updated", {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      price: updated.price,
      stock: updated.stock,
      isActive: updated.isActive,
      featured: updated.featured,
    }, { source: adminUser.name })

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "PRODUCT_UPDATE",
      entityType: "PRODUCT",
      entityId: updated.id,
      description: `Updated product: ${updated.name}${changes.length > 0 ? ` (${changes.join(", ")})` : ""}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ product: serializeProduct(updated) })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin product PUT error:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Section 11: Strict permission check (PRODUCTS_CRUD) + rate limiting (10/min)
    const adminUser = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PRODUCT_DELETE)
    const rl = rateLimit(`admin:${adminUser.id}:product-delete`, { maxActions: 10, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limited. Too many deletions. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 1000) / 1000)) } }
      )
    }
    const { id } = await params

    const existing = await db.product.findFirst({
      where: { id, isDeleted: false },
    })
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Soft delete
    await db.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    })

    void unindexProduct(existing.id)
      .catch((error) => console.error('Product search unindex failed:', error instanceof Error ? error.message : 'unknown'))

    // ─── Section 2: Real-time broadcast ──────────────────────────────
    // Notify all connected storefront clients that this product was deleted.
    // The storefront will remove it from all listings, product detail pages,
    // and shopping carts immediately.
    await broadcastProductEvent("deleted", {
      id: existing.id,
      name: existing.name,
      slug: existing.slug,
      price: existing.price,
      stock: existing.stock,
      isActive: false,
    }, { source: adminUser.name })

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "PRODUCT_DELETE",
      entityType: "PRODUCT",
      entityId: existing.id,
      description: `Deleted product: ${existing.name}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin product DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
