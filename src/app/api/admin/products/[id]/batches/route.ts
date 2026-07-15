export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, PERMISSIONS, rateLimit } from '@/lib/permissions'
import { broadcastProductEvent } from '@/lib/realtime'
import { logActivity } from '@/server/services/activity'

const BatchSchema = z.object({
  batchNumber: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(1_000_000),
  manufacturedDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  receivedDate: z.string().datetime().optional(),
  supplierInvoice: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
}).superRefine((data, context) => {
  if (data.manufacturedDate && data.expiryDate && new Date(data.expiryDate) <= new Date(data.manufacturedDate)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['expiryDate'], message: 'Expiry date must be after manufacturing date' })
  }
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_READ)
    const { id } = await params
    const batches = await prisma.productBatch.findMany({
      where: { productId: id },
      orderBy: [{ isActive: 'desc' }, { receivedDate: 'desc' }],
    })
    return NextResponse.json({ success: true, batches })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error('Admin batches GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch batches' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)
    const limit = rateLimit(`admin:${admin.id}:batch-create`, { maxActions: 30, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: 'Too many inventory updates. Try again later.' }, { status: 429 })
    }
    const { id } = await params
    const parsed = BatchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid batch data', details: parsed.error.flatten() }, { status: 400 })
    }
    const existing = await prisma.product.findFirst({ where: { id, isDeleted: false }, select: { id: true, name: true, slug: true, stock: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })

    const data = parsed.data
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.productBatch.create({
        data: {
          productId: id,
          batchNumber: data.batchNumber,
          quantity: data.quantity,
          manufacturedDate: data.manufacturedDate ? new Date(data.manufacturedDate) : null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
          supplierInvoice: data.supplierInvoice || null,
          notes: data.notes || null,
        },
      })
      const product = await tx.product.update({
        where: { id },
        data: {
          stock: { increment: data.quantity },
          batchNumber: data.batchNumber,
          manufacturedDate: data.manufacturedDate ? new Date(data.manufacturedDate) : undefined,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        },
        select: { id: true, name: true, slug: true, stock: true },
      })
      return { batch, product }
    })

    await broadcastProductEvent('updated', {
      id: result.product.id,
      name: result.product.name,
      slug: result.product.slug,
      stock: result.product.stock,
    }, { source: admin.name })
    void logActivity({
      userId: admin.id,
      userName: admin.name,
      userRole: admin.role,
      action: 'INVENTORY_BATCH_RECEIVED',
      entityType: 'PRODUCT',
      entityId: id,
      description: `Received ${data.quantity} units of ${existing.name}, batch ${data.batchNumber}`,
      req,
    }).catch(() => {})
    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error('Admin batch POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to receive batch' }, { status: 500 })
  }
}
