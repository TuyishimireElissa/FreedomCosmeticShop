import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const layout = read('src/app/layout.tsx')
const chrome = read('src/components/layout/SiteChrome.tsx')
const skipLink = read('src/components/a11y/SkipToContent.tsx')
const focusTrap = read('src/hooks/useFocusTrap.ts')
const css = read('src/app/globals.css')
const languageContext = read('src/lib/i18n/LanguageContext.tsx')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('WCAG foundation', () => {
  it('provides the first keyboard bypass link through the language provider', () => {
    const providersStart = layout.indexOf('<Providers>')
    const skipPosition = layout.indexOf('<SkipToContent />')
    const sitePosition = layout.indexOf('<SiteChrome>')
    expect(providersStart).toBeGreaterThan(-1)
    expect(skipPosition).toBeGreaterThan(providersStart)
    expect(skipPosition).toBeLessThan(sitePosition)
    expect(skipLink).toContain('href="#main-content"')
    expect(skipLink).toContain("t('accessibility.skip_to_content')")
  })

  it('gives every SiteChrome route a focusable skip target without adding another main landmark', () => {
    expect(chrome.match(/id="main-content"/g)).toHaveLength(2)
    expect(chrome.match(/tabIndex=\{-1\}/g)).toHaveLength(2)
    expect(chrome.match(/<main/g)).toHaveLength(1)
    expect(layout).not.toContain('<main id="main-content"')
  })

  it('keeps document language synchronized and provides RW and EN skip copy', () => {
    expect(languageContext).toContain("document.documentElement.lang = language === 'rw' ? 'rw' : 'en'")
    expect(english).toContain("skip_to_content: 'Skip to main content'")
    expect(kinyarwanda).toContain("skip_to_content: 'Simbukira ku bikubiye ku rupapuro', // verified-rw")
  })

  it('adds visible keyboard focus and sticky-interface offsets', () => {
    expect(css).toContain(':focus-visible')
    expect(css).toContain('outline: 3px solid #B76E79')
    expect(css).toContain("[role='button']:focus-visible")
    expect(css).toContain('scroll-padding-block-start: 8rem')
    expect(css).toContain('scroll-padding-block-end: 6rem')
  })

  it('honors reduced motion and practical mobile targets', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-duration: 0.01ms !important')
    expect(css).toContain('@media (max-width: 768px)')
    expect(css).toContain('min-width: 44px')
    expect(css).toContain('min-height: 44px')
  })

  it('provides tab containment, Escape handling, and focus restoration for custom modals', () => {
    expect(focusTrap).toContain("event.key === 'Escape'")
    expect(focusTrap).toContain("event.key !== 'Tab'")
    expect(focusTrap).toContain('last.focus()')
    expect(focusTrap).toContain('first.focus()')
    expect(focusTrap).toContain('previousFocusRef.current?.focus()')
    expect(focusTrap).toContain("!element.closest('[inert]')")
  })
})
