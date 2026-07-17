import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithResilience, ResilientFetchError } from '@/lib/resilient-fetch'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const hook = read('src/hooks/useResilientFetch.ts')
const helper = read('src/lib/resilient-fetch.ts')
const reviewForm = read('src/components/reviews/ReviewSubmissionForm.tsx')
const wholesaleForm = read('src/components/wholesale/WholesaleView.tsx')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('resilient fetch', () => {
  it('retries GET network failures with bounded exponential attempts', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', request)
    const retries: number[] = []

    const response = await fetchWithResilience('/api/test', {}, {
      maxRetries: 2,
      baseDelayMs: 0,
      onRetry: ({ attempt }) => retries.push(attempt),
    })

    expect(response.status).toBe(200)
    expect(request).toHaveBeenCalledTimes(3)
    expect(retries).toEqual([1, 2])
    expect(helper).toContain('baseDelayMs * 2 ** attempt')
  })

  it('retries 5xx responses but never retries 4xx responses', async () => {
    const serverRequest = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', serverRequest)
    expect((await fetchWithResilience('/api/test', {}, { baseDelayMs: 0 })).status).toBe(200)
    expect(serverRequest).toHaveBeenCalledTimes(2)

    const clientRequest = vi.fn().mockResolvedValue(new Response('{}', { status: 422 }))
    vi.stubGlobal('fetch', clientRequest)
    expect((await fetchWithResilience('/api/test', {}, { baseDelayMs: 0 })).status).toBe(422)
    expect(clientRequest).toHaveBeenCalledTimes(1)
  })

  it('does not automatically replay non-idempotent POST submissions', async () => {
    const serverRequest = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', serverRequest)
    expect((await fetchWithResilience('/api/submit', { method: 'POST' }, { baseDelayMs: 0 })).status).toBe(503)
    expect(serverRequest).toHaveBeenCalledTimes(1)

    const networkRequest = vi.fn().mockRejectedValue(new TypeError('network'))
    vi.stubGlobal('fetch', networkRequest)
    await expect(fetchWithResilience('/api/submit', { method: 'POST' }, { baseDelayMs: 0 })).rejects.toBeInstanceOf(ResilientFetchError)
    expect(networkRequest).toHaveBeenCalledTimes(1)
  })

  it('does not retry aborted requests', async () => {
    const request = vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'))
    vi.stubGlobal('fetch', request)
    await expect(fetchWithResilience('/api/test', {}, { baseDelayMs: 0 })).rejects.toMatchObject({ name: 'AbortError' })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('announces retries and final errors through the existing live announcer', () => {
    expect(hook).toContain("announce(t('network.retrying', { attempt, max: maxRetries }))")
    expect(hook).toContain("announce(t(reason.code === 'OFFLINE' ? 'network.offline' : 'network.request_failed'), 'assertive')")
    expect(hook).not.toContain('any')
    expect(helper).not.toContain('any')
  })

  it('integrates submission forms without clearing entered values on failure', () => {
    expect(reviewForm).toContain("resilientFetch('/api/reviews/submit'")
    expect(reviewForm).toContain('reason instanceof ResilientFetchError')
    expect(reviewForm).not.toContain("setTitle('')")
    expect(reviewForm).not.toContain("setComment('')")
    expect(wholesaleForm).toContain('resilientFetch("/api/wholesale/apply"')
    expect(wholesaleForm).toContain('e instanceof ResilientFetchError')
    expect(wholesaleForm).not.toContain('setBusinessName("")')
    expect(wholesaleForm).not.toContain('setOwnerName("")')
  })

  it('provides English and verified Kinyarwanda network messages', () => {
    for (const key of ['retrying', 'offline', 'request_failed', 'server_error']) {
      expect(english).toMatch(new RegExp(`${key}:`))
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
