import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function parse(value: string | null) { if (!value) return null; try { const data = JSON.parse(value); return Array.isArray(data) ? data : [] } catch { return [] } }
function serialize(product: { images: string; skinType: string | null; shades: string | null; ingredients: string | null } & Record<string, unknown>) { return { ...product, images: parse(product.images) || [], skinType: parse(product.skinType), shades: parse(product.shades), ingredients: parse(product.ingredients) } }

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const slug = decodeURIComponent(params.slug || '').trim()
    if (!slug) return NextResponse.json({ success: false, error: 'Product slug is required' }, { status: 400 })
    const product = await prisma.product.findFirst({ where: { OR: [{ slug }, { id: slug }], isActive: true, isDeleted: false }, include: { category: true, brand: true } })
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    const relatedRows = await prisma.product.findMany({ where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true, isDeleted: false }, include: { category: true, brand: true }, orderBy: [{ featured: 'desc' }, { rating: 'desc' }], take: 4 })
    const serialized = serialize(product as never)
    const related = relatedRows.map((item) => serialize(item as never))
    return NextResponse.json({ success: true, data: { product: serialized, related }, product: serialized, related })
  } catch (error) {
    console.error('Product detail API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 })
  }
}
