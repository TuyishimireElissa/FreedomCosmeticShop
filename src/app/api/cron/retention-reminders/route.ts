export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { processRetentionReminderBatch } from '@/server/services/retention-cron'

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ success: false, error: 'CRON_NOT_CONFIGURED' }, { status: 503, headers })
  const authorization = request.headers.get('authorization')
  const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : request.headers.get('x-cron-secret') || ''
  const expectedBuffer = Buffer.from(secret)
  const suppliedBuffer = Buffer.from(supplied)
  if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401, headers })
  }

  try {
    const result = await processRetentionReminderBatch()
    return NextResponse.json({ success: true, ...result }, { headers })
  } catch (error) {
    console.error('Retention reminder cron failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'RETENTION_CRON_FAILED' }, { status: 500, headers })
  }
}
