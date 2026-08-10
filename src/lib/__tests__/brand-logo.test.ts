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

describe('geometry is vectorised from the artwork, not hand-drawn', () => {
  /** Every coordinate pair in a path's `d` string. */
  function coords(d: string): Array<[number, number]> {
    const numbers = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
    const points: Array<[number, number]> = []
    for (let i = 0; i + 1 < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]])
    return points
  }

  function constant(name: string): string {
    const marker = `const ${name} = '`
    const start = logo.indexOf(marker) + marker.length
    return logo.slice(start, logo.indexOf("'", start))
  }

  /**
   * Bounding box of the ANCHOR points only.
   *
   * A cubic path is `M anchor (C c1 c2 anchor)*`, so every third point after
   * the move is on the curve and the other two are control handles that
   * legitimately sit outside the shape — for the F they reach x73 against a
   * true left edge of x98. Measuring all points would compare the wrong
   * numbers to the reference bbox.
   */
  function bounds(d: string) {
    const points = coords(d)
    // Indices 0, 3, 6, 9 ... are on-curve; the two between each pair are handles.
    const anchors = points.filter((_, i) => i % 3 === 0)
    const xs = anchors.map((p) => p[0])
    const ys = anchors.map((p) => p[1])
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  }

  it('carries traced Bezier paths, not hand-written arcs and line commands', () => {
    // The hand-drawn version used A/H/V/q shorthand. Traced output is all
    // cubic C segments, which is how a contour fit comes out.
    for (const name of ['F_PATH', 'C_PATH', 'PROFILE_PATH']) {
      const d = constant(name)
      expect(d.length, `${name} looks too short to be a traced contour`).toBeGreaterThan(600)
      expect(d, name).toMatch(/^M[\d.]+ [\d.]+ C/)
      expect(d, `${name} still uses arc shorthand`).not.toMatch(/\bA\d/)
    }
  })

  it('places the F where the reference has it', () => {
    // Reference F occupies x98-252, y32-283.
    const b = bounds(constant('F_PATH'))
    expect(b.x0).toBeGreaterThanOrEqual(95)
    expect(b.x1).toBeLessThanOrEqual(256)
    expect(b.y0).toBeGreaterThanOrEqual(28)
    expect(b.y1).toBeLessThanOrEqual(288)
  })

  it('places the C where the reference has it', () => {
    // Reference crescent spans x157-268 once the leaf branch is excluded.
    const b = bounds(constant('C_PATH'))
    expect(b.x0).toBeGreaterThanOrEqual(152)
    expect(b.x1).toBeLessThanOrEqual(305)
    expect(b.y0).toBeGreaterThanOrEqual(88)
    expect(b.y1).toBeLessThanOrEqual(298)
  })

  it('places the profile inside the crescent', () => {
    // Reference profile spans x199-266, y116-265 — entirely within the C.
    const b = bounds(constant('PROFILE_PATH'))
    expect(b.x0).toBeGreaterThanOrEqual(190)
    expect(b.x1).toBeLessThanOrEqual(275)
    expect(b.y0).toBeGreaterThanOrEqual(110)
    expect(b.y1).toBeLessThanOrEqual(272)
  })

  it('keeps the leaf branch inside the measured bounds', () => {
    // Reference leaves span x268-362, y221-304. An early hand-drawn pass
    // overshot to x389.
    const marker = 'const LEAF_PATHS = ['
    const block = logo.slice(logo.indexOf(marker), logo.indexOf(']', logo.indexOf(marker)))
    const paths = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(paths.length).toBeGreaterThanOrEqual(2)
    for (const d of paths) {
      const b = bounds(d)
      expect(b.x1, `leaf reaches x${b.x1}`).toBeLessThanOrEqual(368)
      expect(b.y1, `leaf reaches y${b.y1}`).toBeLessThanOrEqual(310)
    }
  })

  it('can be regenerated from the artwork', () => {
    // The paths are generated output. Without the script and the reference
    // committed, a future artwork change would mean hand-tracing again.
    expect(() => readFileSync('brand-src/vectorise-logo.py', 'utf8')).not.toThrow()
    expect(() => readFileSync('brand-src/logo-reference.png')).not.toThrow()
    expect(logo).toContain('vectorise-logo.py')
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
