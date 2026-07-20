import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const schema = read('prisma/schema.prisma')
const cron = read('src/app/api/cron/retention-reminders/route.ts')
const service = read('src/server/services/retention-cron.ts')
const messaging = read('src/server/services/retention-messaging.ts')
const abandonedRoute = read('src/app/api/sms/abandoned-cart/route.ts')
const optOut = read('src/app/api/sms/opt-out/route.ts')
const preferences = read('src/app/api/user/communication-preferences/route.ts')
const cartRoute = read('src/app/api/cart/route.ts')
const cartAddRoute = read('src/app/api/cart/add/route.ts')
const cartSyncRoute = read('src/app/api/cart/sync/route.ts')
const ordersRoute = read('src/app/api/orders/route.ts')
const orderCreateRoute = read('src/app/api/orders/create/route.ts')
const vercel = JSON.parse(read('vercel.json')) as { crons: Array<{ path: string; schedule: string }> }

describe('durable consent-gated retention cron', () => {
  it('adds a durable abandoned-cart reminder without contact snapshots', () => {
    const model = schema.match(/model AbandonedCartReminder \{([\s\S]*?)\n\}/)?.[1] || ''
    expect(model).toContain('cartId String @unique')
    expect(model).toContain('status           String   @default("BLOCKED")')
    expect(model).toContain('consentGranted   Boolean  @default(false)')
    expect(model).not.toMatch(/\b(phone|email|name|address)\s+String/i)
  })

  it('derives abandoned-cart state from the authenticated database cart', () => {
    expect(abandonedRoute).toContain('requireAuth')
    expect(abandonedRoute).toContain('db.cart.findUnique')
    expect(abandonedRoute).toContain('syncAbandonedCartReminder(user.id, cart)')
    expect(messaging).toContain('db.abandonedCartReminder.upsert')
    expect(abandonedRoute).toContain("hasCurrentRetentionConsent(preference, 'SMS', 'ABANDONED_CART')")
    expect(abandonedRoute).not.toMatch(/itemCount:\s*z\.|cartValue:\s*z\.|phone:\s*z\.|userId:\s*z\./)
  })

  it('synchronizes durable reminders after authenticated cart changes and cancels them after checkout', () => {
    expect(cartRoute).toContain('syncAbandonedCartReminder(user.id, updated)')
    expect(cartAddRoute).toContain('syncAbandonedCartReminder(user.id, updated)')
    expect(cartSyncRoute).toContain('syncAbandonedCartReminder(user.id, cart)')
    expect(ordersRoute).toContain('cancelAbandonedCartReminder(userId)')
    expect(orderCreateRoute).toContain('cancelAbandonedCartReminder(user.id)')
  })

  it('rechecks cart activity and current consent immediately before dispatch', () => {
    expect(messaging).toContain('dispatchAbandonedCartReminder')
    expect(messaging).toContain('reminder.cart.updatedAt.getTime() + ABANDONED_CART_DELAY_MS')
    expect(messaging).toContain("hasCurrentRetentionConsent(preference, reminder.channel as RetentionChannel, 'ABANDONED_CART')")
    expect(messaging).toContain("lastErrorCode: 'CONSENT_REVOKED'")
    expect(messaging).toContain('FOR UPDATE')
  })

  it('cancels durable abandoned-cart work on channel and purpose opt-out', () => {
    expect(optOut).toContain('db.abandonedCartReminder.updateMany')
    expect(preferences).toContain('tx.abandonedCartReminder.updateMany')
    expect(preferences).toContain("status: 'CANCELLED'")
  })

  it('selects only due pending reorder and abandoned-cart reminders', () => {
    expect(service).toContain("where: { status: 'PENDING', dueAt: { lte: now } }")
    expect(service).toContain('db.reorderReminder.findMany')
    expect(service).toContain('db.abandonedCartReminder.findMany')
  })

  it('selects stock alerts only when the current product condition is met', () => {
    expect(service).toContain("alert.\"alertType\" = 'BACK_IN_STOCK' AND product.stock > 0")
    expect(service).toContain("alert.\"alertType\" = 'PRICE_DROP'")
    expect(service).toContain('product.price <= alert."targetPrice"')
    expect(service).toContain('product."isActive" = true')
    expect(service).toContain('product."isDeleted" = false')
  })

  it('bounds batches and concurrency for a serverless execution', () => {
    expect(service).toContain('const CONCURRENCY = 4')
    expect(service).toContain('Math.min(Math.max(Math.trunc(batchSize), 1), 50)')
    expect(service).toContain('take: safeBatchSize')
    expect(cron).toContain('export const maxDuration = 60')
  })

  it('does not automatically retry ambiguous stale sending claims', () => {
    expect(service).toContain("status: 'SENDING'")
    expect(service).toContain("status: 'FAILED', lastErrorCode: 'STALE_CLAIM_REVIEW_REQUIRED'")
    expect(service).not.toContain("status: 'PENDING', lastErrorCode: 'STALE_CLAIM_REVIEW_REQUIRED'")
  })

  it('isolates per-record failures without logging recipients or message bodies', () => {
    expect(service).toContain('outcomes.ERROR += 1')
    expect(service).not.toMatch(/console\.(log|error|warn)/)
    expect(service).not.toMatch(/select:\s*\{[^}]*phone/)
    expect(service).not.toMatch(/console\.[^(]+\([^)]*(phone|message)/)
  })

  it('fails closed with timing-safe cron authentication and private responses', () => {
    expect(cron).toContain('process.env.CRON_SECRET')
    expect(cron).toContain('timingSafeEqual')
    expect(cron).toContain("authorization?.startsWith('Bearer ')")
    expect(cron).toContain("error: 'CRON_NOT_CONFIGURED'")
    expect(cron).toContain("'Cache-Control': 'private, no-store, max-age=0'")
    expect(cron).not.toContain('getServerSession')
  })

  it('adds one daily Kigali-morning retention job without removing review cron', () => {
    expect(vercel.crons).toContainEqual({ path: '/api/cron/review-requests', schedule: '0 8 * * *' })
    expect(vercel.crons).toContainEqual({ path: '/api/cron/retention-reminders', schedule: '15 7 * * *' })
    expect(vercel.crons).toHaveLength(2)
  })

  it('does not invent birthday, wishlist, reward, or segment cron policies', () => {
    expect(service).not.toMatch(/Birthday|birthday|Wishlist|wishlist|CustomerSegment|points|reward/i)
    expect(cron).not.toMatch(/Birthday|birthday|Wishlist|wishlist|CustomerSegment|points|reward/i)
  })
})
