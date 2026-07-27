import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
const script = read('src/scripts/test-accessibility.ts')
const checklist = read('docs/ACCESSIBILITY_TESTING.md')

describe('accessibility testing tools', () => {
  it('provides an executable source-check command', () => {
    expect(packageJson.scripts['test:a11y']).toBe('tsx src/scripts/test-accessibility.ts')
    expect(script).toContain('process.exitCode = 1')
    expect(script).toContain("read('src/components/a11y/SkipToContent.tsx')")
    expect(script).toContain("read('src/components/a11y/LiveAnnouncer.tsx')")
    expect(script).toContain("read('src/components/home/HeroBanner.tsx')")
  })

  it('clearly separates source checks from required manual verification', () => {
    expect(script).toContain('These source checks do not replace browser')
    expect(script).toContain('MANUAL KEYBOARD TEST — REQUIRED')
    expect(script).toContain('ANDROID TALKBACK — PHYSICAL DEVICE REQUIRED')
    expect(script).toContain('IPHONE VOICEOVER — PHYSICAL DEVICE REQUIRED')
    expect(script).toContain('200% ZOOM — REQUIRED')
    expect(script).toContain('CONTRAST — REQUIRED')
  })

  it('provides evidence-oriented scenarios for every required test mode', () => {
    for (const heading of [
      'Keyboard-only navigation',
      'Android TalkBack',
      'iPhone VoiceOver',
      '200% browser zoom and reflow',
      'Contrast and color use',
      'Reduced motion and moving content',
      'Form accessibility',
      'Touch targets and orientation',
      'Reading and focus order',
      'Automated tools',
      'Real-user evaluation',
    ]) expect(checklist).toContain(heading)
  })

  it('does not pre-claim unfinished manual tests or WCAG certification', () => {
    expect(checklist).not.toContain('- [x]')
    expect(checklist).toContain('not proof of WCAG conformance')
    expect(checklist).toContain('not a conformance certification')
    expect(checklist).not.toContain('Target: 100 score')
  })

  it('maps implemented and pending evidence to WCAG 2.2 criteria', () => {
    for (const criterion of ['1.4.3', '1.4.10', '2.1.1', '2.2.2', '2.4.1', '2.4.11', '2.5.8', '3.3.1', '4.1.3']) {
      expect(checklist).toContain(criterion)
    }
  })
})
