import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Umweto extension guards.
 *
 * The brief proposed #C77B85 as a "WCAG AA compliant" primary. Computing it
 * gives 3.18:1 against white — worse than the colour it would have replaced.
 * These tests keep the corrected mapping in place:
 *   filled buttons -> --fcs-brand-strong  #A85D68  4.74:1  AA
 *   text and links -> --fcs-brand-text    #9B545F  5.49:1  AA
 *   decorative     -> --fcs-brand         #B76E79  never behind white text
 */
const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

function luminance(hex: string) {
  const v = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('Umweto contrast guarantees', () => {
  it('filled buttons pass AA for normal text', () => {
    expect(css).toContain('--fcs-brand-strong: #A85D68')
    expect(contrast('#FFFFFF', '#A85D68')).toBeGreaterThanOrEqual(4.5)
  })

  it('brand text passes AA', () => {
    expect(contrast('#9B545F', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })

  it('never introduces the regressive #C77B85', () => {
    expect(css).not.toContain('#C77B85')
    expect(contrast('#FFFFFF', '#C77B85')).toBeLessThan(4.5)
  })

  it('documents sage, wheat and sky as background-only', () => {
    for (const hex of ['#7A9F82', '#E8B04B', '#A8BFD1']) {
      expect(css).toContain(hex)
      expect(contrast(hex, '#FFFFFF')).toBeLessThan(4.5)
    }
    expect(css).toContain('BACKGROUND ONLY')
  })

  it('keeps the breathing animation opt-out under reduced motion', () => {
    expect(css).toContain('@keyframes fcs-breathe')
    expect(css).toContain('prefers-reduced-motion')
  })
})
