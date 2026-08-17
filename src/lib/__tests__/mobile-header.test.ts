/**
 * Mobile header — language pills (Phase 1).
 *
 * Before this work the header rendered no language control at all below
 * 768px: Navbar mounted `variant="navbar"` behind `hidden md:block`, and the
 * only way for a phone user to switch language was to open the burger menu
 * and scroll to the bottom. That is the regression these tests exist to stop
 * from coming back.
 *
 * The `pills` variant already existed in LanguageSelector but was mounted
 * nowhere, so nothing in the suite covered it. Assertions here are counted,
 * not merely present: `variant="pills"` appearing once somewhere in the tree
 * is not the same as it appearing in the header row.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

const selectorRaw = read('src/components/ui/LanguageSelector.tsx')
const navbarRaw = read('src/components/layout/Navbar.tsx')
const barRaw = read('src/components/layout/MobileSearchBar.tsx')
const hookRaw = read('src/hooks/use-scroll-direction.ts')
const overlayRaw = read('src/components/storefront/SearchOverlay.tsx')

/** Comments in both files legitimately *discuss* the rejected approaches —
 *  .btn-icon-small, the dropdown, the old burger-menu-only path. Assertions
 *  about what is actually rendered must not match that prose. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const selector = stripComments(selectorRaw)
const navbar = stripComments(navbarRaw)
const bar = stripComments(barRaw)
const hook = stripComments(hookRaw)
const overlay = stripComments(overlayRaw)

/** The JSX block for the pills variant only, so a class present on the
 *  dropdown or the mobile grid cannot satisfy a pills assertion. */
const pillsBlock = (() => {
  const start = selector.indexOf("if (variant === 'pills')")
  expect(start, 'pills variant block not found').toBeGreaterThan(-1)
  const end = selector.indexOf("if (variant === 'mobile')", start)
  expect(end, 'mobile variant block not found after pills').toBeGreaterThan(start)
  return selector.slice(start, end)
})()

const countOf = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1

describe('the header offers a language control on a phone', () => {
  it('mounts the pills variant visible below md', () => {
    expect(countOf(navbar, 'variant="pills"')).toBe(1)
    expect(navbar).toContain('<LanguageSelector variant="pills" className="md:hidden" />')
  })

  it('keeps the desktop dropdown untouched above md', () => {
    expect(countOf(navbar, 'variant="navbar"')).toBe(1)
    expect(navbar).toContain('<LanguageSelector variant="navbar" className="hidden md:block" />')
  })

  it('mounts both in the header row, above the burger panel', () => {
    const pills = navbar.indexOf('variant="pills"')
    const panel = navbar.indexOf('variant="mobile"')
    expect(pills).toBeGreaterThan(-1)
    expect(panel).toBeGreaterThan(-1)
    // The burger panel keeps its own grid; the pills must come first, in the
    // header row, not be a second copy inside the same panel.
    expect(pills).toBeLessThan(panel)
  })

  it('does not remove the language entry from the burger menu', () => {
    // Redundant on purpose: a shopper who has already opened the menu should
    // still find it there. Deleting it would be a silent downgrade.
    expect(countOf(navbar, 'variant="mobile"')).toBe(1)
  })
})

