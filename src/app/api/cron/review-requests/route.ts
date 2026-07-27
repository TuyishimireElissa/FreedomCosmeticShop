export const dynamic = 'force-dynamic'

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sendPendingReviewSMS } from '@/lib/review-requests'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ success: false, error: 'CRON_NOT_CONFIGURED' }, { status: 503 })
  const authorization = request.headers.get('authorization')
  const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : request.headers.get('x-cron-secret') || ''
  const expectedBuffer = Buffer.from(secret)
  const suppliedBuffer = Buffer.from(supplied)
  if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  try {
    const result = await sendPendingReviewSMS()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Review request cron failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'REVIEW_REQUEST_CRON_FAILED' }, { status: 500 })
  }
}
