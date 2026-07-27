import { Prisma, type CommunicationPreference } from '@prisma/client'
import { db } from '@/lib/db'
import { features } from '@/lib/env'
import { resolveTranslation } from '@/lib/i18n'
import { SEO_CONFIG } from '@/lib/seo-config'
import { sendSmsViaProvider } from '@/server/services/sms'
import { getSmsMessage } from '@/server/services/sms-templates'

export type RetentionChannel = 'SMS' | 'WHATSAPP'
export type RetentionPurpose = 'REORDER' | 'PRICE_DROP' | 'BACK_IN_STOCK' | 'ABANDONED_CART'
export const ABANDONED_CART_DELAY_MS = 2 * 60 * 60 * 1000
export type DispatchResult =
  | { outcome: 'SENT'; recordId: string }
  | { outcome: 'NOT_DUE' | 'CANCELLED' | 'CHANNEL_UNAVAILABLE' | 'DELIVERY_DISABLED' | 'FAILED'; recordId: string }

type ConsentFields = Pick<CommunicationPreference,
  | 'smsEnabled' | 'smsConsentedAt' | 'smsRevokedAt'
  | 'whatsappEnabled' | 'whatsappConsentedAt' | 'whatsappRevokedAt'
  | 'reorderReminders' | 'reorderConsentedAt' | 'reorderRevokedAt'
  | 'priceDropAlerts' | 'priceDropConsentedAt' | 'priceDropRevokedAt'
  | 'backInStockAlerts' | 'backInStockConsentedAt' | 'backInStockRevokedAt'
  | 'abandonedCartReminders' | 'abandonedCartConsentedAt' | 'abandonedCartRevokedAt'
>

function current(enabled: boolean, consentedAt: Date | null, revokedAt: Date | null): boolean {
  return enabled && Boolean(consentedAt && (!revokedAt || consentedAt > revokedAt))
}

export function hasCurrentRetentionConsent(
  preference: ConsentFields | null,
  channel: RetentionChannel,
  purpose: RetentionPurpose,
): boolean {
  if (!preference) return false
  const channelAllowed = channel === 'SMS'
    ? current(preference.smsEnabled, preference.smsConsentedAt, preference.smsRevokedAt)
    : current(preference.whatsappEnabled, preference.whatsappConsentedAt, preference.whatsappRevokedAt)
  const purposeAllowed = purpose === 'REORDER'
    ? current(preference.reorderReminders, preference.reorderConsentedAt, preference.reorderRevokedAt)
    : purpose === 'PRICE_DROP'
      ? current(preference.priceDropAlerts, preference.priceDropConsentedAt, preference.priceDropRevokedAt)
      : purpose === 'BACK_IN_STOCK'
        ? current(preference.backInStockAlerts, preference.backInStockConsentedAt, preference.backInStockRevokedAt)
        : current(preference.abandonedCartReminders, preference.abandonedCartConsentedAt, preference.abandonedCartRevokedAt)
  return channelAllowed && purposeAllowed
}

function language(value: string): 'en' | 'rw' {
  return value === 'en' ? 'en' : 'rw'
}

async function deliverSms(phone: string, message: string): Promise<'SENT' | 'FAILED'> {
  // A disabled provider is not reported as delivery, and the simulation path is
  // intentionally skipped because that legacy path logs recipient contact data.
  if (!features.sms) return 'FAILED'
  const result = await sendSmsViaProvider(phone, message)
  return result.success && result.provider !== 'SIMULATED' ? 'SENT' : 'FAILED'
}

