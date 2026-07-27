import { describe, expect, it } from 'vitest'
import { resolveAuthSecret } from '@/lib/auth-secret'

describe('production auth-secret enforcement', () => {
  it('accepts a strong configured production secret', () => {
    const secret = 'a-production-secret-with-at-least-32-characters'
    expect(resolveAuthSecret(secret, undefined, 'production')).toBe(secret)
  })

  it('accepts JWT_SECRET when NEXTAUTH_SECRET is absent', () => {
    const secret = 'another-production-secret-at-least-32-chars'
    expect(resolveAuthSecret(undefined, secret, 'production')).toBe(secret)
  })

  it('rejects a missing production secret', () => {
    expect(() => resolveAuthSecret(undefined, undefined, 'production')).toThrow(
      'production JWT secret',
    )
  })

  it('rejects a short production secret', () => {
    expect(() => resolveAuthSecret('too-short', undefined, 'production')).toThrow(
      'production JWT secret',
    )
  })

  it('retains a local-only development fallback', () => {
    expect(resolveAuthSecret(undefined, undefined, 'development').length).toBeGreaterThanOrEqual(32)
  })
})
