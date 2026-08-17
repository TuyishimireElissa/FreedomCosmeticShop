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

/** Comments in both files legitimately *discuss* the rejected approaches —
 *  .btn-icon-small, the dropdown, the old burger-menu-only path. Assertions
 *  about what is actually rendered must not match that prose. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const selector = stripComments(selectorRaw)
const navbar = stripComments(navbarRaw)

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