export async function dispatchStockAlert(alertId: string, now = new Date()): Promise<DispatchResult> {
  const claim = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "StockAlert" WHERE id = ${alertId} FOR UPDATE`
    const alert = await tx.stockAlert.findUnique({
      where: { id: alertId },
      include: {
        user: { select: { phone: true, isDeleted: true } },
        product: { select: { name: true, slug: true, price: true, stock: true, isActive: true, isDeleted: true } },
      },
    })
    if (!alert || alert.status !== 'PENDING') return { outcome: 'NOT_DUE' as const }

    const purpose: RetentionPurpose = alert.alertType === 'PRICE_DROP' ? 'PRICE_DROP' : 'BACK_IN_STOCK'
    const preference = await tx.communicationPreference.findUnique({ where: { userId: alert.userId } })
    if (alert.user.isDeleted || !hasCurrentRetentionConsent(preference, alert.channel as RetentionChannel, purpose)) {
      await tx.stockAlert.update({ where: { id: alert.id }, data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: 'CONSENT_REVOKED' } })
      return { outcome: 'CANCELLED' as const }
    }
    if (alert.channel !== 'SMS') {
      await tx.stockAlert.update({ where: { id: alert.id }, data: { status: 'BLOCKED', consentGranted: true, consentCheckedAt: now, lastErrorCode: 'CHANNEL_UNAVAILABLE' } })
      return { outcome: 'CHANNEL_UNAVAILABLE' as const }
    }

    const productAvailable = alert.product.isActive && !alert.product.isDeleted
    const triggered = purpose === 'BACK_IN_STOCK'
      ? productAvailable && alert.product.stock > 0
      : productAvailable && alert.targetPrice !== null && alert.product.price <= alert.targetPrice
    if (!triggered) return { outcome: 'NOT_DUE' as const }
    if (!features.sms) {
      await tx.stockAlert.update({ where: { id: alert.id }, data: { consentGranted: true, consentCheckedAt: now, lastErrorCode: 'SMS_DISABLED' } })
      return { outcome: 'DELIVERY_DISABLED' as const }
    }

    await tx.stockAlert.update({ where: { id: alert.id }, data: { status: 'SENDING', consentGranted: true, consentCheckedAt: now, lastErrorCode: null } })
    return {
      outcome: 'CLAIMED' as const,
      phone: alert.user.phone,
      message: resolveTranslation(language(preference!.language), purpose === 'PRICE_DROP' ? 'retention_messages.price_drop' : 'retention_messages.back_in_stock', {
        product: alert.product.name,
        price: alert.product.price,
        url: `${SEO_CONFIG.siteUrl}/products/${alert.product.slug}`,
      }),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  if (claim.outcome !== 'CLAIMED') return { outcome: claim.outcome, recordId: alertId }
  const delivery = await deliverSms(claim.phone, claim.message).catch(() => 'FAILED' as const)
  await db.stockAlert.updateMany({
    where: { id: alertId, status: 'SENDING' },
    data: delivery === 'SENT'
      ? { status: 'SENT', sentAt: now, lastErrorCode: null }
      : { status: 'FAILED', lastErrorCode: 'DELIVERY_FAILED' },
  })
  return { outcome: delivery, recordId: alertId }
}

export async function dispatchReorderReminder(reminderId: string, now = new Date()): Promise<DispatchResult> {
  const claim = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ReorderReminder" WHERE id = ${reminderId} FOR UPDATE`
    const reminder = await tx.reorderReminder.findUnique({
      where: { id: reminderId },
      include: {
        user: { select: { phone: true, isDeleted: true } },
        product: { select: { name: true, slug: true, isActive: true, isDeleted: true } },
      },
    })
    if (!reminder || reminder.status !== 'PENDING' || !reminder.dueAt || reminder.dueAt > now) {
      return { outcome: 'NOT_DUE' as const }
    }
    const preference = await tx.communicationPreference.findUnique({ where: { userId: reminder.userId } })
    if (reminder.user.isDeleted || !hasCurrentRetentionConsent(preference, reminder.channel as RetentionChannel, 'REORDER')) {
      await tx.reorderReminder.update({ where: { id: reminder.id }, data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: 'CONSENT_REVOKED' } })
      return { outcome: 'CANCELLED' as const }
    }
    if (reminder.channel !== 'SMS') {
      await tx.reorderReminder.update({ where: { id: reminder.id }, data: { status: 'BLOCKED', consentGranted: true, consentCheckedAt: now, lastErrorCode: 'CHANNEL_UNAVAILABLE' } })
      return { outcome: 'CHANNEL_UNAVAILABLE' as const }
    }
    if (!reminder.product.isActive || reminder.product.isDeleted) {
      await tx.reorderReminder.update({ where: { id: reminder.id }, data: { status: 'CANCELLED', cancelledAt: now, lastErrorCode: 'PRODUCT_UNAVAILABLE' } })
      return { outcome: 'CANCELLED' as const }
    }
    if (!features.sms) {
      await tx.reorderReminder.update({ where: { id: reminder.id }, data: { consentGranted: true, consentCheckedAt: now, lastErrorCode: 'SMS_DISABLED' } })
      return { outcome: 'DELIVERY_DISABLED' as const }
    }

    await tx.reorderReminder.update({ where: { id: reminder.id }, data: { status: 'SENDING', consentGranted: true, consentCheckedAt: now, lastErrorCode: null } })
    return {
      outcome: 'CLAIMED' as const,
      phone: reminder.user.phone,
      message: resolveTranslation(language(preference!.language), 'retention_messages.reorder', {
        product: reminder.product.name,
        url: `${SEO_CONFIG.siteUrl}/products/${reminder.product.slug}`,
      }),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  if (claim.outcome !== 'CLAIMED') return { outcome: claim.outcome, recordId: reminderId }
  const delivery = await deliverSms(claim.phone, claim.message).catch(() => 'FAILED' as const)
  await db.reorderReminder.updateMany({
    where: { id: reminderId, status: 'SENDING' },
    data: delivery === 'SENT'
      ? { status: 'SENT', sentAt: now, lastErrorCode: null }
      : { status: 'FAILED', lastErrorCode: 'DELIVERY_FAILED' },
  })
  return { outcome: delivery, recordId: reminderId }
}

