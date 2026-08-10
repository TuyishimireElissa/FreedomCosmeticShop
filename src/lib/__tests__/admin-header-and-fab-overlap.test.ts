/**
 * Two mobile layout defects, both found from a real device screenshot.
 *
 * 1. /admin stacked TWO headers on a phone. `admin/layout.tsx` renders
 *    AdminHeader (itself `md:hidden`) and `admin/page.tsx` renders
 *    <AdminView embedded /> whose own sticky header had no breakpoint gate —
 *    so below md both painted, costing 128px of chrome before any content.
 *
 * 2. The floating WhatsApp button covered the homepage search submit button.
 *    At 360px the FAB occupies x288-344 and the search button x282-326.
 *
 * The interesting part of fix 1 is the trap it set: the ONLY control for the
 * mobile mini-panel lived in the header being hidden, which would have made
 * that panel unreachable on the very devices it was built for. These tests
 * pin the escape route, not just the hiding.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

/** Comments stripped: each file documents the bug it fixed, and a naive
 *  substring check matches the prose rather than the code. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const adminView = code('src/components/admin/AdminView.tsx')
const adminHeader = code('src/components/admin/AdminHeader.tsx')
const shell = code('src/components/admin/AdminShellContext.tsx')
const fab = code('src/components/ui/WhatsAppButton.tsx')

describe('only one admin header renders at any width', () => {
  it("AdminView's own header is hidden below md", () => {
    const line = adminView
      .split('\n')
      .find((l) => l.includes('sticky top-0 z-40') && l.includes('backdrop-blur'))
    expect(line, 'AdminView sticky header not found').toBeTruthy()
    expect(line).toContain('hidden')
    expect(line).toContain('md:block')
  })

  it('AdminHeader stays the mobile-only bar', () => {
    // The two gates must be complements. If both became md:hidden the admin
    // panel would have no header at all on desktop.
    const line = adminHeader.split('\n').find((l) => l.includes('<header'))
    expect(line).toContain('md:hidden')
  })

  it('the mobile bar still owns the only way to open the sidebar', () => {
    // On a phone the sidebar is off-canvas; without this the admin cannot
    // navigate at all.
    expect(adminHeader).toContain('setMobileOpen(true)')
  })
})

describe('hiding that header did not strand the mobile mini-panel', () => {
  it('the panel toggle moved into shared shell state', () => {
    expect(shell).toContain('mobilePanel')
    expect(shell).toContain('setMobilePanel')
    // Must actually be published on the context value, not merely declared.
    expect(shell).toMatch(/value = useMemo\(\s*\(\) => \(\{[^}]*mobilePanel[^}]*setMobilePanel/)
  })

  it('the mobile bar can toggle the panel', () => {
    expect(adminHeader).toContain('setMobilePanel(!mobilePanel)')
    expect(adminHeader).toContain('useAdminShell()')
  })

  it('the toggle reports its state to assistive technology', () => {
    // It is a two-state control; without aria-pressed a screen reader user
    // cannot tell which view they are in.
    expect(adminHeader).toContain('aria-pressed={mobilePanel}')
  })

  it('AdminView reads shared state when embedded and local state when not', () => {
    // /admin renders <AdminView embedded />. Standalone use must keep working.
    expect(adminView).toContain('embedded && adminShell ? adminShell.mobilePanel : localMobileMode')
    expect(adminView).toContain('adminShell.setMobilePanel(on)')
    expect(adminView).toContain('setLocalMobileMode(on)')
  })

  it('the panel itself still renders on the shared flag', () => {
    expect(adminView).toMatch(/mobileMode \?[\s\S]{0,80}?<AdminMobilePanel/)
  })
})

describe('the floating WhatsApp button no longer covers the homepage search', () => {
  it('is hidden on the homepage on phones only', () => {
    expect(fab).toContain("pathname === '/'")
    expect(fab).toContain('hidden md:block')
  })

  it('still renders everywhere else', () => {
    // The scope is a single equality on '/', not a startsWith that would
    // also swallow every route beneath it.
    expect(fab).not.toContain("pathname.startsWith('/')")
    expect(fab).toMatch(/hiddenOnHomeMobile = pathname === '\/'/)
  })

  it('keeps its existing admin and checkout exclusions', () => {
    expect(fab).toContain("pathname.startsWith('/admin')")
    expect(fab).toContain("pathname.startsWith('/checkout')")
  })

  it('the homepage still offers WhatsApp another way', () => {
    // Hiding the FAB is only acceptable because these exist. If both were
    // ever removed the homepage would lose its ordering channel entirely.
    const hero = code('src/components/home/Hero.tsx')
    const cta = code('src/components/home/WhatsAppCTA.tsx')
    expect(hero).toContain('whatsappHref')
    expect(cta).toContain('buildWhatsAppUrl')

    const page = read('src/app/page.tsx')
    expect(page).toContain('<Hero')
    expect(page).toContain('WhatsAppCTA')
  })
})
