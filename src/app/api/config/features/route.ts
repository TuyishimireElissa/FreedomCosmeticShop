import { NextResponse } from 'next/server'
import { features, smsConfiguration } from '@/lib/env'

export async function GET() {
  const mobileMoney = features.realPayments && Boolean(process.env.PAYPACK_CLIENT_ID && process.env.PAYPACK_CLIENT_SECRET)
  const card = features.realPayments && Boolean(process.env.FLW_PUBLIC_KEY && process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_HASH)
  return NextResponse.json({
    payments: { enabled: mobileMoney || card, mobileMoney, card },
    communications: { sms: features.sms, email: features.email, smsProvider: smsConfiguration.provider },
  }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' } })
}
