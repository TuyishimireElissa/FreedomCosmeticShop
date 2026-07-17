'use client'

import { useCallback, useState } from 'react'
import { announce } from '@/components/a11y/LiveAnnouncer'
import { useT } from '@/lib/i18n/LanguageContext'
import {
  fetchWithResilience,
  ResilientFetchError,
  type ResilientFetchConfig,
} from '@/lib/resilient-fetch'

export { ResilientFetchError } from '@/lib/resilient-fetch'

export function useResilientFetch() {
  const t = useT()
  const [retryAttempt, setRetryAttempt] = useState(0)

  const resilientFetch = useCallback(async (
    input: RequestInfo | URL,
    init: RequestInit = {},
    config: Omit<ResilientFetchConfig, 'onRetry'> = {},
  ) => {
    setRetryAttempt(0)
    try {
      const response = await fetchWithResilience(input, init, {
        ...config,
        onRetry: ({ attempt, maxRetries }) => {
          setRetryAttempt(attempt)
          announce(t('network.retrying', { attempt, max: maxRetries }))
        },
      })
      if (response.status >= 500) announce(t('network.server_error'), 'assertive')
      return response
    } catch (reason) {
      if (reason instanceof ResilientFetchError) {
        announce(t(reason.code === 'OFFLINE' ? 'network.offline' : 'network.request_failed'), 'assertive')
      }
      throw reason
    } finally {
      setRetryAttempt(0)
    }
  }, [t])

  return {
    resilientFetch,
    isRetrying: retryAttempt > 0,
    retryAttempt,
  }
}
