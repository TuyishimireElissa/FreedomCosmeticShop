export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import cloudinary from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'
import { DESTRUCTIVE_OPERATIONS, requireDestructiveOperation, requirePermission, PERMISSIONS, rateLimit } from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'

const UpdateImageSchema = z.object({
  altText: z.string().trim().min(2).max(300).optional(),
  altTextRw: z.string().trim().max(300).optional().nullable(),
  imageType: z.enum(['PRODUCT', 'PACKAGING', 'BACK_LABEL', 'SEAL', 'TEXTURE', 'SIZE_SCALE', 'SHADE', 'LIFESTYLE', 'VIDEO_THUMB']).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  isPrimary: z.boolean().optional(),
})

interface RouteParams { params: Promise<{ id: string; imageId: string }> }

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const admin = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)
    const { id, imageId } = await params
    const parsed = UpdateImageSchema.safeParse(await req.json())
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid image update' }, { status: 400 })
    }
    const existing = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Product image not found' }, { status: 404 })

    const image = await prisma.$transaction(async (tx) => {
      if (parsed.data.isPrimary === true) await tx.productImage.updateMany({ where: { productId: id, id: { not: imageId }, isPrimary: true }, data: { isPrimary: false } })
      return tx.productImage.update({
        where: { id: imageId },
        data: {
          altText: parsed.data.altText,
          altTextRw: parsed.data.altTextRw === '' ? null : parsed.data.altTextRw,
          imageType: parsed.data.imageType,
          sortOrder: parsed.data.sortOrder,
          // A primary image can be replaced, but never unset without selecting a replacement.
          isPrimary: parsed.data.isPrimary === true ? true : undefined,
        },
      })
    })
    void logActivity({ userId: admin.id, userName: admin.name, userRole: admin.role, action: 'PRODUCT_IMAGE_UPDATE', entityType: 'PRODUCT', entityId: id, description: `Updated product image ${imageId}`, req }).catch(() => {})
    return NextResponse.json({ success: true, image })
  } catch (error) {
    return handleError(error, 'Image update failed')
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const admin = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PRODUCT_DELETE)
    const limit = rateLimit(`admin:${admin.id}:product-image-delete`, { maxActions: 20, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ success: false, error: 'Too many image deletions. Try again later.' }, { status: 429 })
    const { id, imageId } = await params
    const existing = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Product image not found' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } })
      if (existing.isPrimary) {
        const replacement = await tx.productImage.findFirst({ where: { productId: id }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true } })
        if (replacement) await tx.productImage.update({ where: { id: replacement.id }, data: { isPrimary: true } })
      }
    })
    if (existing.publicId.startsWith('freedomcosmeticshop/products/')) await cloudinary.uploader.destroy(existing.publicId).catch((error) => console.error('Cloudinary image cleanup failed:', error))
    void logActivity({ userId: admin.id, userName: admin.name, userRole: admin.role, action: 'PRODUCT_IMAGE_DELETE', entityType: 'PRODUCT', entityId: id, description: `Deleted product image ${imageId}`, req }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error, 'Image deletion failed')
  }
}

function handleError(error: unknown, fallback: string) {
  const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500
  if (status === 500) console.error(`Admin product image error: ${fallback}`, error)
  return NextResponse.json({ success: false, error: status === 500 ? fallback : (error as Error).message }, { status })
}
