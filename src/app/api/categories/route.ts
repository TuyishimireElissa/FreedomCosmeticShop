import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true, isDeleted: false }, include: { _count: { select: { products: { where: { isActive: true, isDeleted: false } } } } }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
    const response = NextResponse.json({ success: true, data: { categories }, categories })
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800')
    return response
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}
