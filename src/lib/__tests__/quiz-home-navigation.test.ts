import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const home = read('src/app/page.tsx')
const banner = read('src/components/home/QuizBanner.tsx')
const nav = read('src/components/layout/Navbar.tsx')

describe('quiz and bundle entry points', () => {
  it('keeps the trust, reviews and WhatsApp sections on the homepage', () => {
    for (const component of ['<TrustSection />', '<ReviewsSection />', '<WhatsAppCTA />']) expect(home).toContain(component)
    expect(home.indexOf('<TrustSection />')).toBeLessThan(home.indexOf('<WhatsAppCTA />'))
  })

  it('does not render the quiz banner while the quiz cannot return results', () => {
    // The quiz filters on `ingredients` (1 of 101 products) and `skinType`
    // (22 of 101), so it answers most inputs with nothing. Inviting customers
    // into that from the homepage reads as a broken shop. The component and
    // the /quiz route are deliberately left intact for when content exists.
    expect(home).not.toMatch(/^\s*<QuizBanner \/>/m)
    expect(home).toContain('QuizBanner intentionally not rendered')
  })
  it('uses translated, non-urgent quiz banner copy', () => {
    for (const key of ['home.quiz_title', 'home.quiz_subtitle', 'home.quiz_cta', 'home.quiz_time']) expect(banner).toContain(`t('${key}')`)
    expect(banner).not.toContain('60 seconds')
  })
  it('adds desktop and mobile links for both quiz and bundles', () => {
    expect(nav.match(/router\.push\('\/quiz'\)/g)?.length).toBeGreaterThanOrEqual(2)
    expect(nav.match(/router\.push\('\/bundles'\)/g)?.length).toBeGreaterThanOrEqual(2)
    expect(nav).toContain("t('nav.quiz')")
    expect(nav).toContain("t('nav.bundles')")
  })
})
