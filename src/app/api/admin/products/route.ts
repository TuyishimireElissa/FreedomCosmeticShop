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
import { randomBytes } from 'node:crypto'
import { PERMISSIONS, rateLimit, requirePermission } from '@/lib/permissions'
import { broadcastProductEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { indexProduct } from '@/server/services/search'
import { CreateProductSchema } from '@/lib/admin-product-schema'
import { serializeProductJsonColumns } from '@/lib/product-json'

function addProfitInfo<T extends { price: number; costPrice: number | null }>(product: T) {
  if (product.costPrice === null || product.price <= 0) return product
  const profitAmount = product.price - product.costPrice
  return {
    ...product,
    profitAmount,
    profitMargin: Math.round((profitAmount / product.price) * 1000) / 10,
  }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(req: Request) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_READ)

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
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { realSku: { contains: search, mode: "insensitive" } },
        { batchNumber: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          supplier: true,
          productImages: { orderBy: { sortOrder: "asc" } },
          batches: { orderBy: { createdAt: "desc" }, take: 5 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ])

    // Parsed defensively: a single row with a malformed JSON column must never
    // abort the map and blank the whole page. See src/lib/product-json.ts.
    const serialized = products.map((p) => addProfitInfo(serializeProductJsonColumns(p)))

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
    const adminUser = await requirePermission(PERMISSIONS.PRODUCTS_CRUD)
    const limit = rateLimit(`admin:${adminUser.id}:product-create`, { maxActions: 20, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ success: false, error: 'Too many product creation attempts. Wait a minute and try again.' }, { status: 429 })

    const body = await req.json().catch(() => null)
    const parsed = CreateProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid product data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const data = parsed.data
    const [category, brand, supplier] = await Promise.all([
      prisma.category.findFirst({ where: { id: data.categoryId, isActive: true, isDeleted: false }, select: { id: true } }),
      data.brandId ? prisma.brand.findFirst({ where: { id: data.brandId, isActive: true, isDeleted: false }, select: { id: true } }) : Promise.resolve(null),
      data.supplierId ? prisma.supplier.findFirst({ where: { id: data.supplierId, isActive: true }, select: { id: true } }) : Promise.resolve(null),
    ])
    if (!category) return NextResponse.json({ success: false, error: 'Please select a valid active category', code: 'INVALID_CATEGORY', details: { fieldErrors: { categoryId: ['Select an active category and try again.'] } } }, { status: 400 })
    if (data.brandId && !brand) return NextResponse.json({ success: false, error: 'Selected brand is not available', code: 'INVALID_BRAND', details: { fieldErrors: { brandId: ['Select an active brand or choose no brand.'] } } }, { status: 400 })
    if (data.supplierId && !supplier) return NextResponse.json({ success: false, error: 'Selected supplier is not available', code: 'INVALID_SUPPLIER', details: { fieldErrors: { supplierId: ['Select an active supplier or choose no supplier.'] } } }, { status: 400 })

    const duplicateIdentifiers = [
      data.sku ? { sku: data.sku } : null,
      data.realSku ? { realSku: data.realSku } : null,
    ].filter(Boolean) as Array<{ sku: string } | { realSku: string }>
    if (duplicateIdentifiers.length > 0) {
      const duplicate = await prisma.product.findFirst({ where: { OR: duplicateIdentifiers }, select: { sku: true, realSku: true } })
      if (duplicate) {
        const field = data.sku && duplicate.sku === data.sku ? 'sku' : 'realSku'
        return NextResponse.json({ success: false, error: field === 'sku' ? 'SKU is already used by another product' : 'Distributor SKU is already used by another product', code: 'DUPLICATE_IDENTIFIER', details: { fieldErrors: { [field]: ['This value must be unique.'] } } }, { status: 409 })
      }
    }

    // Generate a URL-safe non-empty unique slug and SKU.
    const slugBase = slugify(data.name) || `product-${randomBytes(4).toString('hex')}`
    let slug = slugBase
    let slugSuffix = 1
    while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) slug = `${slugBase}-${slugSuffix++}`
    let sku = data.sku?.trim() || ''
    if (!sku) {
      do { sku = `FCS-${randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}` }
      while (await prisma.product.findUnique({ where: { sku }, select: { id: true } }))
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description.trim(),
        shortDescription: data.shortDescription || null,
        price: data.price,
        wholesalePrice: data.wholesalePrice ?? null,
        compareAt: data.compareAt ?? null,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        sku,
        realSku: data.realSku || null,
        costPrice: data.costPrice ?? null,
        supplierId: data.supplierId || null,
        manufacturedDate: data.manufacturedDate ? new Date(data.manufacturedDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        periodAfterOpening: data.periodAfterOpening ?? null,
        batchNumber: data.batchNumber || null,
        volume: data.volume || null,
        brandId: data.brandId || null,
        categoryId: data.categoryId,
        images: JSON.stringify(data.images),
        skinType: data.skinType ? JSON.stringify(data.skinType) : null,
        shades: data.shades ? JSON.stringify(data.shades) : null,
        ingredients: data.ingredients ? JSON.stringify(data.ingredients) : null,
        size: data.size || null,
        usageInstructions: data.usageInstructions || null,
        warnings: data.warnings || null,
        // ─── Content infrastructure (23-field project, Phase 2) ──────────
        nameRw: data.nameRw || null,
        shortDescriptionRw: data.shortDescriptionRw || null,
        descriptionRw: data.descriptionRw || null,
        suitableFor: data.suitableFor ?? null,
        uniqueSellingPoints: data.uniqueSellingPoints ?? [],
        seoKeywords: data.seoKeywords || null,
        seoKeywordsRw: data.seoKeywordsRw || null,
        whatsappShareText: data.whatsappShareText || null,
        featured: data.featured,
        isActive: data.isActive,
        isNew: false,
        rating: 0,
        reviewsCount: 0,
      },
      include: { category: true, brand: true },
    })

    const serializedProduct = serializeProductJsonColumns(product)
    void indexProduct({ id: product.id, name: product.name, slug: product.slug, price: product.price, image: data.images[0] || '', brand: product.brand?.name, category: product.category.name })
      .catch((error) => console.error('Product search indexing failed:', error instanceof Error ? error.message : 'unknown'))

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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? String(error.meta?.target[0] || 'identifier') : String(error.meta?.target || 'identifier')
      return NextResponse.json({ success: false, error: `A product with this ${target} already exists`, code: 'DUPLICATE_PRODUCT', details: { fieldErrors: { [target]: ['This value must be unique.'] } } }, { status: 409 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json({ success: false, error: 'A selected category, brand, or supplier no longer exists. Reload the form and try again.', code: 'INVALID_REFERENCE' }, { status: 409 })
    }
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
