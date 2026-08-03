import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Contract tests against PayPack's REAL documented API.
 *
 * Written after four integration bugs shipped undetected because the existing
 * suite mocked the HTTP layer: a mock will happily answer a request sent to a
 * domain that does not resolve, an endpoint that 404s, or with a signature in
 * the wrong encoding.
 *
 * Every payload below is copied verbatim from docs.paypack.rw. Rule adopted
 * going forward: unit tests that mock the transport do NOT prove an
 * integration works — assert against the published contract.
 */

const RAW_SOURCE = readFileSync(join(process.cwd(), 'src/server/services/paypack.ts'), 'utf8')
// Comments explain the bugs that were fixed and legitimately mention the old
// values; scan executable code only.
const SOURCE = RAW_SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const WEBHOOK_ROUTE = readFileSync(join(process.cwd(), 'src/app/api/webhooks/paypack/route.ts'), 'utf8')

const SECRET = 'test-webhook-secret'

// `src/lib/env.ts` parses process.env once at module load, so the secret must
// exist before the module graph is first imported — not inside beforeEach.
// DATABASE_URL is the schema's only required field; without it loadEnv() falls
// back to a hardcoded object that omits PAYPACK_WEBHOOK_SECRET entirely.
process.env.PAYPACK_WEBHOOK_SECRET = SECRET
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test'

/** Verbatim from https://docs.paypack.rw/quickstart/webhooks#webhook-events */
const REAL_WEBHOOK_PAYLOAD = {
  event_id: '9346978a-40c0-11ed-84d0-dead0b5d6103',
  kind: 'transaction:processed',
  created_at: '2022-09-30T13:05:36.707853Z',
  data: {
    ref: '598f7582-ab43-4c90-9575-820806ab9107',
    kind: 'CASHIN',
    fee: 2.3,
    merchant: 'XXXXX',
    client: '0788123456',
    amount: 100,
    provider: 'mtn',
    status: 'successful',
    created_at: '2022-09-30T12:53:50.880947395Z',
    processed_at: '2022-09-30T13:05:36.706109277Z',
  },
}

/** PayPack signs the raw body with HMAC-SHA256 and base64-encodes it. */
function sign(body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('base64')
}

