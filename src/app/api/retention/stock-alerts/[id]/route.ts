export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
  const { id } = await params
  const result = await db.stockAlert.updateMany({
    where: { id, userId: user.id, status: { notIn: ['SENT', 'CANCELLED'] } },
    data: { status: 'CANCELLED', cancelledAt: new Date(), consentGranted: false, lastErrorCode: 'USER_CANCELLED' },
  })
  if (result.count === 0) return NextResponse.json({ error: 'NOT_FOUND_OR_FINAL' }, { status: 404, headers })
  return NextResponse.json({ success: true }, { headers })
}
