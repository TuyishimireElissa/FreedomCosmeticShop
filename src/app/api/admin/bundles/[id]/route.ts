export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { rateLimit } from '@/lib/permissions'
import { calculateBundleFacts } from '@/lib/bundle-pricing'
import { BundleInputSchema } from '@/lib/bundle-admin'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole('ADMIN', 'SUPER_ADMIN')
    const limit = rateLimit(`bundle-update:${admin.id}`, { maxActions: 30, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ success: false, error: 'Too many updates' }, { status: 429 })
    const { id } = await params
    const parsed = BundleInputSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid bundle data', details: parsed.error.flatten() }, { status: 400 })
    const input = parsed.data
    const existing = await prisma.bundle.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ success: false, error: 'Bundle not found' }, { status: 404 })
    const ids = input.products.map((item) => item.productId)
    const products = await prisma.product.findMany({ where: { id: { in: ids }, isDeleted: false }, select: { id: true, price: true, stock: true } })
    if (products.length !== ids.length) return NextResponse.json({ success: false, error: 'One or more products are unavailable' }, { status: 400 })
    const facts = calculateBundleFacts(input.bundlePrice, input.products.map((item) => ({ quantity: item.quantity, product: products.find((product) => product.id === item.productId)! })))
    const requestedSlug = input.slug || existing.slug
    const duplicate = await prisma.bundle.findFirst({ where: { slug: requestedSlug, id: { not: id } }, select: { id: true } })
    if (duplicate) return NextResponse.json({ success: false, error: 'Bundle slug already exists' }, { status: 409 })
    const bundle = await prisma.$transaction(async (tx) => {
      await tx.bundleProduct.deleteMany({ where: { bundleId: id } })
      return tx.bundle.update({ where: { id }, data: { name: input.name, nameRw: input.nameRw || null, slug: requestedSlug, description: input.description || null, descriptionRw: input.descriptionRw || null, bundleType: input.bundleType, bundlePrice: input.bundlePrice, normalTotal: facts.normalTotal, coverImage: input.coverImage || null, coverImageUrl: input.coverImageUrl || null, isActive: input.isActive, isFeatured: input.isFeatured, isInStock: facts.isInStock, targetConcern: input.targetConcern || null, targetSkinType: input.targetSkinType || null, targetHairType: input.targetHairType || null, targetCategory: input.targetCategory || null, usageInstructions: input.usageInstructions || null, usageInstructionsRw: input.usageInstructionsRw || null, products: { create: input.products.map((item) => ({ productId: item.productId!, stepOrder: item.stepOrder || 0, stepLabel: item.stepLabel || null, stepLabelRw: item.stepLabelRw || null, quantity: item.quantity || 1, isOptional: item.isOptional || false })) } }, include: { products: true } })
    })
    return NextResponse.json({ success: true, data: bundle })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    console.error('Admin bundle PUT error:', error); return NextResponse.json({ success: false, error: 'Failed to update bundle' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')
    const { id } = await params
    const updated = await prisma.bundle.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isActive: false } })
    if (updated.count !== 1) return NextResponse.json({ success: false, error: 'Bundle not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    console.error('Admin bundle DELETE error:', error); return NextResponse.json({ success: false, error: 'Failed to delete bundle' }, { status: 500 })
  }
}