describe('the pills meet the spec', () => {
  it('is a labelled group, not a bare row of buttons', () => {
    expect(pillsBlock).toContain('role="group"')
    expect(pillsBlock).toContain("aria-label={t('nav.language')}")
  })

  it('uses a translated group label rather than hard-coded English', () => {
    expect(pillsBlock).not.toContain('aria-label="Choose language"')
  })

  it('reports pressed state per pill', () => {
    expect(pillsBlock).toContain('aria-pressed={active}')
  })

  it('paints the active pill with the AA-passing brand token', () => {
    // #A85D68 against white is 4.74:1. The decorative #B76E79 is 3.80:1 and
    // would fail as a text background.
    expect(pillsBlock).toContain('bg-fcs-brand-strong text-white')
    expect(pillsBlock).not.toMatch(/bg-fcs-brand(?!-)/)
  })

  it('paints the inactive pill with the AA-passing text token', () => {
    // #9B545F on #FAF8F6 is 5.18:1.
    expect(pillsBlock).toContain('text-fcs-brand-text')
  })

  it('never hard-codes a hex value', () => {
    expect(pillsBlock).not.toMatch(/#[0-9A-Fa-f]{6}/)
    // #C77B85 is 3.18:1 and is banned outright.
    expect(selectorRaw).not.toContain('#C77B85')
  })

  it('uses design-system radius and surface tokens, not raw Tailwind greys', () => {
    expect(pillsBlock).toContain('rounded-fcs-md')
    expect(pillsBlock).toContain('bg-fcs-surface')
    expect(pillsBlock).toContain('border-fcs-brand-strong')
    expect(pillsBlock).not.toContain('bg-gray-100')
  })

  it('renders the pill at the specified 36px with 13px bold text', () => {
    expect(pillsBlock).toContain('h-9')
    expect(pillsBlock).toContain('text-[13px]')
    expect(pillsBlock).toContain('font-bold')
  })

  it('keeps a 44px tap target on the button itself', () => {
    // globals.css forces min-width/min-height 44px on every button under
    // 768px; h-11 makes the height explicit rather than inherited, so the
    // target survives even if that global rule is ever scoped down.
    expect(pillsBlock).toContain('h-11')
    // The 36px pill must be the inner span, never the hit area.
    expect(pillsBlock).not.toContain('btn-icon-small')
  })

  it('honours reduced motion', () => {
    expect(pillsBlock).toContain('motion-reduce:transition-none')
  })

  it('keeps a visible keyboard focus ring', () => {
    expect(pillsBlock).toContain('focus-visible:ring-2')
    expect(pillsBlock).toContain('focus-visible:ring-fcs-brand-strong')
  })

  it('orders the pills Kinyarwanda first', () => {
    // LANGUAGES is alphabetical by code, which yields EN before RW. A
    // Kinyarwanda-first shop must not show English first.
    expect(selector).toContain('const PILL_LANGUAGES')
    expect(selector).toContain('a.code === DEFAULT_LANGUAGE')
    expect(pillsBlock).toContain('PILL_LANGUAGES.map')
    expect(pillsBlock).not.toContain('AVAILABLE_LANGUAGES.map')
  })
})

describe('the phone header carries no duplicate cart (Phase 2)', () => {
  it('hides the header cart below md, where BottomNav owns it', () => {
    const cart = navbar.slice(navbar.indexOf("router.push('/cart')"))
    const className = cart.slice(0, cart.indexOf('aria-label'))
    expect(className).toContain('hidden')
    expect(className).toContain('md:grid')
  })

  it('still shows a cart above md, where BottomNav is gone', () => {
    // BottomNav is md:hidden. Deleting the header cart outright rather than
    // gating it would have left desktop with no cart control anywhere.
    expect(read('src/components/layout/BottomNav.tsx')).toContain('md:hidden')
    expect(countOf(navbar, "router.push('/cart')")).toBe(1)
  })

  it('keeps the badge wired to real cart state', () => {
    expect(navbar).toContain('cartCount()')
    expect(navbar).toContain('bg-fcs-brand-strong')
  })
})

describe('the phone header layout matches the spec (Phase 2)', () => {
  it('puts the burger first, before the logo', () => {
    const burger = navbar.indexOf('setMobileOpen((open) => !open)')
    const logo = navbar.indexOf('aria-label={`${BUSINESS.tradingName} home`}')
    expect(burger).toBeGreaterThan(-1)
    expect(logo).toBeGreaterThan(-1)
    expect(burger).toBeLessThan(logo)
  })

  it('keeps the burger outside the right-hand icon group', () => {
    // Position in source order is not enough on its own: the burger could sit
    // early in the file yet still be nested in the ml-auto group and render
    // on the right. Assert it opens before that group begins.
    const burger = navbar.indexOf('setMobileOpen((open) => !open)')
    const rightGroup = navbar.indexOf('ml-auto flex shrink-0 items-center')
    expect(rightGroup).toBeGreaterThan(-1)
    expect(burger).toBeLessThan(rightGroup)
  })

  it('keeps the burger phone-only and 44px', () => {
    const burger = navbar.slice(navbar.indexOf('setMobileOpen((open) => !open)'))
    const className = burger.slice(0, burger.indexOf('aria-label'))
    expect(className).toContain('h-11 w-11')
    expect(className).toContain('md:hidden')
  })

  it('keeps the header 56px on a phone', () => {
    expect(navbar).toContain('h-14 max-w-7xl')
    expect(navbar).toContain('md:h-16')
  })

  it('spaces the right-hand icons by 8px on a phone', () => {
    expect(navbar).toContain('gap-2 md:gap-1')
  })

  it('caps an owner-uploaded logo at 32px on a phone', () => {
    expect(navbar).toContain('h-8 w-auto')
    expect(navbar).toContain('md:h-10')
  })

  it('uses the fcs-text token for chrome icons, never a raw hex', () => {
    // Counting >= n is not enough: swapping one button back to #1a1a1a still
    // leaves enough siblings to satisfy a threshold. Assert that no chrome
    // control carries the raw hex at all. The two remaining #1a1a1a in the
    // file are the desktop-only category strip, which this mobile phase does
    // not touch, so they are pinned by exact count instead.
    expect(countOf(navbar, 'text-[#1a1a1a]')).toBe(2)
    const strip = navbar.slice(navbar.indexOf("aria-label={t('nav.product_categories')}"))
    expect(countOf(strip, 'text-[#1a1a1a]')).toBe(2)
    // The mobile burger panel banner was bg-[#1a1a1a].
    expect(navbar).toContain('bg-fcs-text')
    expect(navbar).not.toContain('bg-[#1a1a1a]')
  })

  it('shows the live language in the burger panel footer, not a static RW', () => {
    // The panel hard-coded "RW", so it kept claiming Kinyarwanda after a
    // shopper switched to English.
    expect(navbar).toContain('{language.toUpperCase()}')
    expect(navbar).not.toContain('<Globe className="h-4 w-4" /> RW')
  })
})

describe('switching language', () => {
  it('does no work when the active language is tapped again', () => {
    expect(selector).toContain('if (nextLanguage === language) return')
  })

  it('announces the change to screen readers', () => {
    expect(selector).toContain("import { announce } from '@/components/a11y/LiveAnnouncer'")
    expect(selector).toContain('announce(resolveTranslation(nextLanguage, key))')
  })

  it('announces in the language being switched to, not the one being left', () => {
    // `t` from the hook still holds the outgoing language on the tick the
    // click fires, so resolving through it would announce in the wrong
    // language exactly when the user needs to understand the confirmation.
    expect(selector).toContain('resolveTranslation(nextLanguage,')
    expect(selector).not.toContain('announce(t(')
  })

  it('reuses the existing announcement copy for both languages', () => {
    expect(selector).toContain("rw: 'nav.kinyarwanda_selected'")
    expect(selector).toContain("en: 'nav.english_selected'")
  })

  it('goes through the shared context rather than reloading the page', () => {
    expect(selector).toContain('setLanguage(nextLanguage)')
    expect(selector).not.toContain('window.location.reload')
    expect(selector).not.toContain('router.refresh')
  })

  it('does not duplicate the context in a second component', () => {
    // The brief asked for a new LanguageToggle.tsx. The pills variant already
    // existed and already used the context, so extending it was correct;
    // a parallel component would be a second source of truth.
    expect(selector).toMatch(
      /import \{[^}]*\buseLanguage\b[^}]*\} from '@\/lib\/i18n\/LanguageContext'/,
    )
    expect(countOf(navbarRaw, 'LanguageToggle')).toBe(0)
  })
})

