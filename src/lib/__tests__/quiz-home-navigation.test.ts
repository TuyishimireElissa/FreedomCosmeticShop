import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const home = read('src/app/page.tsx')
const banner = read('src/components/home/QuizBanner.tsx')
const nav = read('src/components/layout/Navbar.tsx')

describe('quiz and bundle entry points', () => {
  it('adds the quiz banner without replacing existing trust, reviews, or WhatsApp sections', () => {
    for (const component of ['<TrustSection />', '<ReviewsSection />', '<QuizBanner />', '<WhatsAppCTA />']) expect(home).toContain(component)
    expect(home.indexOf('<QuizBanner />')).toBeGreaterThan(home.indexOf('<TrustSection />'))
    expect(home.indexOf('<QuizBanner />')).toBeLessThan(home.indexOf('<WhatsAppCTA />'))
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
