import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const detection = read('src/hooks/useOfflineDetection.ts')
const banner = read('src/components/ui/OfflineBanner.tsx')
const layout = read('src/app/layout.tsx')
const cartStore = read('src/store/cartStore.ts')
const cartSync = read('src/hooks/useCartSync.ts')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('offline-first cart foundation', () => {
  it('tracks browser online state and removes both event listeners', () => {
    expect(detection).toContain('setIsOffline(!navigator.onLine)')
    expect(detection).toContain('setIsConnectionKnown(true)')
    expect(detection).toContain("window.addEventListener('online', updateStatus)")
    expect(detection).toContain("window.addEventListener('offline', updateStatus)")
    expect(detection).toContain("window.removeEventListener('online', updateStatus)")
    expect(detection).toContain("window.removeEventListener('offline', updateStatus)")
  })

  it('provides a translated, text-and-icon offline status', () => {
    expect(banner).toContain('if (!isOffline) return null')
    expect(banner).toContain('role="status"')
    expect(banner).toContain('aria-live="polite"')
    expect(banner).toContain('aria-atomic="true"')
    expect(banner).toContain('<WifiOff')
    expect(banner).toContain('aria-hidden="true"')
    expect(banner).toContain("t('offline.title')")
    expect(banner).toContain("t('offline.cart_saved')")
  })

  it('mounts the offline banner alongside the global live announcer', () => {
    expect(layout).toContain("import OfflineBanner from '@/components/ui/OfflineBanner'")
    expect(layout).toContain('<LiveAnnouncer />\n            <OfflineBanner />')
  })

  it('keeps cart, saved items, and district in versioned local storage', () => {
    expect(cartStore).toContain('persist(')
    expect(cartStore).toContain("name: 'fcs-cart'")
    expect(cartStore).toContain('storage: createJSONStorage(() => localStorage)')
    expect(cartStore).toContain('partialize: (state) => ({ items: state.items, savedItems: state.savedItems, selectedDistrict: state.selectedDistrict })')
    expect(cartStore).toContain('version: 1')
  })

  it('does not start cart network synchronization while offline', () => {
    expect(cartSync).toContain('const { isConnectionKnown, isOffline } = useOfflineDetection()')
    expect(cartSync).toContain('if (!isConnectionKnown || isOffline || !user || loadedUser.current === user.id || loadingServer.current) return')
    expect(cartSync).toContain('if (!isConnectionKnown || isOffline || !user || loadingServer.current) return')
    expect(cartSync).toContain('[isConnectionKnown, isOffline, items, replaceServerProductItems')
  })

  it('provides English and verified Kinyarwanda offline messages', () => {
    for (const key of ['title', 'cart_saved']) {
      expect(english).toMatch(new RegExp(`${key}:`))
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
