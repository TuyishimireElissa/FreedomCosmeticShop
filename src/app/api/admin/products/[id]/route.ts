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
import { requireRole } from "@/lib/auth"
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

const UpdateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(300).optional().nullable(),
  price: z.number().int().min(0).optional(),
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
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

function serializeProduct(p: {
  images: string
  skinType: string | null
  shades: string | null
  ingredients: string | null
  [key: string]: unknown
}) {
  return {
    ...p,
    images: JSON.parse(p.images),
    skinType: p.skinType ? JSON.parse(p.skinType) : null,
    shades: p.shades ? JSON.parse(p.shades) : null,
    ingredients: p.ingredients ? JSON.parse(p.ingredients) : null,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
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
