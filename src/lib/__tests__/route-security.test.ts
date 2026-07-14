import { describe, expect, it } from 'vitest'
import { isSeedApiPath, shouldBlockProductionSeedRoute } from '@/lib/route-security'

describe('production seed-route security', () => {
  it('recognizes the seed endpoint and trailing-slash variant', () => {
    expect(isSeedApiPath('/api/seed')).toBe(true)
    expect(isSeedApiPath('/api/seed/')).toBe(true)
  })

  it('blocks nested seed paths to prevent bypass routes', () => {
    expect(isSeedApiPath('/api/seed/run')).toBe(true)
    expect(isSeedApiPath('/api/seed/internal/reset')).toBe(true)
  })

  it('does not overmatch similarly named legitimate routes', () => {
    expect(isSeedApiPath('/api/seed-data')).toBe(false)
    expect(isSeedApiPath('/api/seeds')).toBe(false)
    expect(isSeedApiPath('/api/products')).toBe(false)
  })

  it('blocks seed HTTP access in production regardless of ALLOW_SEED', () => {
    expect(shouldBlockProductionSeedRoute('/api/seed', 'production')).toBe(true)
  })

  it('does not let the production rule affect unrelated routes', () => {
    expect(shouldBlockProductionSeedRoute('/api/orders', 'production')).toBe(false)
  })

  it('leaves local command-controlled development behavior to the route handler', () => {
    expect(shouldBlockProductionSeedRoute('/api/seed', 'development')).toBe(false)
    expect(shouldBlockProductionSeedRoute('/api/seed', 'test')).toBe(false)
  })
})
