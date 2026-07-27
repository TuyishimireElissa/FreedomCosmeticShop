import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient, HairType, ImageType } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const APPROVED_PROJECT_REF = 'hsdqahltrqjeaskhheis'
const PRODUCT_FOLDER = 'freedomcosmeticshop/products/'
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dohoc0tmp/image/upload/'

const NullableText = z.string().trim().min(1).optional().nullable()
const ImageSchema = z.object({
  publicId: z.string().trim().startsWith(PRODUCT_FOLDER),
  url: z.string().url().optional(),
  altText: z.string().trim().min(2).max(300),
  altTextRw: z.string().trim().max(300).optional().nullable(),
  imageType: z.nativeEnum(ImageType).default(ImageType.PRODUCT),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
})

const BatchSchema = z.object({
  batchNumber: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(0),
  manufacturedDate: z.string().date().optional().nullable(),
  expiryDate: z.string().date().optional().nullable(),
  receivedDate: z.string().date().optional(),
  supplierInvoice: NullableText,
  notes: NullableText,
})

const ProductSchema = z.object({
  enabled: z.literal(true),
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  categorySlug: z.string().trim().min(1),
  brandSlug: z.string().trim().min(1).optional().nullable(),
  description: z.string().trim().min(10).max(5000),
  shortDescription: z.string().trim().max(300).optional().nullable(),
  price: z.number().int().min(0),
  compareAt: z.number().int().min(0).optional().nullable(),
  costPrice: z.number().int().min(0).optional().nullable(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  sku: NullableText,
  realSku: NullableText,
  supplier: z.object({ name: z.string().trim().min(2), email: z.string().email().optional().nullable(), phone: NullableText, country: NullableText }).optional().nullable(),
  batchNumber: NullableText,
  manufacturedDate: z.string().date().optional().nullable(),
  expiryDate: z.string().date().optional().nullable(),
  periodAfterOpening: z.number().int().min(1).max(120).optional().nullable(),
  volume: NullableText,
  volumeMl: z.number().positive().optional().nullable(),
  weightGrams: z.number().positive().optional().nullable(),
  skinType: z.array(z.enum(['ALL', 'OILY', 'DRY', 'COMBINATION', 'SENSITIVE', 'NORMAL'])).optional().nullable(),
  hairType: z.nativeEnum(HairType).optional().nullable(),
  shades: z.array(z.string().trim().min(1)).optional().nullable(),
  shade: NullableText,
  shadeHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  undertone: NullableText,
  ingredients: z.array(z.string().trim().min(1)).optional().nullable(),
  ingredientsRw: NullableText,
  howToUse: NullableText,
  howToUseRw: NullableText,
  warnings: NullableText,
  warningsRw: NullableText,
  allergens: z.array(z.string().trim().min(1)).default([]),
  fragranceNotes: z.object({ top: z.array(z.string()).optional(), middle: z.array(z.string()).optional(), base: z.array(z.string()).optional() }).optional().nullable(),
  expectedResults: NullableText,
  expectedResultsRw: NullableText,
  resultsTimeframe: NullableText,
  isAuthentic: z.boolean().default(false),
  authenticityInfo: NullableText,
  countryOfOrigin: NullableText,
  importedBy: NullableText,
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  images: z.array(ImageSchema).min(1).max(20),
  initialBatch: BatchSchema.optional().nullable(),
}).superRefine((product, context) => {
  if (product.compareAt !== null && product.compareAt !== undefined && product.compareAt <= product.price) context.addIssue({ code: z.ZodIssueCode.custom, path: ['compareAt'], message: 'compareAt must be greater than price' })
  if (product.isAuthentic && !product.authenticityInfo) context.addIssue({ code: z.ZodIssueCode.custom, path: ['authenticityInfo'], message: 'Verified authenticity requires supporting information' })
  if (product.images.filter((image) => image.isPrimary).length > 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['images'], message: 'Only one image may be primary' })
  if (product.initialBatch && product.initialBatch.quantity !== product.stock) context.addIssue({ code: z.ZodIssueCode.custom, path: ['initialBatch', 'quantity'], message: 'Initial batch quantity must equal initial stock' })
  const manufactured = product.initialBatch?.manufacturedDate || product.manufacturedDate
  const expiry = product.initialBatch?.expiryDate || product.expiryDate
  if (manufactured && expiry && expiry <= manufactured) context.addIssue({ code: z.ZodIssueCode.custom, path: ['expiryDate'], message: 'Expiry must be after manufacturing date' })
})

const ImportFileSchema = z.object({
  schemaVersion: z.literal(1),
  products: z.array(z.unknown()),
})

