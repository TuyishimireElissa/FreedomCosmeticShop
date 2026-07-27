import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const layout = read('src/app/layout.tsx')
const announcer = read('src/components/a11y/LiveAnnouncer.tsx')
const cartHook = read('src/hooks/useCart.ts')
const legacyStore = read('src/store/useStore.ts')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('screen-reader live announcements', () => {
  it('mounts one global announcer before the application chrome', () => {
    expect(layout).toContain("import LiveAnnouncer from '@/components/a11y/LiveAnnouncer'")
    expect(layout.indexOf('<LiveAnnouncer />')).toBeGreaterThan(layout.indexOf('<SkipToContent />'))
    expect(layout.indexOf('<LiveAnnouncer />')).toBeLessThan(layout.indexOf('<SiteChrome>'))
  })

  it('provides separate atomic polite and assertive live regions', () => {
    expect(announcer).toContain('role="status" aria-live="polite" aria-atomic="true"')
    expect(announcer).toContain('role="alert" aria-live="assertive" aria-atomic="true"')
    expect(announcer).toContain('listeners.add(listener)')
    expect(announcer).toContain('listeners.delete(listener)')
  })

  it('clears timers and supports repeating an identical announcement', () => {
    expect(announcer).toContain("setMessage('')")
    expect(announcer).toContain('if (politeTimer) clearTimeout(politeTimer)')
    expect(announcer).toContain('if (assertiveTimer) clearTimeout(assertiveTimer)')
  })

  it('announces current cart names and quantities through translated hook copy', () => {
    expect(cartHook).toContain('const t = useT()')
    for (const key of ['cart_added', 'cart_removed', 'cart_quantity', 'cart_restored', 'cart_cleared', 'cart_saved_for_later', 'cart_moved_from_saved']) {
      expect(cartHook).toContain(`t('accessibility.${key}'`)
    }
    expect(cartHook).toContain('useCartStore.getState().items.find')
  })

  it('also covers legacy cart actions through translation keys', () => {
    expect(legacyStore).toContain("import { announceTranslated } from '@/components/a11y/LiveAnnouncer'")
    expect(legacyStore).toContain("announceTranslated('accessibility.cart_added'")
    expect(legacyStore).toContain("announceTranslated('accessibility.cart_removed'")
    expect(legacyStore).toContain("announceTranslated('accessibility.cart_quantity'")
  })

  it('provides complete English and verified Kinyarwanda cart announcements', () => {
    for (const key of ['cart_added', 'cart_removed', 'cart_quantity', 'cart_restored', 'cart_cleared', 'cart_saved_for_later', 'cart_moved_from_saved']) {
      expect(english).toMatch(new RegExp(`${key}:`))
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
