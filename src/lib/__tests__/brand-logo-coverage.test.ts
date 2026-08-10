/**
 * Logo coverage across the site.
 *
 * `brand-logo.test.ts` pins the mark's *geometry and colour*. This file pins
 * *where it appears*, which is a separate failure mode: the artwork can be
 * perfect and still be missing from half the shop, or — as was live until this
 * change — a leftover starter-template logo can be served from the domain.
 *
 * The audit that produced this list is in LOGO_EMBED_AUDIT.md.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { logoSvgMarkup } from '@/lib/brand-logo-svg'
import { C_PATH, F_PATH, LEAF_PATHS, PROFILE_PATH } from '@/lib/brand-logo-paths'

const read = (path: string) => readFileSync(path, 'utf8')

/**
 * Source with comments stripped.
 *
 * Every file touched here *documents* what it replaced — "was a Sparkles
 * glyph", "was the letter Z". A naive `not.toContain('Sparkles')` matches the
 * explanation and fails on a correct file. Strip prose before asserting on
 * what the code actually does.
 */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

describe('the stale template logo is gone from the public directory', () => {
  const publicSvg = read('public/logo.svg')

  it('public/logo.svg is the FC monogram, not the starter-template Z', () => {
    // It was a charcoal rounded square with a white Z, served live and used
    // by the card payment modal as the merchant logo.
    expect(publicSvg).not.toContain('st194')
    expect(publicSvg).not.toContain('z-breathe')
    expect(publicSvg).not.toContain('#2D2D2D')
  })

  it('carries the same traced geometry as the component', () => {
    // Not "contains some path data" — the *exact* F and C from the component.
    // A hand-drawn replacement would pass a looser check.
    expect(publicSvg).toContain(F_PATH)
    expect(publicSvg).toContain(C_PATH)
    expect(publicSvg).toContain(PROFILE_PATH)
    for (const leaf of LEAF_PATHS) expect(publicSvg).toContain(leaf)
  })

  it('carries both brand colours', () => {
    for (const stop of ['#DFA6A0', '#D07E7A', '#CA7370']) expect(publicSvg).toContain(stop)
    for (const stop of ['#D9B26A', '#C99B54', '#A8752D']) expect(publicSvg).toContain(stop)
  })

  it('names itself for screen readers, having no surrounding text', () => {
    expect(publicSvg).toContain('role="img"')
    expect(publicSvg).toContain('<title>Freedom Cosmetic Shop</title>')
  })

  it('is generated, so it cannot drift from the component again', () => {
    const script = read('brand-src/render-mark.mjs')
    expect(script).toContain("join(here, '..', 'public', 'logo.svg')")
  })
})

describe('the SVG markup helper mirrors the component', () => {
  it('emits the same traced paths the component renders', () => {
    const markup = logoSvgMarkup()
    expect(markup).toContain(F_PATH)
    expect(markup).toContain(C_PATH)
  })

  it('drops the fine detail when simplified, exactly as the component does', () => {
    const simple = logoSvgMarkup({ simple: true })
    expect(simple).toContain(F_PATH)
    expect(simple).toContain(C_PATH)
    expect(simple).not.toContain(PROFILE_PATH)
    for (const leaf of LEAF_PATHS) expect(simple).not.toContain(leaf)
  })

  it('namespaces gradient ids so two marks in one document cannot collide', () => {
    const a = logoSvgMarkup({ idPrefix: 'one' })
    const b = logoSvgMarkup({ idPrefix: 'two' })
    expect(a).toContain('id="one-rose"')
    expect(a).toContain('url(#one-rose)')
    expect(b).toContain('id="two-gold"')
    expect(a).not.toContain('two-')
  })

  it('keeps the reference aspect ratio at any height', () => {
    // 429:317. A square logo would stretch the F.
    for (const height of [24, 46, 120]) {
      const markup = logoSvgMarkup({ height })
      expect(markup).toContain(`height="${height}"`)
      expect(markup).toContain(`width="${Math.round(height * (429 / 317))}"`)
    }
  })

  it('hides itself from screen readers when the label is empty', () => {
    const decorative = logoSvgMarkup({ label: '' })
    expect(decorative).toContain('aria-hidden="true"')
    expect(decorative).not.toContain('<title>')

    const named = logoSvgMarkup({ label: 'Freedom Cosmetic Shop' })
    expect(named).toContain('aria-label="Freedom Cosmetic Shop"')
    expect(named).not.toContain('aria-hidden')
  })
})

