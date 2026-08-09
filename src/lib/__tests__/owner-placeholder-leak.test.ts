import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUSINESS, isPlaceholder, realValue, getTODOItems } from '@/lib/business-config'

/**
 * The business config intentionally ships `[TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH]`
 * placeholders rather than inventing a phone number or address. That is the
 * right call — but the marker must never reach a customer's screen.
 *
 * The live /contact page rendered it seven times before this suite existed.
 */

const SRC = join(process.cwd(), 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

describe('owner placeholder guards', () => {
  it('detects an unfilled placeholder', () => {
    // Contact details were supplied by the owner on 2026-08-09, so this now
    // exercises a field that is still genuinely unfilled. Using a real field
    // rather than a literal keeps the test honest about production state.
    expect(isPlaceholder(BUSINESS.legalName)).toBe(true)
    expect(isPlaceholder(BUSINESS.phoneDisplay)).toBe(false)
    expect(isPlaceholder('+250788123456')).toBe(false)
    expect(isPlaceholder(undefined)).toBe(false)
  })

  it('realValue hides placeholders and passes real values through', () => {
    expect(realValue(BUSINESS.legalName)).toBeNull()
    expect(realValue(BUSINESS.phoneDisplay)).toBe('+250 790 215 965')
    expect(realValue('+250788123456')).toBe('+250788123456')
    expect(realValue('')).toBeNull()
  })

  it('still reports outstanding owner TODOs for the launch checklist', () => {
    // Guarding the UI must not silence the checklist the owner works from.
    // Contact fields are done; registration, banking and socials are not.
    const todos = getTODOItems()
    expect(todos.length).toBeGreaterThan(0)
    expect(todos).toContain('rdbNumber')
    expect(todos).toContain('tinNumber')
    expect(todos).not.toContain('phoneDisplay')
    expect(todos).not.toContain('email')
  })

  it('publishes the owner-confirmed contact details', () => {
    // These are the values customers actually reach the shop on. If one of
    // them silently reverts to a placeholder, the shop becomes uncontactable
    // and every guarded surface hides itself without any error.
    expect(BUSINESS.phone).toBe('+250790215965')
    expect(BUSINESS.phoneDisplay).toBe('+250 790 215 965')
    expect(BUSINESS.email).toBe('freedomcosmeticshop@gmail.com')
    expect(BUSINESS.whatsapp).toBe('+250790215965')
    expect(BUSINESS.supportHours.weekdays).toContain('8:00 AM - 8:00 PM')
    expect(BUSINESS.supportHours.sunday).toContain('10:00 AM - 6:00 PM')
  })

  it('renders a partial address without dangling separators or repetition', () => {
    // Street and landmark are still unknown. A naive join produced
    // "[TODO...], Nyarugenge, ..." and a duplicated sector/district name.
    expect(BUSINESS.address.short).toBe('Nyarugenge, Kigali')
    expect(BUSINESS.address.full).toBe('Nyarugenge, Kigali, Rwanda')
    for (const value of [BUSINESS.address.short, BUSINESS.address.full]) {
      expect(value).not.toContain('TODO')
      expect(value).not.toMatch(/,\s*,/)
      expect(value).not.toMatch(/^,|,$/)
    }
  })

  it('renders no unguarded BUSINESS contact field in any component', () => {
    // Fields that are placeholders today. Interpolating one straight into JSX
    // prints the raw marker, so each use must sit behind a guard.
    const risky = [
      'BUSINESS.phoneDisplay',
      'BUSINESS.emailInvoices',
      'BUSINESS.legalName',
      'BUSINESS.address.full',
    ]
    const guards = ['isPlaceholder', 'realValue', 'configured', 'isConfigured', "includes('TODO')", 'includes("TODO")']

    const offenders: string[] = []
    for (const file of walk(SRC)) {
      const source = readFileSync(file, 'utf8')
      if (!risky.some((field) => source.includes(field))) continue
      // A file touching a risky field must import or define at least one guard.
      if (!guards.some((guard) => source.includes(guard))) {
        offenders.push(file.replace(`${process.cwd()}/`, ''))
      }
    }

    expect(offenders, `unguarded owner placeholders in:\n${offenders.join('\n')}`).toEqual([])
  })

  it('the contact page guards every channel it renders', () => {
    const source = readFileSync(join(SRC, 'components/contact/ContactPageClient.tsx'), 'utf8')
    expect(source).toContain('realValue')
    expect(source).toContain('isPlaceholder')
    // The bare JSX interpolations that leaked to production. A guarded
    // `mailto:${BUSINESS.email}` inside a template literal is fine, so match
    // only a field rendered directly as an element child: `>{BUSINESS.x}<`.
    expect(source).not.toMatch(/>\s*\{BUSINESS\.(phoneDisplay|email|whatsapp)\}/)
    expect(source).not.toMatch(/>\s*\{BUSINESS\.address\.(short|full)\}/)
  })
})
