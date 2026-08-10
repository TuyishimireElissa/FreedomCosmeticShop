/**
 * Warm Brutalism — Phase 1 tokens and shell.
 *
 * The contrast assertions below recompute WCAG ratios from the hex values in
 * globals.css rather than trusting a comment. Three colours from the brief
 * were rejected for failing AA and one existing token was upgraded; without a
 * live calculation, any of them could silently drift back.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/app/globals.css', 'utf8')
const tailwind = readFileSync('tailwind.config.ts', 'utf8')
const navbar = readFileSync('src/components/layout/Navbar.tsx', 'utf8')
const skeleton = readFileSync('src/components/ui/SkeletonCard.tsx', 'utf8')
const hook = readFileSync('src/hooks/use-scrolled.ts', 'utf8')

/** Value of a CSS custom property from the :root block. */
function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`))
  return match ? match[1].trim() : ''
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE = '#FFFFFF'

describe('new tokens exist and are wired to Tailwind', () => {
  it.each([
    'fcs-surface-elevated',
    'fcs-surface-muted',
    'fcs-border-subtle',
    'fcs-urgent',
    'fcs-info',
    'fcs-whatsapp-pill',
    'fcs-transition-snap',
  ])('defines --%s', (name) => {
    expect(token(name), name).not.toBe('')
  })

  it.each([
    'surface-elevated',
    'surface-muted',
    'border-subtle',
    'urgent',
    'info',
    'whatsapp-pill',
  ])('maps %s into the fcs colour scale', (name) => {
    // Hyphenated keys need quoting in the config object; bare ones do not.
    const quoted = `'${name}': 'var(--fcs-${name})'`
    const bare = `${name}: 'var(--fcs-${name})'`
    expect(tailwind.includes(quoted) || tailwind.includes(bare), name).toBe(true)
  })

  it('exposes the snap easing as a utility', () => {
    expect(tailwind).toContain("'fcs-snap': 'var(--fcs-transition-snap)'")
    expect(token('fcs-transition-snap')).toBe('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
  })

  it('stays in the fcs namespace — no parallel um-* system', () => {
    expect(css).not.toMatch(/--um-[a-z]/)
    expect(tailwind).not.toMatch(/'um-[a-z]/)
  })
})

describe('every text-bearing token meets WCAG AA', () => {
  it.each([
    ['fcs-urgent', 4.5],
    ['fcs-info', 4.5],
    ['fcs-whatsapp-pill', 4.5],
    ['fcs-success', 4.5],
    ['fcs-error', 4.5],
  ])('%s reaches %s:1 against white', (name, minimum) => {
    const ratio = contrast(token(name), WHITE)
    expect(ratio, `${name} = ${token(name)} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimum)
  })

  it('rejects the three brief values that failed AA', () => {
    // #27AE60 2.87:1, #2980B9 4.30:1, #1F8A4C 4.38:1 — all below 4.5:1, and
    // all mid-tone, so they fail as text AND as a fill under white text.
    // They may appear in comments explaining the rejection; what matters is
    // that no token is *assigned* one of them.
    // Annotated because `String.match` returns RegExpMatchArray | null, and
    // the ?? [] fallback narrows the empty case to never[] without it.
    const declarations: string[] = css.match(/--fcs-[a-z-]+:\s*[^;]+;/g) ?? []
    for (const rejected of ['#27AE60', '#2980B9', '#1F8A4C']) {
      expect(contrast(rejected, WHITE)).toBeLessThan(4.5)
      const adopted = declarations.filter((line) => line.toUpperCase().includes(rejected))
      expect(adopted, `${rejected} assigned in: ${adopted.join(' ')}`).toEqual([])
    }
  })

  it('did not downgrade the pre-existing success token', () => {
    // It was #2D8A4E at 4.32:1 — already short of AA. The brief would have
    // taken it to 2.87:1; it went up instead.
    expect(contrast(token('fcs-success'), WHITE)).toBeGreaterThan(contrast('#2D8A4E', WHITE))
  })

  it('keeps body text readable on the new warm surfaces', () => {
    for (const surface of ['fcs-surface-elevated', 'fcs-surface-muted']) {
      const ratio = contrast(token('fcs-text'), token(surface))
      expect(ratio, `${surface} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('white text is legible on every solid CTA fill', () => {
    for (const fill of ['fcs-urgent', 'fcs-whatsapp-pill', 'fcs-brand-strong']) {
      const ratio = contrast(WHITE, token(fill))
      expect(ratio, `white on ${fill} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('header elevates on scroll', () => {
  it('reacts to scroll without abandoning sticky positioning', () => {
    expect(navbar).toContain('useScrolled')
    expect(navbar).toContain('sticky top-0 z-50')
    expect(navbar).toContain('shadow-fcs-2')
  })

  it('keeps the background opaque so scrolled content never shows through', () => {
    // Fading the background would put page text behind the header and break
    // contrast unpredictably; only border and shadow animate.
    expect(navbar).toContain('bg-white/95')
    expect(navbar).toContain('transition-[border-color,box-shadow]')
  })

  it('respects reduced motion', () => {
    expect(navbar).toContain('motion-reduce:transition-none')
  })

  it('throttles with rAF, listens passively, and reads once on mount', () => {
    expect(hook).toContain('requestAnimationFrame')
    expect(hook).toContain('{ passive: true }')
    expect(hook).toContain('cancelAnimationFrame')
    // Without an initial read, a page restored mid-scroll renders flat.
    expect(hook).toMatch(/read\(\)\s*\n\s*window\.addEventListener/)
  })

  it('still shows the bag count', () => {
    expect(navbar).toContain('cartCount()')
  })
})

describe('skeletons', () => {
  it('build on the shared primitive rather than a second animation', () => {
    expect(skeleton).toContain("from '@/components/ui/skeleton'")
    expect(skeleton).not.toContain('animate-pulse')
  })

  it('mirrors the real card so nothing jumps when data lands', () => {
    expect(skeleton).toContain('aspect-[4/5]')
    expect(skeleton).toContain('rounded-fcs-md')
  })

  it('announces the grid once, not once per card', () => {
    expect(skeleton).toContain('role="status"')
    expect(skeleton).toContain('aria-busy="true"')
    expect(skeleton.match(/aria-hidden="true"/g)?.length).toBe(1)
  })

  it('requires a caller-supplied label instead of hard-coding English', () => {
    expect(skeleton).toContain('label: string')
    expect(skeleton).not.toMatch(/aria-label="[A-Za-z]/)
  })
})

describe('existing shell components were extended, not duplicated', () => {
  it('keeps one floating WhatsApp button', () => {
    // ui/WhatsAppButton.tsx is mounted globally in SiteChrome and already has
    // six tests covering hidden-on-admin, link targets and touch size.
    const chrome = readFileSync('src/components/layout/SiteChrome.tsx', 'utf8')
    expect(chrome).toContain('<WhatsAppButton />')
    expect(() => readFileSync('src/components/ui/FloatingWhatsApp.tsx', 'utf8')).toThrow()
  })

  it('leaves the footer free of a newsletter capture', () => {
    const footer = readFileSync('src/components/layout/Footer.tsx', 'utf8')
    for (const term of ['newsletter', 'subscribe', 'Subscribe']) {
      expect(footer).not.toContain(term)
    }
    expect(footer).toContain('ACCEPTED_PAYMENTS')
  })
})
