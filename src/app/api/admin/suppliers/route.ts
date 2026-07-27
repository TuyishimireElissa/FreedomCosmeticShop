export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission, PERMISSIONS } from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'

const SupplierSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
})

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_READ)
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        country: true,
        isActive: true,
        _count: { select: { products: true } },
      },
    })
    return NextResponse.json({ success: true, suppliers })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error('Admin suppliers GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requirePermission(PERMISSIONS.PRODUCTS_CRUD)
    const parsed = SupplierSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid supplier data', details: parsed.error.flatten() }, { status: 400 })
    }
    const supplier = await prisma.supplier.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        country: parsed.data.country || null,
      },
    })
    void logActivity({
      userId: admin.id,
      userName: admin.name,
      userRole: admin.role,
      action: 'SUPPLIER_CREATE',
      entityType: 'SUPPLIER',
      entityId: supplier.id,
      description: `Created supplier: ${supplier.name}`,
      req,
    }).catch(() => {})
    return NextResponse.json({ success: true, supplier }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error('Admin supplier POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create supplier' }, { status: 500 })
  }
}