export async function dispatchAbandonedCartReminder(reminderId: string, now = new Date()): Promise<DispatchResult> {
  const claim = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "AbandonedCartReminder" WHERE id = ${reminderId} FOR UPDATE`
    const reminder = await tx.abandonedCartReminder.findUnique({
      where: { id: reminderId },
      include: {
        user: { select: { phone: true, isDeleted: true } },
        cart: { select: { totalItems: true, updatedAt: true } },
      },
    })
    if (!reminder || reminder.status !== 'PENDING') return { outcome: 'NOT_DUE' as const }
    const currentDueAt = new Date(reminder.cart.updatedAt.getTime() + ABANDONED_CART_DELAY_MS)
    if (currentDueAt > now) {
      if (reminder.dueAt.getTime() !== currentDueAt.getTime()) {
        await tx.abandonedCartReminder.update({ where: { id: reminder.id }, data: { dueAt: currentDueAt } })
      }
      return { outcome: 'NOT_DUE' as const }
    }
    if (reminder.cart.totalItems <= 0) {
      await tx.abandonedCartReminder.update({ where: { id: reminder.id }, data: { status: 'CANCELLED', cancelledAt: now, lastErrorCode: 'CART_EMPTY' } })
      return { outcome: 'CANCELLED' as const }
    }

    const preference = await tx.communicationPreference.findUnique({ where: { userId: reminder.userId } })
    if (reminder.user.isDeleted || !hasCurrentRetentionConsent(preference, reminder.channel as RetentionChannel, 'ABANDONED_CART')) {
      await tx.abandonedCartReminder.update({ where: { id: reminder.id }, data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: 'CONSENT_REVOKED' } })
      return { outcome: 'CANCELLED' as const }
    }
    if (reminder.channel !== 'SMS') {
      await tx.abandonedCartReminder.update({ where: { id: reminder.id }, data: { status: 'BLOCKED', consentGranted: true, consentCheckedAt: now, lastErrorCode: 'CHANNEL_UNAVAILABLE' } })
      return { outcome: 'CHANNEL_UNAVAILABLE' as const }
    }
    if (!features.sms) {
      await tx.abandonedCartReminder.update({ where: { id: reminder.id }, data: { consentGranted: true, consentCheckedAt: now, lastErrorCode: 'SMS_DISABLED' } })
      return { outcome: 'DELIVERY_DISABLED' as const }
    }

    await tx.abandonedCartReminder.update({ where: { id: reminder.id }, data: { status: 'SENDING', consentGranted: true, consentCheckedAt: now, lastErrorCode: null } })
    return {
      outcome: 'CLAIMED' as const,
      phone: reminder.user.phone,
      message: getSmsMessage('ABANDONED_CART', language(preference!.language), {
        itemCount: reminder.cart.totalItems,
        cartLink: `${SEO_CONFIG.siteUrl}/cart`,
      }),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  if (claim.outcome !== 'CLAIMED') return { outcome: claim.outcome, recordId: reminderId }
  const delivery = await deliverSms(claim.phone, claim.message).catch(() => 'FAILED' as const)
  await db.abandonedCartReminder.updateMany({
    where: { id: reminderId, status: 'SENDING' },
    data: delivery === 'SENT'
      ? { status: 'SENT', sentAt: now, lastErrorCode: null }
      : { status: 'FAILED', lastErrorCode: 'DELIVERY_FAILED' },
  })
  return { outcome: delivery, recordId: reminderId }
}

export async function syncAbandonedCartReminder(
  userId: string,
  cart: { id: string; totalItems: number; updatedAt: Date },
  now = new Date(),
) {
  const preference = await db.communicationPreference.findUnique({ where: { userId } })
  if (cart.totalItems <= 0 || !hasCurrentRetentionConsent(preference, 'SMS', 'ABANDONED_CART')) {
    await db.abandonedCartReminder.updateMany({
      where: { cartId: cart.id, status: { notIn: ['SENT', 'CANCELLED'] } },
      data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: cart.totalItems <= 0 ? 'CART_EMPTY' : 'CONSENT_REVOKED' },
    })
    return null
  }

  const existing = await db.abandonedCartReminder.findUnique({ where: { cartId: cart.id } })
  if (existing?.sentAt && existing.sentAt >= cart.updatedAt) return existing
  const dueAt = new Date(cart.updatedAt.getTime() + ABANDONED_CART_DELAY_MS)
  return db.abandonedCartReminder.upsert({
    where: { cartId: cart.id },
    create: { userId, cartId: cart.id, channel: 'SMS', dueAt, status: 'PENDING', consentGranted: true, consentCheckedAt: now },
    update: { dueAt, status: 'PENDING', sentAt: null, cancelledAt: null, lastErrorCode: null, consentGranted: true, consentCheckedAt: now },
  })
}

export async function cancelAbandonedCartReminder(userId: string, reason = 'ORDER_CREATED') {
  const now = new Date()
  return db.abandonedCartReminder.updateMany({
    where: { userId, status: { notIn: ['SENT', 'CANCELLED'] } },
    data: { status: 'CANCELLED', cancelledAt: now, consentGranted: false, consentCheckedAt: now, lastErrorCode: reason },
  })
}
