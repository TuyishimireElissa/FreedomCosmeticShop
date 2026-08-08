import { NextResponse } from 'next/server'
import { features, smsConfiguration } from '@/lib/env'

export async function GET() {
  const mobileMoney = features.realPayments && Boolean(process.env.PAYPACK_CLIENT_ID && process.env.PAYPACK_CLIENT_SECRET)
  const card = features.realPayments && Boolean(process.env.FLW_PUBLIC_KEY && process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_HASH)
  // FEATURE-FLAGGED: online payment is disabled by business decision —
  // FreedomCosmeticShop takes orders through WhatsApp and collects payment on
  // delivery (MoMo / Airtel / cash). The Paypack and Flutterwave integrations
  // are preserved and fully functional; to re-enable, set ENABLE_REAL_PAYMENTS
  // plus the provider credentials and remove the `false &&` guards below.
  const paymentsEnabled = false
  return NextResponse.json({
    payments: {
      enabled: paymentsEnabled && (mobileMoney || card),
      mobileMoney: paymentsEnabled && mobileMoney,
      card: paymentsEnabled && card,
      cashOnDelivery: paymentsEnabled,
      whatsappOrder: true,
    },
    communications: { sms: features.sms, email: features.email, smsProvider: smsConfiguration.provider },
  }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' } })
}
