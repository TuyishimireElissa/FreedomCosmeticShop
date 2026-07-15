export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import cloudinary from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'
import { requirePermission, PERMISSIONS, rateLimit } from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ImageTypeSchema = z.enum(['PRODUCT', 'PACKAGING', 'BACK_LABEL', 'SEAL', 'TEXTURE', 'SIZE_SCALE', 'SHADE', 'LIFESTYLE', 'VIDEO_THUMB'])

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_READ)
    const { id } = await params
    const images = await prisma.productImage.findMany({ where: { productId: id }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] })
    return NextResponse.json({ success: true, images })
  } catch (error) {
    return handleError(error, 'Failed to fetch product images')
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let uploadedPublicId = ''
  try {
    const admin = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)
    const limit = rateLimit(`admin:${admin.id}:product-image-upload`, { maxActions: 20, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ success: false, error: 'Too many uploads. Try again later.' }, { status: 429 })

    const { id } = await params
    const product = await prisma.product.findFirst({ where: { id, isDeleted: false }, select: { id: true, name: true } })
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: 'Image file is required' }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ success: false, error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 })
    if (file.size < 1 || file.size > MAX_FILE_BYTES) return NextResponse.json({ success: false, error: 'Image must be between 1 byte and 8 MB' }, { status: 400 })

    const imageType = ImageTypeSchema.safeParse(String(form.get('imageType') || 'PRODUCT'))
    const altText = String(form.get('altText') || '').trim()
    const altTextRw = String(form.get('altTextRw') || '').trim()
    const requestedPrimary = String(form.get('isPrimary') || '') === 'true'
    if (!imageType.success || altText.length < 2 || altText.length > 300 || altTextRw.length > 300) {
      return NextResponse.json({ success: false, error: 'Valid image type and English alt text are required' }, { status: 400 })
    }

    const count = await prisma.productImage.count({ where: { productId: id } })
    if (count >= 20) return NextResponse.json({ success: false, error: 'A product can have at most 20 structured images' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`
    const upload = await cloudinary.uploader.upload(dataUri, {
      folder: 'freedomcosmeticshop/products',
      resource_type: 'image',
      unique_filename: true,
      overwrite: false,
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto:good' }, { fetch_format: 'auto' }],
    })
    uploadedPublicId = upload.public_id
    const makePrimary = requestedPrimary || count === 0
    const image = await prisma.$transaction(async (tx) => {
      if (makePrimary) await tx.productImage.updateMany({ where: { productId: id, isPrimary: true }, data: { isPrimary: false } })
      return tx.productImage.create({
        data: {
          productId: id,
          publicId: upload.public_id,
          url: upload.secure_url,
          altText,
          altTextRw: altTextRw || null,
          imageType: imageType.data,
          sortOrder: count,
          isPrimary: makePrimary,
        },
      })
    })

    void logActivity({ userId: admin.id, userName: admin.name, userRole: admin.role, action: 'PRODUCT_IMAGE_UPLOAD', entityType: 'PRODUCT', entityId: id, description: `Uploaded ${image.imageType} image for ${product.name}`, req }).catch(() => {})
    return NextResponse.json({ success: true, image }, { status: 201 })
  } catch (error) {
    if (uploadedPublicId) await cloudinary.uploader.destroy(uploadedPublicId).catch(() => {})
    return handleError(error, 'Image upload failed')
  }
}

function handleError(error: unknown, fallback: string) {
  const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500
  if (status === 500) console.error(`Admin product images error: ${fallback}`, error)
  return NextResponse.json({ success: false, error: status === 500 ? fallback : (error as Error).message }, { status })
}
