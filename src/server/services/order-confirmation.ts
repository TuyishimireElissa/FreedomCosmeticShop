import { BUSINESS } from '@/lib/business-config'
import { features } from '@/lib/env'
import { formatRWF } from '@/lib/format'
import { resolveTranslation } from '@/lib/i18n'

type Language = 'en' | 'rw'
import { sendEmail } from '@/server/services/email'
import { sendSms } from '@/server/services/sms'

type DeliveryStatus = 'sent' | 'failed' | 'not_configured' | 'not_requested'
export interface OrderConfirmationData {
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  totalAmount: number
  deliveryDistrict: string
  estimatedDelivery?: Date | string | null
  paymentMethod: string
  language?: Language
  paymentConfirmed: boolean
  requiresStockReview?: boolean
  requiresPaymentReview?: boolean
}
export interface OrderConfirmationResult { sms: DeliveryStatus; email: DeliveryStatus }

function dateLabel(value: Date | string | null | undefined, language: Language) {
  if (!value) return resolveTranslation(language, 'confirmation.estimate_pending')
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return resolveTranslation(language, 'confirmation.estimate_pending')
  return new Intl.DateTimeFormat(language === 'rw' ? 'rw-RW' : 'en-RW', { dateStyle: 'medium', timeZone: 'Africa/Kigali' }).format(date)
}
function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)
}

export async function sendOrderConfirmation(data: OrderConfirmationData): Promise<OrderConfirmationResult> {
  const language = data.language || 'rw'
  const amount = formatRWF(data.totalAmount)
  const expected = dateLabel(data.estimatedDelivery, language)
  const messageKey = data.requiresPaymentReview ? 'sms.duplicate_payment_review' : data.requiresStockReview ? 'sms.payment_stock_review' : data.paymentConfirmed ? 'sms.payment_confirmation_detailed' : 'sms.order_confirmation_detailed'
  const message = resolveTranslation(language, messageKey, { order: data.orderNumber, amount, district: data.deliveryDistrict, expected })

  let sms: DeliveryStatus = 'not_configured'
  if (features.sms) {
    const result = await sendSms(data.customerPhone, message, data.paymentConfirmed ? 'PAYMENT_CONFIRMED' : 'ORDER_PLACED').catch(() => null)
    sms = result?.success ? 'sent' : 'failed'
  }

  let email: DeliveryStatus = data.customerEmail ? 'not_configured' : 'not_requested'
  if (data.customerEmail && features.email) {
    const name = escapeHtml(data.customerName)
    const order = escapeHtml(data.orderNumber)
    const district = escapeHtml(data.deliveryDistrict)
    const method = escapeHtml(data.paymentMethod.replaceAll('_', ' '))
    const expectedSafe = escapeHtml(expected)
    const title = resolveTranslation(language, data.paymentConfirmed ? 'confirmation.email_payment_title' : 'confirmation.email_order_title')
    const intro = resolveTranslation(language, 'confirmation.email_intro', { name })
    const stockReviewText = data.requiresPaymentReview ? resolveTranslation(language, 'confirmation.payment_review_notice') : data.requiresStockReview ? resolveTranslation(language, 'confirmation.stock_review_notice') : ''
    const stockNotice = stockReviewText ? `<p style="padding:12px;background:#fff3cd;border-radius:10px"><strong>${escapeHtml(stockReviewText)}</strong></p>` : ''
    const html = `<!doctype html><html lang="${language}"><body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a"><main style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden"><header style="background:#B76E79;color:#fff;padding:28px;text-align:center"><h1 style="margin:0;font-size:24px">${escapeHtml(title)}</h1></header><section style="padding:24px"><p>${intro}</p>${stockNotice}<div style="background:#f8f9fa;border-radius:12px;padding:16px"><p><strong>${escapeHtml(resolveTranslation(language, 'confirmation.order_number_label'))}:</strong> ${order}</p><p><strong>${escapeHtml(resolveTranslation(language, 'cart.total'))}:</strong> ${escapeHtml(amount)}</p><p><strong>${escapeHtml(resolveTranslation(language, 'confirmation.delivery_to'))}:</strong> ${district}</p><p><strong>${escapeHtml(resolveTranslation(language, 'confirmation.expected_delivery'))}:</strong> ${expectedSafe}</p><p><strong>${escapeHtml(resolveTranslation(language, 'confirmation.payment_method'))}:</strong> ${method}</p></div><a href="${BUSINESS.url}/track-order" style="display:block;margin-top:20px;padding:14px;background:#B76E79;color:#fff;text-align:center;text-decoration:none;border-radius:10px;font-weight:bold">${escapeHtml(resolveTranslation(language, 'confirmation.track_order'))}</a></section></main></body></html>`
    const result = await sendEmail({
      to: data.customerEmail,
      subject: `${BUSINESS.name} — ${title} #${data.orderNumber}`,
      html,
      text: `${title}\n${intro}\n${stockReviewText}\n${data.orderNumber}\n${amount}\n${data.deliveryDistrict}\n${expected}`,
    }).catch(() => null)
    email = result?.success ? 'sent' : 'failed'
  }

  return { sms, email }
}
