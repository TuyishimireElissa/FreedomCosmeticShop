import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The WhatsApp pill must stay readable while it is being pressed.
 *
 * `--fcs-whatsapp-pill` #1E874A is 4.55:1 against white and exists precisely
 * because `--fcs-whatsapp` #25D366 is only 1.98:1. But four components paired
 * the pill with `hover:bg-fcs-whatsapp-hover` #128C7E, which is **4.14:1** —
 * so the label dropped below AA at the exact moment of interaction. Rest state
 * passed every check; nobody measures a hover.
 *
 * `--fcs-whatsapp-pill-hover` #17703D is 6.14:1 and darker than the pill, so
 * the press still reads as a press.
 *
 * These assertions sweep the whole component tree rather than naming files, so
 * a component added later cannot reintroduce the pairing.
 */

const SRC = resolve(process.cwd(), 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (full.endsWith('.tsx')) out.push(full)
  }
  return out
}

const tsxFiles = walk(SRC)

/** WCAG 2.1 relative luminance and contrast ratio. */
function channel(value: number) {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
function luminance(hex: string) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)]
  const [hi, lo] = x > y ? [x, y] : [y, x]
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE = '#FFFFFF'
const PILL = '#1E874A'
const PILL_HOVER = '#17703D'
const WHATSAPP_HOVER = '#128C7E'

describe('the contrast maths behind the tokens', () => {
  it('confirms the pill passes AA at rest', () => {
    expect(contrast(WHITE, PILL)).toBeGreaterThanOrEqual(4.5)
  })

  it('confirms the old hover partner genuinely failed', () => {
    // If this ever passes, the token changed and the rule below is moot.
    expect(contrast(WHITE, WHATSAPP_HOVER)).toBeLessThan(4.5)
  })

  it('confirms the new hover passes AA and is darker than the pill', () => {
    expect(contrast(WHITE, PILL_HOVER)).toBeGreaterThanOrEqual(4.5)
    expect(luminance(PILL_HOVER)).toBeLessThan(luminance(PILL))
  })
})

describe('no component pairs the pill with a failing hover', () => {
  it('finds no bg-fcs-whatsapp-pill line that also uses hover:bg-fcs-whatsapp-hover', () => {
    const offenders: string[] = []
    for (const file of tsxFiles) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (line.includes('bg-fcs-whatsapp-pill') && line.includes('hover:bg-fcs-whatsapp-hover')) {
          offenders.push(`${file.replace(process.cwd() + '/', '')}:${index + 1}`)
        }
      })
    }
    expect(offenders, `these lines drop to 4.14:1 on hover: ${offenders.join(', ')}`).toEqual([])
  })

  it('still finds pill buttons, so the sweep is not vacuously passing', () => {
    // A sweep that matches nothing would pass even if every button were wrong.
    const withPill = tsxFiles.filter((file) => readFileSync(file, 'utf8').includes('bg-fcs-whatsapp-pill'))
    expect(withPill.length).toBeGreaterThanOrEqual(4)
  })

  it('defines both tokens in the stylesheet and exposes them to Tailwind', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
    expect(css).toContain('--fcs-whatsapp-pill:')
    expect(css).toContain('--fcs-whatsapp-pill-hover:')
    expect(css).toContain(PILL_HOVER)
    const config = readFileSync(resolve(process.cwd(), 'tailwind.config.ts'), 'utf8')
    expect(config).toContain("'whatsapp-pill-hover': 'var(--fcs-whatsapp-pill-hover)'")
  })
})
