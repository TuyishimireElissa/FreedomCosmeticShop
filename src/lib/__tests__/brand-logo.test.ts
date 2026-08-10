/**
 * FC monogram — inline SVG brand mark.
 *
 * The previous mark was a rose lotus flower rendered from PNGs. It was
 * replaced wholesale by the owner-supplied FC monogram: a rose serif F, a
 * gold crescent C whose negative space forms a woman's profile, and a
 * five-leaf branch.
 *
 * Geometry in the component was measured from the reference artwork by pixel
 * analysis, so these tests pin the measured values. A later "tidy up" that
 * rounds a radius or drops a coordinate would move the mark off-brand
 * silently, since nothing else in the build renders it.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

const logo = read('src/components/ui/logo.tsx')
/** Source with comments stripped. The file legitimately *documents* the
 *  rejected #C77B85 and the "no <img>" rule in prose; assertions about what
 *  the component actually renders must not match that explanation. */
const logoCode = logo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const brandMark = read('src/components/brand/BrandMark.tsx')
const navbar = read('src/components/layout/Navbar.tsx')
const footer = read('src/components/layout/Footer.tsx')
const sidebar = read('src/components/admin/AdminSidebar.tsx')

describe('the SVG is inline and self-contained', () => {
  it('renders an svg, never an img pointing at a file', () => {
    expect(logoCode).toContain('<svg')
    expect(logoCode).not.toContain('<img')
    expect(logoCode).not.toContain('next/image')
    expect(logoCode).not.toContain('.png')
  })

  it('keeps the reference viewBox so measurements stay verifiable', () => {
    // 429x317 is the source artwork's own size; every coordinate in the paths
    // is a direct pixel measurement from it.
    expect(logo).toContain('viewBox="0 0 429 317"')
  })

  it('has no animation', () => {
    for (const banned of ['<animate', 'animateTransform', 'animation:', 'transition']) {
      expect(logo, banned).not.toContain(banned)
    }
  })

  it('namespaces gradient ids per instance', () => {
    // Two logos on one page with a shared id make the second inherit the
    // first's paint.
    expect(logo).toContain('useId()')
    expect(logo).toContain('fcs-rose-${uid}')
    expect(logo).toContain('fcs-gold-${uid}')
  })
})

describe('colours are the measured values', () => {
  it('uses the sampled rose and gold gradients', () => {
    for (const stop of ['#DFA6A0', '#D07E7A', '#CA7370']) expect(logo, stop).toContain(stop)
    for (const stop of ['#D9B26A', '#C99B54', '#A8752D']) expect(logo, stop).toContain(stop)
  })

  it('never adopts the banned #C77B85', () => {
    // 3.18:1 on white. umweto-contrast.test.ts fails the build on it, and it
    // is not the reference colour either — that samples at #D07E7A.
    expect(logoCode).not.toContain('#C77B85')
  })
})

describe('measured geometry', () => {
  it('solves the C radii rather than guessing them', () => {
    // A circle through both terminals (272,96) and (272,284) with its
    // leftmost point at x157 requires r=96; the inner edge 24px in requires
    // r=72. Guessed values of 78/54 and 57/33 were too small to span 188px,
    // so the renderer scaled them and shifted the crescent 21px right.
    expect(logo).toContain('A96 96 0 1 0 272 284')
    expect(logo).toContain('A72 72 0 1 1 272 121')
  })

  it('draws the F without a middle crossbar', () => {
    // Scanning the reference at y150-174 finds only the stem (118-149) and
    // the profile (202-214). Nothing bridges them.
    expect(logo).toContain('M101 31 H251 V59 H149 V262')
  })

  it('cuts the jaw as a hard corner', () => {
    // The reference drops from x237 to x221 between y202 and y203 — a
    // near-vertical edge, not a curve. Modelling it as a curve left the face
    // 27px too wide.
    expect(logo).toContain('L 220 203')
    expect(logo).toContain('L 237 202')
  })

  it('keeps the leaf branch inside the measured bounds', () => {
    // Reference leaves span x271-361. An earlier pass overshot to x389.
    const leafCoords = [...logo.matchAll(/M(\d{3}) \d{3} q/g)].map((m) => Number(m[1]))
    expect(leafCoords.length).toBeGreaterThan(0)
    for (const x of leafCoords) expect(x, `leaf starts at x${x}`).toBeLessThan(362)
  })
})

describe('small sizes drop unreadable detail', () => {
  it('simplifies at or below 32px', () => {
    // At 24px the five leaves and the facial profile collapse into noise.
    expect(logo).toContain('const simplified = height <= 32')
    expect(logo).toContain('{!simplified && (')
  })

  it('exposes the four sizes the design system asks for', () => {
    for (const pair of ['sm: 24', 'md: 32', 'lg: 40', 'xl: 120']) expect(logo).toContain(pair)
  })
})

describe('accessibility', () => {
  it('is a labelled image by default and hidden when decorative', () => {
    expect(logo).toContain("role={decorative ? 'presentation' : 'img'}")
    expect(logo).toContain('aria-hidden={decorative || undefined}')
    expect(logo).toContain('<title>{label}</title>')
  })

  it('is never focusable', () => {
    expect(logo).toContain('focusable="false"')
  })
})

describe('every brand surface renders the monogram', () => {
  it('the header shows a simplified mark on phones and the full mark above md', () => {
    expect(navbar).toContain('<Logo size="md"')
    expect(navbar).toContain('<Logo size="lg"')
    expect(navbar).not.toContain('/logo-icon.png')
    expect(navbar).not.toContain('/logo.png')
  })

  it('the footer and admin sidebar show it', () => {
    expect(footer).toContain('<Logo size="sm"')
    expect(footer).not.toContain('/logo-icon.png')
    expect(sidebar).toContain('<Logo size="sm"')
    expect(sidebar).not.toContain('/logo-icon.png')
  })

  it('BrandMark routes its eleven call sites through the same SVG', () => {
    // auth x3, account, checkout, error, loading, 404, admin header, invoices.
    expect(brandMark).toContain("from '@/components/ui/logo'")
    expect(brandMark).not.toContain('next/image')
    expect(brandMark).not.toContain('/logo-icon.png')
    expect(brandMark).not.toContain('/logo-badge.png')
  })

  it('BrandMark keeps its pixel-size API so no call site had to change', () => {
    expect(brandMark).toContain('size = 40')
    expect(brandMark).toContain("variant?: BrandMarkVariant")
    expect(brandMark).toContain('priority?: boolean')
  })

  it('still honours an admin-uploaded logo override', () => {
    // StoreSettings.logoUrl beats the built-in mark when the owner sets one.
    expect(navbar).toContain('settings?.logoUrl ?')
  })
})