describe('the sticky mobile search bar (Phase 3)', () => {
  it('is mounted from the navbar, phones only', () => {
    // Matched with a trailing boundary: a bare '<MobileSearchBar' prefix also
    // matches '<MobileSearchBarAnythingElse', so a renamed or shadowed
    // component would slip through.
    expect(navbar).toMatch(/<MobileSearchBar\s/)
    expect(countOf(navbar, "import MobileSearchBar from '@/components/layout/MobileSearchBar'")).toBe(1)
    expect(bar).toContain('md:hidden')
  })

  it('sits below the header rather than under the viewport top', () => {
    // The header is h-14 (56px) on mobile. Pinning the bar to top:0 would
    // slide it underneath the header instead of beneath it.
    expect(bar).toContain('sticky')
    expect(bar).toContain("top: '3.5rem'")
  })

  it('is a sibling of the header, not a child of it', () => {
    // A sticky element nested inside another sticky element cannot pin itself
    // to the viewport independently.
    const close = navbar.indexOf('</header>')
    const mount = navbar.indexOf('<MobileSearchBar')
    expect(close).toBeGreaterThan(-1)
    expect(mount).toBeGreaterThan(close)
  })

  it('opens the existing overlay instead of adding a second text input', () => {
    // Two real inputs would mean two pieces of query state and, on Android, a
    // keyboard opening behind the overlay.
    expect(bar).not.toContain('<input')
    expect(bar).toContain('aria-haspopup="dialog"')
    expect(countOf(navbar, '<SearchOverlay')).toBe(1)
  })

  it('uses the translated placeholder, never hard-coded copy', () => {
    expect(bar).toContain("t('search.overlay_placeholder')")
    expect(bar).not.toContain('Shakisha')
    expect(bar).not.toContain('Search products')
  })

  it('keeps the placeholder above the AA contrast floor', () => {
    // A 50% tint of --fcs-text on --fcs-surface is 3.30:1 and fails AA.
    // --fcs-text-muted is 4.56:1 on the same background.
    expect(bar).toContain('text-fcs-text-muted')
    expect(bar).not.toContain('text-fcs-text/50')
  })

  it('uses solid tokens, because opacity modifiers do not compile here', () => {
    // The fcs palette maps to bare `var(--x)` with no <alpha-value> channel,
    // so `border-fcs-text/10` emits no CSS at all. Verified by running the
    // Tailwind CLI against these exact class names.
    expect(bar).not.toMatch(/(?:bg|text|border)-fcs-[a-z-]+\/\d/)
    expect(bar).toContain('border-fcs-border')
  })

  it('never hard-codes a hex', () => {
    expect(bar).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })

  it('keeps both controls at a 44px target', () => {
    expect(bar).toContain('min-h-11')
    expect(bar).toContain('h-11 w-11')
  })

  it('offers voice only when the browser really supports it', () => {
    expect(bar).toContain('voice.supported &&')
    // Capability probe, never a user-agent sniff.
    expect(bar).not.toMatch(/navigator\.userAgent/)
    expect(bar).toContain("useVoiceSearch")
  })

  it('puts voice one tap away by auto-starting the overlay microphone', () => {
    expect(bar).toContain('onOpenVoice')
    expect(navbar).toContain('autoStartVoice={searchVoice}')
    expect(overlay).toContain('autoStartVoice')
    expect(overlay).toContain('voice.start()')
  })

  it('clears the voice flag on close so a later plain open stays silent', () => {
    // Two distinct resets are required and counting them matters: asserting
    // mere presence passes even after one is deleted, because the other
    // satisfies it. One on overlay close, one on a plain (non-voice) open.
    expect(countOf(navbar, 'setSearchVoice(false)')).toBe(2)
    expect(countOf(navbar, 'setSearchVoice(true)')).toBe(1)
    const close = navbar.slice(navbar.indexOf('<SearchOverlay'))
    expect(close).toContain('setSearchVoice(false)')
  })

  it('guards auto-start on capability', () => {
    expect(overlay).toMatch(/if \(!open \|\| !autoStartVoice \|\| !voice\.supported\) return/)
  })
})

