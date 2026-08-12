/**
 * Cart drawer action bar.
 *
 * Reported: the "Checkout →" button in the slide-out cart did nothing.
 *
 * ROOT CAUSE — both buttons were dead, not just Checkout.
 *
 *   onClick={() => { setCartOpen(false); goCheckout() }}
 *
 * and in useStore.ts:
 *
 *   goCheckout: () => { set({ view: "checkout", isCartOpen: false }); scrollTo(...) }
 *
 * `view` is dead state. Nothing in src/app or src/components reads it — it is
 * a leftover from the single-page architecture this app had before moving to
 * Next file routing. Tapping either button closed the drawer, scrolled to the
 * top, and set a variable no one consumes. "View cart" (goCart) was broken
 * identically.
 *
 * These tests pin that the drawer navigates for real, and that the store's
 * dead `go*` actions are never reached from here again. The actions
 * themselves are left in useStore.ts: cart state is out of scope, and
 * WholesaleDashboard still calls goCart().
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

/** Comments stripped: the file documents the dead actions by name in prose,
 *  so a naive `not.toContain('goCheckout')` matches the explanation. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const drawer = code('src/components/storefront/CartDrawer.tsx')
const store = read('src/store/useStore.ts')
const rw = read('src/lib/i18n/translations/rw.ts')
const en = read('src/lib/i18n/translations/en.ts')

describe('the store actions the drawer used are genuinely dead', () => {
  it('goCheckout and goCart only set unread state', () => {
    // Guards the premise of this whole fix. If someone later wires `view` up
    // to a router, this test fails and the drawer should be reconsidered.
    // Anchor on the implementations, not the interface declared above them:
    // `goCart: () => void` appears first and would slice the wrong block, and
    // `goConfirmation` appears in the interface BEFORE goCart's body, which
    // silently produced an empty slice and a vacuous pass.
    const start = store.indexOf('goCart: () => {')
    const end = store.indexOf('goAdmin: () => {')
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const go = store.slice(start, end)
    expect(go).toContain('view: "cart"')
    expect(go).toContain('view: "checkout"')
    expect(go).not.toContain('router')
    expect(go).not.toContain('location')
  })
})

describe('every drawer action navigates for real', () => {
  it('uses the Next router, not the dead store actions', () => {
    expect(drawer).toContain("from \"next/navigation\"")
    expect(drawer).toContain('const router = useRouter()')
    expect(drawer).not.toContain('goCheckout')
    expect(drawer).not.toContain('goCart')
  })

  it('the primary action goes to checkout', () => {
    expect(drawer).toMatch(/setCartOpen\(false\); router\.push\('\/checkout'\)/)
  })

  it('view cart goes to the full bag page', () => {
    expect(drawer).toMatch(/setCartOpen\(false\); router\.push\('\/cart'\)/)
  })

  it('continue shopping only closes the drawer', () => {
    // It must NOT navigate: the point is to leave the shopper where they were.
    const block = drawer.slice(drawer.indexOf("t('cart.continue_shopping')") - 400, drawer.indexOf("t('cart.continue_shopping')"))
    expect(block).toContain('onClick={() => setCartOpen(false)}')
    expect(block).not.toContain('router.push')
  })
})

describe('the action bar has the buttons the shopper needs', () => {
  it('offers continue shopping, WhatsApp ordering, and view cart', () => {
    expect(drawer).toContain("t('cart.continue_shopping')")
    expect(drawer).toContain("t('cart.order_via_whatsapp')")
    expect(drawer).toContain("t('cart.view_cart')")
  })

  it('no longer shows the broken generic Checkout label', () => {
    // It read "Checkout" via checkout.title and did nothing.
    expect(drawer).not.toContain("t('checkout.title')")
  })

  it('stacks on a phone and sits side by side from sm up', () => {
    // 360px is the target width; two pills side by side there are too narrow.
    expect(drawer).toContain('flex flex-col gap-2 sm:flex-row')
  })

  it('keeps the wholesale path on its own dedicated button', () => {
    // Wholesale orders go to an assigned manager, not the public number.
    expect(drawer).toContain('<WholesaleCartOrderButton')
  })
})

describe('the WhatsApp button uses a colour that passes AA', () => {
  it('uses the audited pill token, not the raw brand green', () => {
    expect(drawer).toContain('bg-fcs-whatsapp-pill')
    // --fcs-whatsapp #25D366 is 1.98:1 and must never back white text.
    expect(drawer).not.toContain('bg-fcs-whatsapp ')
    expect(drawer).not.toContain('#25D366')
    expect(drawer).not.toContain('#1F8A4C') // 4.38:1 — fails AA
  })

  it('the token is defined and is the 4.55:1 value', () => {
    const css = read('src/app/globals.css')
    expect(css).toContain('--fcs-whatsapp-pill: #1E874A')
  })

  it('white text on that green clears 4.5:1', () => {
    // Computed here rather than trusted from a comment.
    const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : (((c / 255) + 0.055) / 1.055) ** 2.4)
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!)
    }
    const ratio = (1.0 + 0.05) / (lum('#1E874A') + 0.05)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})

describe('the drawer never opens wa.me directly', () => {
  it('routes through checkout so the order is saved first', () => {
    // /api/orders/whatsapp needs name, phone and district to persist an order.
    // The drawer collects none of them. Opening wa.me here would recreate the
    // bug where an order lived only in the customer's WhatsApp app: no FC
    // reference, nothing in /admin/whatsapp-orders, lost if the tab closed.
    expect(drawer).not.toContain('wa.me')
    expect(drawer).not.toContain('buildWhatsAppUrl')
  })
})

describe('no component anywhere still calls a dead navigation action', () => {
  /**
   * The drawer was not the only casualty. Every `go*` action in the store and
   * `setView(...)` only ever set the unread `view` field, so EVERY button
   * wired to one did nothing. Found across the site:
   *
   *   CartDrawer          browse products, 2x product thumbnails
   *   AdminOverview       6 Quick Actions + recent-order rows
   *   AdminAnalytics      recent-order rows
   *   AdminView           back-to-store, access-denied, logout
   *   AdminMobilePanel    back button
   *   TrackOrderView      home button
   *   WholesaleView       back-to-store x3, login x2, continue shopping x3
   *   WholesaleDashboard  back-to-store, modify-order, track orders
   *
   * This test fails the build if any of them is reintroduced.
   */
  const SOURCES = [
    'src/components/storefront/CartDrawer.tsx',
    'src/components/storefront/TrackOrderView.tsx',
    'src/components/admin/AdminOverview.tsx',
    'src/components/admin/AdminAnalytics.tsx',
    'src/components/admin/AdminView.tsx',
    'src/components/admin/AdminMobilePanel.tsx',
    'src/components/admin/AdminAuthGuard.tsx',
    'src/components/admin/AdminSidebar.tsx',
    'src/components/wholesale/WholesaleView.tsx',
    'src/components/wholesale/WholesaleDashboard.tsx',
  ]

  /** Calls only — `goHome` is also a legitimate local router wrapper name. */
  const DEAD_CALLS = [
    'goCatalog(',
    'goProduct(',
    'goCart(',
    'goCheckout(',
    'goConfirmation(',
    'goTrackOrder(',
    'setView("admin")',
    "setView('trackOrder')",
  ]

  it.each(SOURCES)('%s calls no dead store navigation', (path) => {
    const source = code(path)
    for (const call of DEAD_CALLS) {
      expect(source, `${path} still calls ${call}`).not.toContain(call)
    }
  })

  it.each(SOURCES)('%s navigates with the router or a Link', (path) => {
    const source = code(path)
    // Every file in this list previously had at least one navigating control.
    const navigates =
      source.includes('router.push') ||
      source.includes('next/link') ||
      source.includes('<Link')
    expect(navigates, `${path} has no real navigation left`).toBe(true)
  })

  it('the admin quick actions each go somewhere distinct', () => {
    // All six previously called setView("admin") — identical, and dead.
    const overview = code('src/components/admin/AdminOverview.tsx')
    for (const route of ['/admin/products', '/admin/orders', '/admin/settings', '/admin/analytics']) {
      expect(overview, `quick actions never reach ${route}`).toContain(`router.push('${route}')`)
    }
  })

  it('admin logout actually leaves the admin panel', () => {
    // It called logout() then goHome(), which did nothing — leaving a
    // logged-out user sitting on the admin screen.
    const view = code('src/components/admin/AdminView.tsx')
    expect(view).toMatch(/logout\(\)[\s\S]{0,80}?router\.push\('\/'\)/)
  })
})

describe('both languages carry the new label', () => {
  it('order_via_whatsapp exists in rw and en', () => {
    expect(rw).toContain('order_via_whatsapp:')
    expect(en).toContain('order_via_whatsapp:')
  })

  it('the Kinyarwanda is marked verified and is not English', () => {
    expect(rw).toContain("order_via_whatsapp: 'Tumiza kuri WhatsApp' /* verified-rw */")
  })

  it('reuses the existing continue_shopping string rather than adding a duplicate', () => {
    // cart.continue_shopping already existed in both files.
    expect(rw).toContain("continue_shopping: 'Komeza guhaha'")
    expect(en).toContain("continue_shopping: 'Continue Shopping'")
  })
})
