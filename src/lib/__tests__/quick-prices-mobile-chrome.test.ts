import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const bottomNav = readFileSync(resolve(process.cwd(), 'src/components/layout/BottomNav.tsx'), 'utf8')
const waButton = readFileSync(resolve(process.cwd(), 'src/components/ui/WhatsAppButton.tsx'), 'utf8')

/**
 * The father's quick-prices page is a single-task mobile form, like /checkout:
 * the only action that matters is the fixed "Ohereza ibiciro" submit bar. The
 * shop bottom nav (z-50, fixed) and the floating WhatsApp bubble (z-40, fixed)
 * both sit on top of that bar on phones — the submit button becomes invisible
 * and the tap lands on the green WhatsApp bubble instead. Both must be hidden
 * there so the bar shows alone, full width, like desktop.
 */
describe('quick-prices page: no chrome over the submit bar', () => {
  it('hides the mobile bottom nav on /quick-prices like /admin and /checkout', () => {
    expect(bottomNav).toContain("const hideOn = ['/admin', '/checkout', '/quick-prices']")
  })

  it('hides the floating WhatsApp bubble on /quick-prices like /admin and /checkout', () => {
    expect(waButton).toContain("pathname.startsWith('/quick-prices')")
    expect(waButton).toContain("pathname.startsWith('/admin')")
    expect(waButton).toContain("pathname.startsWith('/checkout')")
  })

  it('hides by prefix, so the token-carrying query string never defeats the gate', () => {
    // The page is reached as /quick-prices?token=..., not a bare path.
    expect(bottomNav).toContain('pathname.startsWith(path)')
    expect(waButton).toContain("pathname.startsWith('/quick-prices')")
  })
})