describe('PayPack — documented endpoints (Bugs 1, 2)', () => {
  it('calls the host that actually resolves in DNS', () => {
    expect(SOURCE).toContain('https://payments.paypack.rw/api')
    // api.paypack.co.rw has no DNS record; every request failed before sending.
    expect(SOURCE).not.toContain('api.paypack.co.rw')
  })

  it('authenticates against /auth/agents/authorize', () => {
    expect(SOURCE).toContain('/auth/agents/authorize')
    expect(SOURCE).not.toContain('/auth/clients/credentials')
  })

  it('requests cashin at /transactions/cashin', () => {
    expect(SOURCE).toContain('/transactions/cashin')
    expect(SOURCE).not.toMatch(/transactions\/cash`/)
  })

  it('sends the webhook mode and idempotency headers', () => {
    expect(SOURCE).toContain('X-Webhook-Mode')
    expect(SOURCE).toContain('Idempotency-Key')
  })
})

describe('PayPack — webhook signature (Bug 3)', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.PAYPACK_WEBHOOK_SECRET = SECRET
  })

  it('accepts a genuine base64 signature over the real payload', async () => {
    const { verifyWebhookEvent } = await import('@/server/services/paypack')
    const body = JSON.stringify(REAL_WEBHOOK_PAYLOAD)
    expect(verifyWebhookEvent(body, sign(body))).not.toBeNull()
  })

  it('rejects a hex signature — the encoding the old code produced', async () => {
    const { verifyWebhookEvent } = await import('@/server/services/paypack')
    const body = JSON.stringify(REAL_WEBHOOK_PAYLOAD)
    const hex = createHmac('sha256', SECRET).update(body, 'utf8').digest('hex')
    expect(verifyWebhookEvent(body, hex)).toBeNull()
  })

  it('rejects a signature made with the wrong secret', async () => {
    const { verifyWebhookEvent } = await import('@/server/services/paypack')
    const body = JSON.stringify(REAL_WEBHOOK_PAYLOAD)
    expect(verifyWebhookEvent(body, sign(body, 'attacker-secret'))).toBeNull()
  })

  it('rejects a tampered body whose signature no longer matches', async () => {
    const { verifyWebhookEvent } = await import('@/server/services/paypack')
    const body = JSON.stringify(REAL_WEBHOOK_PAYLOAD)
    const signature = sign(body)
    const tampered = JSON.stringify({
      ...REAL_WEBHOOK_PAYLOAD,
      data: { ...REAL_WEBHOOK_PAYLOAD.data, amount: 999_999 },
    })
    expect(verifyWebhookEvent(tampered, signature)).toBeNull()
  })

  it('rejects a missing signature', async () => {
    const { verifyWebhookEvent } = await import('@/server/services/paypack')
    const body = JSON.stringify(REAL_WEBHOOK_PAYLOAD)
    expect(verifyWebhookEvent(body, undefined)).toBeNull()
  })
})

describe('PayPack — nested webhook payload (Bug 4)', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.PAYPACK_WEBHOOK_SECRET = SECRET
  })

  it('flattens the documented envelope into the internal event shape', async () => {
    const { normalizeWebhookEvent } = await import('@/server/services/paypack')
    const event = normalizeWebhookEvent(REAL_WEBHOOK_PAYLOAD)

    expect(event).toEqual({
      // No id on a cashin — ref is what was stored as providerTransactionId.
      id: '598f7582-ab43-4c90-9575-820806ab9107',
      ref: '598f7582-ab43-4c90-9575-820806ab9107',
      status: 'success',
      amount: 100,
      phone: '0788123456',
      number: '0788123456',
      network: 'MTN',
    })
  })

  it('maps "successful" to success — the old code only accepted "success"', async () => {
    const { normalizeWebhookEvent } = await import('@/server/services/paypack')
    expect(normalizeWebhookEvent(REAL_WEBHOOK_PAYLOAD)?.status).toBe('success')
  })

  it('maps a failed transaction to failed', async () => {
    const { normalizeWebhookEvent } = await import('@/server/services/paypack')
    const failed = { ...REAL_WEBHOOK_PAYLOAD, data: { ...REAL_WEBHOOK_PAYLOAD.data, status: 'failed' } }
    expect(normalizeWebhookEvent(failed)?.status).toBe('failed')
  })

  it('reads the customer number from `client`', async () => {
    const { normalizeWebhookEvent } = await import('@/server/services/paypack')
    expect(normalizeWebhookEvent(REAL_WEBHOOK_PAYLOAD)?.phone).toBe('0788123456')
  })

  it('still accepts a flat legacy payload', async () => {
    const { normalizeWebhookEvent } = await import('@/server/services/paypack')
    const flat = { id: 'tx_1', ref: 'ref_1', status: 'success', amount: 5000, phone: '0788123456', network: 'MTN' }
    expect(normalizeWebhookEvent(flat)).toMatchObject({ id: 'tx_1', ref: 'ref_1', status: 'success', amount: 5000 })
  })

  it.each([
    ['pending — not terminal', { ...REAL_WEBHOOK_PAYLOAD.data, status: 'pending' }],
    ['zero amount', { ...REAL_WEBHOOK_PAYLOAD.data, amount: 0 }],
    ['negative amount', { ...REAL_WEBHOOK_PAYLOAD.data, amount: -100 }],
    ['missing ref', { ...REAL_WEBHOOK_PAYLOAD.data, ref: undefined }],
    ['missing client', { ...REAL_WEBHOOK_PAYLOAD.data, client: undefined }],
  ])('rejects %s', async (_label, data) => {
    const { normalizeWebhookEvent } = await import('@/server/services/paypack')
    expect(normalizeWebhookEvent({ ...REAL_WEBHOOK_PAYLOAD, data })).toBeNull()
  })

  it('rejects non-object input without throwing', async () => {
    const { normalizeWebhookEvent } = await import('@/server/services/paypack')
    for (const bad of [null, undefined, 'string', 42, []]) {
      expect(normalizeWebhookEvent(bad)).toBeNull()
    }
  })
})

describe('PayPack — HEAD ping (Bug 4b)', () => {
  it('exports a HEAD handler so PayPack will deliver events', () => {
    // PayPack withholds the payload entirely if the HEAD ping fails.
    expect(WEBHOOK_ROUTE).toMatch(/export async function HEAD\(/)
  })

  it('answers the ping with 200 and no body', async () => {
    const { HEAD } = await import('@/app/api/webhooks/paypack/route')
    const res = await HEAD()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('')
  })
})

describe('PayPack — status helpers', () => {
  it('accepts both documented spellings and is case-insensitive', async () => {
    const { isPaypackSuccess, isPaypackFailure } = await import('@/server/services/paypack')
    for (const value of ['successful', 'success', 'SUCCESSFUL', 'Success']) {
      expect(isPaypackSuccess(value)).toBe(true)
    }
    for (const value of ['failed', 'failure', 'FAILED']) {
      expect(isPaypackFailure(value)).toBe(true)
    }
    for (const value of ['pending', '', undefined]) {
      expect(isPaypackSuccess(value)).toBe(false)
      expect(isPaypackFailure(value)).toBe(false)
    }
  })
})

describe('PayPack — unconfigured secret fails closed', () => {
  it('rejects every webhook when PAYPACK_WEBHOOK_SECRET is unset', async () => {
    // Runs last: env.ts snapshots process.env at import, so clearing the
    // secret would otherwise leak into the tests above.
    vi.resetModules()
    delete process.env.PAYPACK_WEBHOOK_SECRET
    const { verifyWebhookEvent } = await import('@/server/services/paypack')
    const body = JSON.stringify(REAL_WEBHOOK_PAYLOAD)
    expect(verifyWebhookEvent(body, sign(body))).toBeNull()
    process.env.PAYPACK_WEBHOOK_SECRET = SECRET
  })
})
