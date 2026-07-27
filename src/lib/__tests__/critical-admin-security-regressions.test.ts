import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const orders = read('src/app/api/orders/route.ts')
const order = read('src/app/api/orders/[id]/route.ts')
const track = read('src/app/api/orders/[id]/track/route.ts')
const events = read('src/app/api/events/stream/route.ts')
const status = read('src/app/api/payments/status/[txId]/route.ts')
const adminLogin = read('src/components/admin/AdminLoginScreen.tsx')
const auth = read('src/lib/auth.ts')
const authService = read('src/server/services/auth.ts')


describe('critical admin and customer privacy regressions', () => {
  it('protects the full order list and full order detail', () => {
    expect(orders).toContain('requirePermission(PERMISSIONS.ORDERS_READ)')
    expect(order).toContain('requirePermission(PERMISSIONS.ORDERS_READ)')
  })

  it('never ignores order-update authorization failures', () => {
    expect(order).toContain('const adminUser = await requirePermission(PERMISSIONS.ORDERS_UPDATE)')
    expect(order).not.toContain('allow for now (backward compat)')
    expect(order).toContain('requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PAYMENT_STATUS_CHANGE)')
  })

  it('requires proof for customer tracking and payment polling', () => {
    expect(track).toContain('verifyOrderAccessToken')
    expect(track).toContain("request.headers.get('x-order-phone')")
    expect(status).toContain('verifyOrderAccessToken')
    expect(status).toContain("'Cache-Control': 'private, no-store, max-age=0'")
  })

  it('does not send sensitive realtime events to anonymous visitors', () => {
    expect(events).toContain('canReceiveEvent')
    expect(events).toContain('PUBLIC_EVENT_PREFIXES')
    expect(events).toContain('isAdminRole(user.role)')
    expect(events).not.toContain('all events are public store data')
  })

  it('accepts the canonical SUPER_ADMIN role in admin login', () => {
    expect(adminLogin).toContain('isAdminRole(user.role)')
    expect(adminLogin).not.toContain('user.role !== "ADMIN" && user.role !== "STAFF"')
  })

  it('uses revocable, rotating token generations', () => {
    expect(auth).toContain('payload.sessionVersion !== account.sessionVersion')
    expect(authService).toContain('Atomic token-hash replacement')
    expect(authService).toContain('db.authSession.updateMany')
    expect(authService).toContain('sessionVersion: { increment: 1 }')
    expect(authService).not.toContain('no token versioning')
  })
})
