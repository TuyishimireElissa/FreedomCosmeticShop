export const dynamic = 'force-dynamic'

/**
 * /api/admin/products
 *
 * GET — list all products for admin (includes inactive + deleted=false).
 *       Supports search, pagination, sorting.
 *
 * POST — create a new product. Requires ADMIN role.
 *        Accepts: name, description, price, compareAt?, stock, brandId, categoryId,
 *                  images (array), skinType?, shades?, ingredients?, size?, etc.
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/auth"
import { broadcastProductEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const CreateProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(10).max(5000),
  shortDescription: z.string().max(300).optional().nullable(),
  price: z.number().int().min(0),
  compareAt: z.number().int().min(0).optional().nullable(),
  stock: z.number().int().min(0).default(0),
  sku: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  images: z.array(z.string().url()).min(1),
  skinType: z.array(z.string()).optional().nullable(),
  shades: z.array(z.string()).optional().nullable(),
  ingredients: z.array(z.string()).optional().nullable(),
  size: z.string().optional().nullable(),
  usageInstructions: z.string().optional().nullable(),
  warnings: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN")

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() || ""
    const page = Math.max(1, Number(searchParams.get("page") || "1"))
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") || "50"))
    )

    const where: Prisma.ProductWhereInput = { isDeleted: false }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { brand: { name: { contains: search } } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, brand: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ])

    const serialized = products.map((p) => ({
      ...p,
      images: JSON.parse(p.images) as string[],
      skinType: p.skinType ? JSON.parse(p.skinType) : null,
      shades: p.shades ? JSON.parse(p.shades) : null,
      ingredients: p.ingredients ? JSON.parse(p.ingredients) : null,
    }))

    return NextResponse.json({
      success: true,
      data: { products: serialized, pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      } },
      products: serialized,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin products GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN")

    const body = await req.json()
    const parsed = CreateProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid product data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const data = parsed.data

    // Generate unique slug
    let slug = slugify(data.name)
    const existing = await prisma.product.findFirst({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription || null,
        price: data.price,
        compareAt: data.compareAt ?? null,
        stock: data.stock,
        sku: data.sku || null,
        brandId: data.brandId || null,
        categoryId: data.categoryId,
        images: JSON.stringify(data.images),
        skinType: data.skinType ? JSON.stringify(data.skinType) : null,
        shades: data.shades ? JSON.stringify(data.shades) : null,
        ingredients: data.ingredients ? JSON.stringify(data.ingredients) : null,
        size: data.size || null,
        usageInstructions: data.usageInstructions || null,
        warnings: data.warnings || null,
        featured: data.featured,
        isActive: data.isActive,
        isNew: true,
        rating: 0,
        reviewsCount: 0,
      },
      include: { category: true, brand: true },
    })

    const serializedProduct = {
      ...product,
      images: JSON.parse(product.images),
      skinType: product.skinType ? JSON.parse(product.skinType) : null,
      shades: product.shades ? JSON.parse(product.shades) : null,
      ingredients: product.ingredients ? JSON.parse(product.ingredients) : null,
    }

    // ─── Section 2: Real-time broadcast ──────────────────────────────
    // Notify all connected storefront clients that a new product was created.
    // This busts the Next.js cache + pushes an SSE event so the product
    // appears instantly on the storefront without a page refresh.
    await broadcastProductEvent("created", {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      stock: product.stock,
      isActive: product.isActive,
    }, { source: adminUser.name })

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "PRODUCT_CREATE",
      entityType: "PRODUCT",
      entityId: product.id,
      description: `Created product: ${product.name} (${product.price} RWF)`,
      req,
    }).catch(() => {})

    return NextResponse.json(
      { success: true, data: { product: serializedProduct }, product: serializedProduct },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin product POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 })
  }
}
