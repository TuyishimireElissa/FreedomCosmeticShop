export const dynamic = 'force-dynamic'

import { createHmac } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { EVENTS, type EventName } from '@/lib/analytics-events'
import { getAccessTokenFromRequest, verifyAccessToken } from '@/lib/auth'
import { resolveAuthSecret } from '@/lib/auth-secret'
import { dailyNetworkHash, normalizeNotFoundPath } from '@/lib/not-found-analytics'
import { rateLimit } from '@/lib/permissions'
import { getAllDistricts } from '@/lib/rwanda-locations'

const eventValues = Object.values(EVENTS) as [EventName, ...EventName[]]
const paymentMethods = ['MTN_MOMO', 'AIRTEL_MONEY', 'CARD', 'COD', 'BANK_TRANSFER'] as const
const metadataSchema = z.object({
  quantity: z.number().int().min(0).max(1000).optional(),
  resultCount: z.number().int().min(0).max(1_000_000).optional(),
  context: z.enum(['product', 'cart', 'checkout', 'support', 'floating_button', 'review', 'wholesale']).optional(),
  step: z.enum(['address', 'payment', 'review', 'confirmation']).optional(),
  reasonCode: z.string().regex(/^[A-Z0-9_]{1,50}$/).optional(),
  couponType: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']).optional(),
  source: z.enum(['navigation', 'button', 'automatic']).optional(),
}).strict()
const schema = z.object({
  consent: z.literal(true),
  event: z.enum(eventValues),
  path: z.string().min(1).max(300).optional(),
  productId: z.string().min(1).max(100).optional(),
  productSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160).optional(),
  productCategory: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100).optional(),
  device: z.enum(['mobile', 'desktop', 'tablet']),
  district: z.string().max(80).optional(),
  language: z.enum(['rw', 'en']),
  paymentMethod: z.enum(paymentMethods).optional(),
  sessionHash: z.string().refine((value) => /^[a-f0-9]{32,64}$/i.test(value) || /^[0-9a-f-]{36}$/i.test(value)).optional(),
  value: z.number().finite().min(0).max(1_000_000_000).optional(),
  metadata: metadataSchema.optional(),
}).strict()
const responseHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }
const kigaliDistricts = new Set(['Gasabo', 'Kicukiro', 'Nyarugenge'])
const eventCategories: Partial<Record<EventName, string>> = {
  [EVENTS.ADD_TO_CART]: 'ecommerce',
  [EVENTS.REMOVE_FROM_CART]: 'ecommerce',
  [EVENTS.VIEW_CART]: 'ecommerce',
  [EVENTS.BEGIN_CHECKOUT]: 'ecommerce',
  [EVENTS.ADDRESS_COMPLETED]: 'ecommerce',
  [EVENTS.PAYMENT_SELECTED]: 'ecommerce',
  [EVENTS.PAYMENT_STARTED]: 'ecommerce',
  [EVENTS.PAYMENT_FAILED]: 'ecommerce',
  [EVENTS.PURCHASE_COMPLETED]: 'ecommerce',
  [EVENTS.PRODUCT_VIEW]: 'engagement',
  [EVENTS.CATEGORY_VIEW]: 'engagement',
  [EVENTS.SEARCH]: 'engagement',
  [EVENTS.ZERO_RESULT_SEARCH]: 'engagement',
}

export async function POST(request: NextRequest) {
  try {
    const requestOrigin = new URL(request.url).origin
    const origin = request.headers.get('origin')
    if (origin && origin !== requestOrigin) {
      return NextResponse.json({ success: false, error: 'INVALID_ORIGIN' }, { status: 403, headers: responseHeaders })
    }

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'INVALID_EVENT' }, { status: 400, headers: responseHeaders })
    }
    const data = parsed.data
    const path = data.path ? normalizeNotFoundPath(data.path) : null
    if (data.path && !path) {
      return NextResponse.json({ success: false, error: 'INVALID_PATH' }, { status: 400, headers: responseHeaders })
    }
    if (data.district && !getAllDistricts().includes(data.district)) {
      return NextResponse.json({ success: false, error: 'INVALID_DISTRICT' }, { status: 400, headers: responseHeaders })
    }

    const secret = resolveAuthSecret(process.env.NEXTAUTH_SECRET, process.env.JWT_SECRET, process.env.NODE_ENV)
    const networkHash = dailyNetworkHash(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'), secret)
    const limit = rateLimit(`analytics:${networkHash || 'unknown'}`, { maxActions: 120, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: 'RATE_LIMITED' }, { status: 429, headers: responseHeaders })
    }

    const token = getAccessTokenFromRequest(request)
    const auth = token ? await verifyAccessToken(token) : null
    const userHash = auth?.userId
      ? createHmac('sha256', secret).update(`analytics-user-v1:${auth.userId}`).digest('hex').slice(0, 24)
      : null

    await prisma.analyticsEvent.create({
      data: {
        event: data.event,
        category: eventCategories[data.event] || null,
        path,
        productId: data.productId || null,
        productSlug: data.productSlug || null,
        productCategory: data.productCategory || null,
        searchQueryHash: null,
        device: data.device,
        district: data.district || null,
        language: data.language,
        paymentMethod: data.paymentMethod || null,
        isNewUser: false,
        isKigali: data.district ? kigaliDistricts.has(data.district) : false,
        sessionHash: data.sessionHash || null,
        userHash,
        value: data.value ?? null,
        currency: 'RWF',
        metadata: data.metadata || undefined,
      },
    })

    return NextResponse.json({ success: true }, { status: 202, headers: responseHeaders })
  } catch (error) {
    console.error('Analytics write failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'ANALYTICS_UNAVAILABLE' }, { status: 503, headers: responseHeaders })
  }
}
