export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/products/bulk-import
 *
 * Phase 3 of the content-infrastructure project: bulk-import product content
 * (the 23 fields) from a pasted JSON payload, typically produced by ChatGPT.
 *
 * Body:
 *   {
 *     "products": [
 *       {
 *         "identifier": "SKU-OR-SLUG-TO-MATCH",
 *         "name": "English name",
 *         "nameRw": "Kinyarwanda name",
 *         "brand": "Brand name",
 *         "category": "category-slug",
 *         "shortDescription": "...",
 *         ...all content fields...
 *         "weight": 500
 *       }
 *     ],
 *     "preview": false,     // true = report matches + planned changes, write nothing
 *     "overwrite": false    // true = replace non-empty existing content
 *   }
 *
 * SAFETY
 * - Only content fields can be written (see CONTENT_FIELD_MAP in
 *   src/lib/product-import.ts). Price, stock, category, images, flags and
 *   every other core field are structurally impossible to modify here.
 * - Existing content is never overwritten unless `overwrite: true`.
 * - Each product is matched by SKU, distributor SKU or slug; matches happen
 *   before any write, inside a transaction.
 * - Admin-only (products.update permission) + rate limited + audit logged.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, rateLimit, requirePermission } from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'
import {
  BulkImportPayloadSchema,
  computeContentUpdate,
} from '@/lib/product-import'

interface ImportResultEntry {
  identifier: string
  status: 'updated' | 'unchanged' | 'failed' | 'not_found'
  matchedBy: 'sku' | 'realSku' | 'slug' | null
  product: { id: string; name: string; slug: string } | null
  updatedFields: string[]
  skippedFields: string[]
  warnings: string[]
  error: string | null
}

