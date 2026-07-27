export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, rateLimit, requirePermission } from '@/lib/permissions'
import { dispatchReorderReminder, dispatchStockAlert } from '@/server/services/retention-messaging'

const input = z.object({ type: z.enum(['STOCK_ALERT', 'REORDER_REMINDER']), id: z.string().min(1).max(100) }).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
    const admin = await requirePermission(PERMISSIONS.SMS_SEND)
    const limit = rateLimit(`retention-dispatch:${admin.id}`, { maxActions: 60, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })
    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_DISPATCH' }, { status: 400, headers })
    const result = parsed.data.type === 'STOCK_ALERT'
      ? await dispatchStockAlert(parsed.data.id)
      : await dispatchReorderReminder(parsed.data.id)
    return NextResponse.json({ result }, { headers })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode, headers })
    console.error('Retention dispatch failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'DISPATCH_UNAVAILABLE' }, { status: 503, headers })
  }
}