describe('scroll-away behaviour (Phase 4)', () => {
  it('hides on the way down and returns on the way up', () => {
    expect(bar).toContain('useScrollDirection')
    expect(bar).toContain('-translate-y-full')
    expect(bar).toContain('translate-y-0')
  })

  it('animates in 200ms with the real easing token', () => {
    // ease-fcs-quick does not exist in tailwind.config.ts; fcs-snap is the
    // only registered custom easing, so the spec's name would emit nothing.
    expect(bar).toContain('duration-200')
    expect(bar).toContain('ease-fcs-snap')
    expect(bar).not.toContain('ease-fcs-quick')
  })

  it('respects prefers-reduced-motion by staying put', () => {
    expect(bar).toContain('motion-reduce:transition-none')
    expect(bar).toContain('motion-reduce:translate-y-0')
  })

  it('never hides near the top of the page', () => {
    expect(hook).toContain('REVEAL_ABOVE = 100')
    expect(hook).toContain('const past = y > threshold')
    expect(hook).toContain("hidden: past && lastDirection === 'down'")
  })

  it('uses hysteresis so a resting finger cannot make it strobe', () => {
    expect(hook).toContain('DIRECTION_DELTA')
    expect(hook).toContain('Math.abs(travelled) >= DIRECTION_DELTA')
  })

  it('throttles with rAF and listens passively', () => {
    expect(hook).toContain('requestAnimationFrame')
    expect(hook).toContain('{ passive: true }')
    expect(hook).toContain('cancelAnimationFrame')
  })

  it('reads once on mount so a restored scroll position is correct', () => {
    expect(hook).toMatch(/read\(\)\s*\n\s*window\.addEventListener/)
  })

  it('bails out of redundant state updates', () => {
    // Without this a long scroll in one direction re-renders every frame.
    expect(hook).toContain('return previous')
  })

  it('removes its listener on unmount', () => {
    expect(hook).toContain("window.removeEventListener('scroll', onScroll)")
  })

  it('does not duplicate the existing useScrolled hook', () => {
    expect(hook).not.toContain('export function useScrolled')
    expect(read('src/hooks/use-scrolled.ts')).toContain('export function useScrolled')
  })
})
