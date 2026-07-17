import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isLowDataPreference, isSlowNetwork, LOW_DATA_STORAGE_KEY } from '@/lib/low-data'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const context = read('src/contexts/LowDataContext.tsx')
const layout = read('src/app/layout.tsx')

describe('Rwanda-first low-data infrastructure', () => {
  it('validates only explicit supported preferences', () => {
    expect(LOW_DATA_STORAGE_KEY).toBe('fcs_low_data_pref')
    expect(isLowDataPreference('auto')).toBe(true)
    expect(isLowDataPreference('on')).toBe(true)
    expect(isLowDataPreference('off')).toBe(true)
    expect(isLowDataPreference('true')).toBe(false)
    expect(isLowDataPreference(null)).toBe(false)
  })

  it('detects constrained connection types and sub-1 Mbps downlinks', () => {
    expect(isSlowNetwork({ effectiveType: 'slow-2g', downlink: 2 })).toBe(true)
    expect(isSlowNetwork({ effectiveType: '2g', downlink: 2 })).toBe(true)
    expect(isSlowNetwork({ effectiveType: '3g', downlink: 0.8 })).toBe(true)
    expect(isSlowNetwork({ effectiveType: '3g', downlink: 1.2 })).toBe(false)
    expect(isSlowNetwork({ effectiveType: '4g' })).toBe(false)
    expect(isSlowNetwork(null)).toBe(false)
  })

  it('persists user choice and synchronizes it across tabs', () => {
    expect(context).toContain('localStorage.getItem(LOW_DATA_STORAGE_KEY)')
    expect(context).toContain('localStorage.setItem(LOW_DATA_STORAGE_KEY, preference)')
    expect(context).toContain("window.addEventListener('storage', syncPreference)")
    expect(context).toContain("window.removeEventListener('storage', syncPreference)")
  })

  it('listens for Network Information API changes with cleanup', () => {
    expect(context).toContain('networkNavigator.connection || networkNavigator.mozConnection || networkNavigator.webkitConnection')
    expect(context).toContain("connection.addEventListener('change', updateNetworkInfo)")
    expect(context).toContain("connection.removeEventListener?.('change', updateNetworkInfo)")
    expect(context).toContain('connection.saveData === true')
  })

  it('respects explicit off and on choices before automatic detection', () => {
    expect(context).toContain("const isLowData = userPreference === 'on'")
    expect(context).toContain("userPreference === 'auto' && (isSlowConnection || saveData)")
    expect(context).toContain("setUserPreference(isLowData ? 'off' : 'on')")
  })

  it('exposes effective mode to components and CSS without changing language or accessibility providers', () => {
    expect(context).toContain("document.documentElement.dataset.lowData = isLowData ? 'true' : 'false'")
    expect(context).toContain('document.documentElement.dataset.connectionType = connectionType')
    expect(layout).toContain("import { LowDataProvider } from '@/contexts/LowDataContext'")
    expect(layout.indexOf('<LowDataProvider>')).toBeLessThan(layout.indexOf('<Providers>'))
    expect(layout).toContain('<SkipToContent />')
    expect(layout).toContain('<LiveAnnouncer />')
  })
})