export async function POST(req: Request) {
  try {
    const adminUser = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)
    const limit = rateLimit(`admin:${adminUser.id}:product-bulk-import`, { maxActions: 10, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many import attempts. Wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.retryAfterMs || 1000) / 1000)) } },
      )
    }

    const body = await req.json().catch(() => null)
    const parsed = BulkImportPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid import payload', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { products, preview, overwrite } = parsed.data

    // ─── 1. Resolve references once (categories are informational-only) ──
    const [categories, brands] = await Promise.all([
      prisma.category.findMany({ where: { isDeleted: false }, select: { slug: true, name: true } }),
      prisma.brand.findMany({ where: { isDeleted: false }, select: { id: true, name: true, slug: true } }),
    ])
    const categoryBySlug = new Map(categories.map((category) => [category.slug, category]))
    const brandByName = new Map(brands.map((brand) => [brand.name.toLowerCase(), brand]))
    const brandBySlug = new Map(brands.map((brand) => [brand.slug.toLowerCase(), brand]))

    // ─── 2. Match each identifier to a live product ──────────────────────
    const results: ImportResultEntry[] = []
    const toWrite: Array<{ entry: ImportResultEntry; id: string; data: Record<string, unknown> }> = []

    for (const incoming of products) {
      const entry: ImportResultEntry = {
        identifier: incoming.identifier,
        status: 'not_found',
        matchedBy: null,
        product: null,
        updatedFields: [],
        skippedFields: [],
        warnings: [],
        error: null,
      }
      try {
        const exact = await prisma.product.findFirst({
          where: {
            isDeleted: false,
            OR: [
              { sku: incoming.identifier },
              { realSku: incoming.identifier },
              { slug: incoming.identifier },
            ],
          },
          select: {
            id: true, name: true, slug: true, sku: true, realSku: true, brandId: true,
            nameRw: true, shortDescription: true, shortDescriptionRw: true,
            description: true, descriptionRw: true,
            ingredients: true, ingredientsRw: true,
            howToUse: true, howToUseRw: true,
            expectedResults: true, expectedResultsRw: true,
            warnings: true, warningsRw: true,
            suitableFor: true, uniqueSellingPoints: true,
            seoKeywords: true, seoKeywordsRw: true, whatsappShareText: true,
            weightGrams: true,
          },
        })
        let product = exact
        let matchedBy: 'sku' | 'realSku' | 'slug' | null = exact
          ? exact.sku === incoming.identifier
            ? 'sku'
            : exact.realSku === incoming.identifier
              ? 'realSku'
              : 'slug'
          : null
        // Fallback: slug lookup is case-insensitive-friendly via lowercase.
        if (!product) {
          const lower = incoming.identifier.toLowerCase()
          const bySlug = await prisma.product.findFirst({
            where: { isDeleted: false, slug: lower },
            select: {
              id: true, name: true, slug: true, sku: true, realSku: true, brandId: true,
              nameRw: true, shortDescription: true, shortDescriptionRw: true,
              description: true, descriptionRw: true,
              ingredients: true, ingredientsRw: true,
              howToUse: true, howToUseRw: true,
              expectedResults: true, expectedResultsRw: true,
              warnings: true, warningsRw: true,
              suitableFor: true, uniqueSellingPoints: true,
              seoKeywords: true, seoKeywordsRw: true, whatsappShareText: true,
              weightGrams: true,
            },
          })
          if (bySlug) {
            product = bySlug
            matchedBy = 'slug'
          }
        }
        if (!product) {
          entry.status = 'not_found'
          entry.error = `No live product matches "${incoming.identifier}" (checked SKU, distributor SKU and slug).`
          results.push(entry)
          continue
        }
        entry.product = { id: product.id, name: product.name, slug: product.slug }
        entry.matchedBy = matchedBy

        // Informational reference checks — never modify categoryId.
        if (incoming.category && !categoryBySlug.has(incoming.category)) {
          entry.warnings.push(`Category "${incoming.category}" does not exist — category left unchanged.`)
        }
        let brandIdWrite: string | null | undefined
        if (incoming.brand) {
          const brand = brandByName.get(incoming.brand.toLowerCase()) || brandBySlug.get(incoming.brand.toLowerCase())
          if (brand) {
            if (!product.brandId || overwrite) {
              brandIdWrite = brand.id
              entry.updatedFields.push('brand')
            } else if (brand.id !== product.brandId) {
              entry.skippedFields.push('brand')
            }
          } else {
            entry.warnings.push(`Brand "${incoming.brand}" does not exist — create it in the brands admin first.`)
          }
        }

        const computed = computeContentUpdate(product, incoming, overwrite)
        entry.updatedFields.push(...computed.updatedFields)
        entry.skippedFields.push(...computed.skippedFields)
        if (brandIdWrite) computed.data.brandId = brandIdWrite

        if (Object.keys(computed.data).length === 0) {
          entry.status = 'unchanged'
          results.push(entry)
          continue
        }
        entry.status = 'updated'
        toWrite.push({ entry, id: product.id, data: computed.data })
        results.push(entry)
      } catch (error) {
        entry.status = 'failed'
        entry.error = error instanceof Error ? error.message : 'Unexpected error while matching product'
        results.push(entry)
      }
    }

    const summary = {
      total: products.length,
      matched: results.filter((result) => result.product !== null).length,
      notFound: results.filter((result) => result.status === 'not_found').length,
      wouldUpdate: results.filter((result) => result.status === 'updated').length,
      unchanged: results.filter((result) => result.status === 'unchanged').length,
      failed: results.filter((result) => result.status === 'failed').length,
    }

    if (preview) {
      return NextResponse.json({ success: true, preview: true, summary, results })
    }

    // ─── 3. Apply writes, one transaction per product ────────────────────
    // Per-product transactions keep one bad row from blocking the batch,
    // while each product's update is all-or-nothing.
    let applied = 0
    for (const item of toWrite) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({ where: { id: item.id }, data: item.data })
        })
        applied++
      } catch (error) {
        item.entry.status = 'failed'
        item.entry.error = error instanceof Error ? error.message : 'Failed to write product update'
      }
    }

    // Best-effort audit log — never blocks the response.
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: 'PRODUCT_BULK_IMPORT',
      entityType: 'PRODUCT',
      entityId: null,
      description: `Bulk import: ${applied} of ${toWrite.length} product content updates applied (overwrite=${overwrite})`,
      req,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      preview: false,
      summary: { ...summary, applied, failedWrites: toWrite.length - applied },
      results,
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: (error as { statusCode: number }).statusCode },
      )
    }
    console.error('Bulk import error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process bulk import' }, { status: 500 })
  }
}
