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
import { z } from "zod"

const UpdateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  shortDescription: z.string().max(300).optional().nullable(),
  price: z.number().int().min(0).optional(),
  compareAt: z.number().int().min(0).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  sku: z.string().optional().nullable(),
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
      include: { category: true, brand: true },
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
    await requireRole("ADMIN")
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
      include: { category: true, brand: true },
    })

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
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
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