function argument(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

async function main() {
  const fileArg = argument('file')
  const apply = process.argv.includes('--apply')
  const confirmedProject = argument('confirm-project')
  if (!fileArg) throw new Error('Missing --file. Copy scripts/data/real-products.template.json, fill verified data, then pass its path.')
  if (apply && confirmedProject !== APPROVED_PROJECT_REF) throw new Error(`Applying requires --confirm-project=${APPROVED_PROJECT_REF}`)

  const source = JSON.parse(await readFile(resolve(process.cwd(), fileArg), 'utf8'))
  const envelope = ImportFileSchema.parse(source)
  const enabledRows = envelope.products.filter((row) => typeof row === 'object' && row !== null && (row as { enabled?: unknown }).enabled === true)
  if (enabledRows.length === 0) throw new Error('No products have enabled=true. The template cannot insert placeholder rows.')
  const products = z.array(ProductSchema).parse(enabledRows)
  const duplicateSlugs = products.map((product) => product.slug).filter((slug, index, all) => all.indexOf(slug) !== index)
  if (duplicateSlugs.length) throw new Error(`Duplicate slugs in import file: ${[...new Set(duplicateSlugs)].join(', ')}`)

  console.log(`Validated ${products.length} enabled real-product record(s).`)
  if (!apply) {
    console.log('Dry run only. No database records were changed. Add --apply with the approved project confirmation after review.')
    return
  }

  let created = 0
  let skipped = 0
  for (const product of products) {
    const existing = await prisma.product.findUnique({ where: { slug: product.slug }, select: { id: true } })
    if (existing) {
      console.log(`Skipped existing slug: ${product.slug}`)
      skipped += 1
      continue
    }
    const category = await prisma.category.findUnique({ where: { slug: product.categorySlug }, select: { id: true } })
    if (!category) throw new Error(`Missing category slug: ${product.categorySlug}`)
    const brand = product.brandSlug ? await prisma.brand.findUnique({ where: { slug: product.brandSlug }, select: { id: true } }) : null
    if (product.brandSlug && !brand) throw new Error(`Missing brand slug: ${product.brandSlug}`)
    let supplierId: string | null = null
    if (product.supplier) {
      const supplier = await prisma.supplier.findFirst({ where: { name: { equals: product.supplier.name, mode: 'insensitive' } }, select: { id: true } })
        || await prisma.supplier.create({ data: { name: product.supplier.name, email: product.supplier.email || null, phone: product.supplier.phone || null, country: product.supplier.country || null }, select: { id: true } })
      supplierId = supplier.id
    }

    await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name: product.name,
          slug: product.slug,
          categoryId: category.id,
          brandId: brand?.id || null,
          supplierId,
          description: product.description,
          shortDescription: product.shortDescription || null,
          price: product.price,
          compareAt: product.compareAt ?? null,
          costPrice: product.costPrice ?? null,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          sku: product.sku || null,
          realSku: product.realSku || null,
          batchNumber: product.initialBatch?.batchNumber || product.batchNumber || null,
          manufacturedDate: product.initialBatch?.manufacturedDate ? new Date(product.initialBatch.manufacturedDate) : product.manufacturedDate ? new Date(product.manufacturedDate) : null,
          expiryDate: product.initialBatch?.expiryDate ? new Date(product.initialBatch.expiryDate) : product.expiryDate ? new Date(product.expiryDate) : null,
          periodAfterOpening: product.periodAfterOpening ?? null,
          volume: product.volume || null,
          volumeMl: product.volumeMl ?? null,
          weightGrams: product.weightGrams ?? null,
          images: '[]',
          skinType: product.skinType ? JSON.stringify(product.skinType) : null,
          hairType: product.hairType ?? null,
          shades: product.shades ? JSON.stringify(product.shades) : null,
          shade: product.shade || null,
          shadeHex: product.shadeHex || null,
          undertone: product.undertone || null,
          ingredients: product.ingredients ? JSON.stringify(product.ingredients) : null,
          ingredientsRw: product.ingredientsRw || null,
          howToUse: product.howToUse || null,
          howToUseRw: product.howToUseRw || null,
          warnings: product.warnings || null,
          warningsRw: product.warningsRw || null,
          allergens: product.allergens,
          fragranceNotes: product.fragranceNotes || undefined,
          expectedResults: product.expectedResults || null,
          expectedResultsRw: product.expectedResultsRw || null,
          resultsTimeframe: product.resultsTimeframe || null,
          isAuthentic: product.isAuthentic,
          authenticityInfo: product.authenticityInfo || null,
          countryOfOrigin: product.countryOfOrigin || null,
          importedBy: product.importedBy || null,
          featured: product.featured,
          isActive: product.isActive,
          isNew: false,
          rating: 0,
          reviewsCount: 0,
          productImages: {
            create: product.images.map((image, index) => ({
              publicId: image.publicId,
              url: image.url || `${CLOUDINARY_BASE}${image.publicId}`,
              altText: image.altText,
              altTextRw: image.altTextRw || null,
              imageType: image.imageType,
              isPrimary: image.isPrimary || (index === 0 && !product.images.some((item) => item.isPrimary)),
              sortOrder: image.sortOrder,
            })),
          },
        },
      })
      if (product.initialBatch) {
        await tx.productBatch.create({
          data: {
            productId: createdProduct.id,
            batchNumber: product.initialBatch.batchNumber,
            quantity: product.initialBatch.quantity,
            manufacturedDate: product.initialBatch.manufacturedDate ? new Date(product.initialBatch.manufacturedDate) : null,
            expiryDate: product.initialBatch.expiryDate ? new Date(product.initialBatch.expiryDate) : null,
            receivedDate: product.initialBatch.receivedDate ? new Date(product.initialBatch.receivedDate) : new Date(),
            supplierInvoice: product.initialBatch.supplierInvoice || null,
            notes: product.initialBatch.notes || null,
          },
        })
      }
    })
    created += 1
    console.log(`Created: ${product.slug}`)
  }
  console.log(`Import complete. Created ${created}; skipped ${skipped}; deleted 0.`)
}

main()
  .catch((error) => { console.error(`Real product import failed: ${error instanceof Error ? error.message : 'Unknown error'}`); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
