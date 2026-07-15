export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { calculateBundleFacts } from '@/lib/bundle-pricing'
import { BundleInputSchema } from '@/lib/bundle-admin'

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }

export async function GET() {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')
    const bundles = await prisma.bundle.findMany({ where: { deletedAt: null }, include: { products: { include: { product: { select: { id: true, name: true, slug: true, price: true, stock: true } } }, orderBy: { stepOrder: 'asc' } } }, orderBy: { createdAt: 'desc' } })
    const data = bundles.map((bundle) => ({ ...bundle, ...calculateBundleFacts(bundle.bundlePrice, bundle.products) }))
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    console.error('Admin bundles GET error:', error); return NextResponse.json({ success: false, error: 'Failed to load bundles' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')
    const parsed = BundleInputSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid bundle data', details: parsed.error.flatten() }, { status: 400 })
    const input = parsed.data
    const ids = input.products.map((item) => item.productId)
    const products = await prisma.product.findMany({ where: { id: { in: ids }, isDeleted: false }, select: { id: true, price: true, stock: true } })
    if (products.length !== ids.length) return NextResponse.json({ success: false, error: 'One or more products are unavailable' }, { status: 400 })
    const facts = calculateBundleFacts(input.bundlePrice, input.products.map((item) => ({ quantity: item.quantity, product: products.find((product) => product.id === item.productId)! })))
    let slug = input.slug || slugify(input.name)
    if (await prisma.bundle.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${Date.now().toString(36)}`
    const bundle = await prisma.bundle.create({ data: { name: input.name, nameRw: input.nameRw || null, slug, description: input.description || null, descriptionRw: input.descriptionRw || null, bundleType: input.bundleType, bundlePrice: input.bundlePrice, normalTotal: facts.normalTotal, coverImage: input.coverImage || null, coverImageUrl: input.coverImageUrl || null, isActive: input.isActive, isFeatured: input.isFeatured, isInStock: facts.isInStock, targetConcern: input.targetConcern || null, targetSkinType: input.targetSkinType || null, targetHairType: input.targetHairType || null, targetCategory: input.targetCategory || null, usageInstructions: input.usageInstructions || null, usageInstructionsRw: input.usageInstructionsRw || null, products: { create: input.products.map((item) => ({ productId: item.productId!, stepOrder: item.stepOrder || 0, stepLabel: item.stepLabel || null, stepLabelRw: item.stepLabelRw || null, quantity: item.quantity || 1, isOptional: item.isOptional || false })) } }, include: { products: true } })
    return NextResponse.json({ success: true, data: bundle }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    console.error('Admin bundle POST error:', error); return NextResponse.json({ success: false, error: 'Failed to create bundle' }, { status: 500 })
  }
}
