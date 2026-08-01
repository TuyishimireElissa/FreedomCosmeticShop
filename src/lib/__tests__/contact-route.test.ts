import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST, GET } from '@/app/api/contact/route'

const ORIGIN = 'https://freedom-cosmetic-shop.vercel.app'

function makeRequest(body: unknown, init: { origin?: string; ip?: string; raw?: string } = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (init.origin) headers.set('origin', init.origin)
  // A distinct IP per test keeps the shared token buckets from bleeding across
  // cases and turning an unrelated assertion into a 429.
  headers.set('x-forwarded-for', init.ip ?? `10.0.0.${Math.floor(Math.random() * 250) + 1}`)
  return new Request(`${ORIGIN}/api/contact`, {
    method: 'POST',
    headers,
    body: init.raw ?? JSON.stringify(body),
  })
}

const valid = {
  name: 'Uwase Claudine',
  email: 'uwase@example.rw',
  phone: '0788123456',
  message: 'Muraho, I would like to ask about delivery to Musanze.',
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('accepts a well-formed enquiry', async () => {
    const res = await POST(makeRequest(valid))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })

  it('accepts an enquiry without a phone number', async () => {
    const { phone: _phone, ...noPhone } = valid
    const res = await POST(makeRequest(noPhone))
    expect(res.status).toBe(200)
  })

  it.each([
    ['name too short', { ...valid, name: 'A' }],
    ['invalid email', { ...valid, email: 'not-an-email' }],
    ['message too short', { ...valid, message: 'hi' }],
    ['missing message', { name: valid.name, email: valid.email }],
    ['unknown field', { ...valid, isAdmin: true }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ success: false, error: 'INVALID_INPUT' })
  })

  it('rejects a phone number that is not a valid Rwandan MSISDN', async () => {
    const res = await POST(makeRequest({ ...valid, phone: '12' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.issues).toContainEqual({ field: 'phone', code: 'INVALID_PHONE' })
  })

  it('rejects malformed JSON with 400, not 500', async () => {
    const res = await POST(makeRequest(null, { raw: '{"name": ' }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'INVALID_JSON' })
  })

  it('rejects a cross-origin submission', async () => {
    const res = await POST(makeRequest(valid, { origin: 'https://evil.example.com' }))
    expect(res.status).toBe(403)
  })

  it('rate limits a flood from one address', async () => {
    const ip = '203.0.113.77'
    const codes: number[] = []
    for (let i = 0; i < 7; i += 1) {
      codes.push((await POST(makeRequest(valid, { ip }))).status)
    }
    // 5 allowed per 10 minutes, so the tail must be throttled.
    expect(codes.filter((c) => c === 200).length).toBeLessThanOrEqual(5)
    expect(codes).toContain(429)
  })

  it('never logs the message body or full email address', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await POST(makeRequest(valid))
    const logged = JSON.stringify(info.mock.calls)
    expect(logged).not.toContain(valid.message)
    expect(logged).not.toContain(valid.email)
    expect(logged).toContain('example.rw') // domain only
  })

  it('answers GET with 405 rather than crashing', async () => {
    expect((await GET()).status).toBe(405)
  })
})
