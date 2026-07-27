const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export type ResilientErrorCode = 'OFFLINE' | 'NETWORK'

export class ResilientFetchError extends Error {
  readonly code: ResilientErrorCode

  constructor(code: ResilientErrorCode, cause?: unknown) {
    super(code, { cause })
    this.name = 'ResilientFetchError'
    this.code = code
  }
}

interface RetryDetails {
  attempt: number
  maxRetries: number
  reason: 'network' | 'server'
}

export interface ResilientFetchConfig {
  maxRetries?: number
  baseDelayMs?: number
  onRetry?: (details: RetryDetails) => void
}

function abortError() {
  return new DOMException('The operation was aborted.', 'AbortError')
}

function wait(delayMs: number, signal?: AbortSignal | null) {
  if (signal?.aborted) return Promise.reject(abortError())
  if (delayMs <= 0) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener('abort', cancel)
      resolve()
    }
    const cancel = () => {
      globalThis.clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
      reject(abortError())
    }
    const timer = globalThis.setTimeout(finish, delayMs)
    signal?.addEventListener('abort', cancel, { once: true })
  })
}

export async function fetchWithResilience(
  input: RequestInfo | URL,
  init: RequestInit = {},
  config: ResilientFetchConfig = {},
) {
  const method = (init.method || 'GET').toUpperCase()
  const canRetry = RETRYABLE_METHODS.has(method)
  const maxRetries = Math.max(0, Math.min(5, Math.trunc(config.maxRetries ?? 2)))
  const baseDelayMs = Math.max(0, config.baseDelayMs ?? 500)

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(input, init)
      const shouldRetry = canRetry && response.status >= 500 && response.status <= 599 && attempt < maxRetries
      if (!shouldRetry) return response

      config.onRetry?.({ attempt: attempt + 1, maxRetries, reason: 'server' })
      await wait(baseDelayMs * 2 ** attempt, init.signal)
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') throw reason
      if (!(reason instanceof TypeError)) throw reason

      if (canRetry && attempt < maxRetries) {
        config.onRetry?.({ attempt: attempt + 1, maxRetries, reason: 'network' })
        await wait(baseDelayMs * 2 ** attempt, init.signal)
        continue
      }

      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      throw new ResilientFetchError(offline ? 'OFFLINE' : 'NETWORK', reason)
    }
  }

  throw new ResilientFetchError('NETWORK')
}
