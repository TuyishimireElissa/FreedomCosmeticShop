export const dynamic = 'force-dynamic'

import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { features } from '@/lib/env'
import { rateLimit } from '@/lib/permissions'
import { clearCartTracking } from '@/server/services/sms-scheduler'
import { optIn, optOut } from '@/server/services/sms'

const preferenceFields = [
  'smsEnabled',
  'whatsappEnabled',
  'emailEnabled',
  'reorderReminders',
  'priceDropAlerts',
  'backInStockAlerts',
  'birthdayRewards',
  'postDeliveryTips',
  'abandonedCartReminders',
  'wishlistReminders',
] as const

type PreferenceField = (typeof preferenceFields)[number]

const input = z.object({
  language: z.enum(['rw', 'en']).optional(),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  reorderReminders: z.boolean().optional(),
  priceDropAlerts: z.boolean().optional(),
  backInStockAlerts: z.boolean().optional(),
  birthdayRewards: z.boolean().optional(),
  postDeliveryTips: z.boolean().optional(),
  abandonedCartReminders: z.boolean().optional(),
  wishlistReminders: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0)

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }
const finalStatuses = ['SENT', 'CANCELLED']

const consentTimes: Record<PreferenceField, { consentedAt: string; revokedAt: string }> = {
  smsEnabled: { consentedAt: 'smsConsentedAt', revokedAt: 'smsRevokedAt' },
  whatsappEnabled: { consentedAt: 'whatsappConsentedAt', revokedAt: 'whatsappRevokedAt' },
  emailEnabled: { consentedAt: 'emailConsentedAt', revokedAt: 'emailRevokedAt' },
  reorderReminders: { consentedAt: 'reorderConsentedAt', revokedAt: 'reorderRevokedAt' },
  priceDropAlerts: { consentedAt: 'priceDropConsentedAt', revokedAt: 'priceDropRevokedAt' },
  backInStockAlerts: { consentedAt: 'backInStockConsentedAt', revokedAt: 'backInStockRevokedAt' },
  birthdayRewards: { consentedAt: 'birthdayConsentedAt', revokedAt: 'birthdayRevokedAt' },
  postDeliveryTips: { consentedAt: 'postDeliveryConsentedAt', revokedAt: 'postDeliveryRevokedAt' },
  abandonedCartReminders: { consentedAt: 'abandonedCartConsentedAt', revokedAt: 'abandonedCartRevokedAt' },
  wishlistReminders: { consentedAt: 'wishlistConsentedAt', revokedAt: 'wishlistRevokedAt' },
}

function publicPreferences(preference: Record<string, unknown> | null) {
  return {
    language: preference?.language === 'en' ? 'en' : 'rw',
    ...Object.fromEntries(preferenceFields.map((field) => [field, preference?.[field] === true])),
    availability: { sms: features.sms, whatsapp: false, email: false },
  }
}

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
    const preference = await db.communicationPreference.findUnique({ where: { userId: user.id } })
    return NextResponse.json({ preferences: publicPreferences(preference as unknown as Record<string, unknown> | null) }, { headers })
  } catch (error) {
    console.error('Communication preferences read failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'PREFERENCES_UNAVAILABLE' }, { status: 503, headers })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers })
    }
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers })
    const limit = rateLimit(`communication-preferences:${user.id}`, { maxActions: 60, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers })

    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_PREFERENCES' }, { status: 400, headers })
    if (
      (parsed.data.smsEnabled === true && !features.sms)
      || parsed.data.whatsappEnabled === true
      || parsed.data.emailEnabled === true
    ) {
      return NextResponse.json({ error: 'CHANNEL_UNAVAILABLE' }, { status: 409, headers })
    }

    const now = new Date()
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`
      const update: Record<string, boolean | string | Date | null> = {}
      const create: Record<string, boolean | string | Date | null> = { userId: user.id, language: parsed.data.language ?? 'rw' }

      if (parsed.data.language !== undefined) update.language = parsed.data.language
      for (const field of preferenceFields) {
        const next = parsed.data[field]
        if (next === undefined) continue
        update[field] = next
        create[field] = next
        const times = consentTimes[field]
        if (next) {
          update[times.consentedAt] = now
          update[times.revokedAt] = null
          create[times.consentedAt] = now
          create[times.revokedAt] = null
        } else {
          update[times.revokedAt] = now
          create[times.revokedAt] = now
        }
      }

      const preference = await tx.communicationPreference.upsert({
        where: { userId: user.id },
        create: create as Prisma.CommunicationPreferenceUncheckedCreateInput,
        update: update as Prisma.CommunicationPreferenceUncheckedUpdateInput,
      })

      const smsDisabled = parsed.data.smsEnabled === false
      const reorderDisabled = parsed.data.reorderReminders === false
      const priceDisabled = parsed.data.priceDropAlerts === false
      const stockDisabled = parsed.data.backInStockAlerts === false
      const abandonedDisabled = parsed.data.abandonedCartReminders === false
      if (smsDisabled || reorderDisabled) {
        await tx.reorderReminder.updateMany({
          where: {
            userId: user.id,
            status: { notIn: finalStatuses },
            ...(smsDisabled ? { channel: 'SMS' } : {}),
          },
          data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: smsDisabled ? 'SMS_OPT_OUT' : 'PURPOSE_OPT_OUT' },
        })
      }
      if (smsDisabled || abandonedDisabled) {
        await tx.abandonedCartReminder.updateMany({
          where: {
            userId: user.id,
            status: { notIn: finalStatuses },
            ...(smsDisabled ? { channel: 'SMS' } : {}),
          },
          data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: smsDisabled ? 'SMS_OPT_OUT' : 'PURPOSE_OPT_OUT' },
        })
      }
      if (smsDisabled || priceDisabled || stockDisabled) {
        const alertTypes = [
          ...(priceDisabled ? ['PRICE_DROP'] : []),
          ...(stockDisabled ? ['BACK_IN_STOCK'] : []),
        ]
        await tx.stockAlert.updateMany({
          where: {
            userId: user.id,
            status: { notIn: finalStatuses },
            ...(smsDisabled ? { channel: 'SMS' } : {}),
            ...(!smsDisabled && alertTypes.length ? { alertType: { in: alertTypes } } : {}),
          },
          data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: smsDisabled ? 'SMS_OPT_OUT' : 'PURPOSE_OPT_OUT' },
        })
      }
      return { preference, clearAbandonedCart: smsDisabled || abandonedDisabled, smsDisabled, smsEnabled: parsed.data.smsEnabled === true }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.clearAbandonedCart) clearCartTracking(user.id)
    if (result.smsDisabled) optOut(user.phone)
    if (result.smsEnabled) optIn(user.phone)
    return NextResponse.json({ preferences: publicPreferences(result.preference as unknown as Record<string, unknown>) }, { headers })
  } catch (error) {
    console.error('Communication preferences update failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'PREFERENCES_UNAVAILABLE' }, { status: 503, headers })
  }
}
