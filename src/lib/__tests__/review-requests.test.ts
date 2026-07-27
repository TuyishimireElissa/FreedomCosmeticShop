import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const service = read('src/lib/review-requests.ts')
const cron = read('src/app/api/cron/review-requests/route.ts')
const orderRoute = read('src/app/api/orders/[id]/route.ts')
const schema = read('prisma/schema.prisma')
const vercel = JSON.parse(read('vercel.json'))
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

describe('delivered-order review requests', () => {
  it('creates idempotent requests only for authenticated delivered orders', () => {
    expect(service).toContain("order.status !== 'DELIVERED'")
    expect(service).toContain("order.delivery?.status !== 'DELIVERED'")
    expect(service).toContain('!order.delivery.deliveredAt || !order.userId')
    expect(service).toContain('orderId_productId')
    expect(service).toContain('new Set(order.items.flatMap')
    expect(service).toContain('item.bundle?.products.map')
    expect(service).not.toContain('review.create')
  })

  it('waits three real days and does not mark simulated or disabled SMS as sent', () => {
    expect(service).toContain('3 * 86_400_000')
    expect(service).toContain('requestedAt: { lte: eligibleBefore }')
    expect(service).toContain('if (!features.sms) return { sent: 0, failed: 0, skipped: candidates.length }')
    expect(service).toContain("result.provider !== 'SIMULATED'")
    expect(service).toContain("lastSmsError: 'PROVIDER_REJECTED'")
  })

  it('uses durable claims for concurrent serverless cron runs', () => {
    for (const field of ['smsClaimedAt', 'smsAttempts', 'lastSmsError']) expect(schema).toContain(field)
    expect(service).toContain('CLAIM_TIMEOUT_MS')
    expect(service).toContain('claimed.count !== 1')
    expect(service).toContain('smsAttempts: { increment: 1 }')
  })

  it('uses a fail-closed timing-safe cron secret and the correct Kigali schedule', () => {
    expect(cron).toContain("process.env.CRON_SECRET")
    expect(cron).toContain('timingSafeEqual')
    expect(cron).toContain("authorization?.startsWith('Bearer ')")
    expect(vercel.crons).toContainEqual({ path: '/api/cron/review-requests', schedule: '0 8 * * *' })
  })

  it('triggers request creation only when an order becomes delivered', () => {
    expect(orderRoute).toContain("if (newStatus === 'DELIVERED')")
    expect(orderRoute).toContain('createReviewRequests(updated.id)')
    expect(orderRoute).not.toContain('reviewLink =')
  })

  it('uses a Kinyarwanda-default message with equal reward wording', () => {
    expect(service).toContain("resolveTranslation('rw', 'sms.review_request'")
    expect(service).toContain('REVIEW_REWARD_POINTS')
    expect(en).toContain('review_request:')
    expect(rw).toMatch(/review_request:.*\/\/ verified-rw/)
  })
})