describe('surfaces that used a generic icon now use the mark', () => {
  it('the admin login screen shows the monogram, not a Sparkles glyph', () => {
    const source = code('src/components/admin/AdminLoginScreen.tsx')
    expect(source).toContain('<BrandMark')
    expect(source).not.toContain('Sparkles')
  })

  it('the admin header falls back to the monogram, not a Shield glyph', () => {
    const source = code('src/components/admin/AdminView.tsx')
    // Shield is used legitimately elsewhere in this file, so assert on the
    // fallback branch: the uploaded-logo ternary must land on BrandMark.
    expect(source).toMatch(/adminSettings\?\.logoUrl \?[\s\S]{0,400}?<BrandMark/)
  })

  it('the logo uploader previews the real default instead of bare text', () => {
    const source = code('src/components/admin/LogoUploader.tsx')
    // It told the owner the shop had no logo when the monogram is the default.
    expect(source).toMatch(/currentLogo \?[\s\S]{0,400}?<BrandMark/)
  })

  it('the printed invoice embeds the mark from the shared helper', () => {
    const source = code('src/components/admin/InvoicePrinter.tsx')
    expect(source).toContain('logoSvgMarkup(')
    // Not a hand-pasted copy of the path data.
    expect(source).not.toContain('M249.9 32.1')
  })

  it('the invoice keeps its colours when printed in save-ink mode', () => {
    const source = read('src/components/admin/InvoicePrinter.tsx')
    expect(source).toContain('print-color-adjust: exact')
  })
})

describe('customer-facing pages that had no mark now carry one', () => {
  it('the shared information shell brands about, privacy, terms, shipping and returns', () => {
    const shell = code('src/components/layout/InformationPage.tsx')
    expect(shell).toContain('<Logo')
    expect(shell).toContain("from '@/components/ui/logo'")

    // The five pages must actually route through this shell, or the edit
    // brands nothing.
    for (const page of [
      'src/app/privacy/page.tsx',
      'src/app/returns/page.tsx',
      'src/app/shipping/page.tsx',
      'src/app/terms/page.tsx',
      'src/components/layout/AboutPageClient.tsx',
    ]) {
      expect(read(page), page).toContain('InformationPage')
    }
  })

  it('the contact page shows it', () => {
    expect(code('src/components/contact/ContactPageClient.tsx')).toContain('<Logo')
  })

  it('the track-order page shows it instead of a generic parcel icon', () => {
    const source = code('src/components/storefront/TrackOrderView.tsx')
    expect(source).toContain('<Logo')
    // The heading previously led with <Package className="h-7 w-7 ...">.
    expect(source).not.toContain('h-7 w-7 text-primary')
  })
})

describe('decorative instances do not repeat the brand name to screen readers', () => {
  it.each([
    ['src/components/layout/InformationPage.tsx', 'Logo'],
    ['src/components/contact/ContactPageClient.tsx', 'Logo'],
    ['src/components/storefront/TrackOrderView.tsx', 'Logo'],
  ])('%s marks its logo decorative', (path) => {
    const source = code(path)
    // Every one of these sits beside text naming the shop.
    expect(source).toMatch(/<Logo[^>]*label=""/)
  })

  it.each([
    'src/components/admin/AdminLoginScreen.tsx',
    'src/components/admin/AdminView.tsx',
  ])('%s marks its BrandMark decorative', (path) => {
    expect(code(path)).toMatch(/<BrandMark[^>]*alt=""/)
  })
})
