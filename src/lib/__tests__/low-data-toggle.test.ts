import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const toggle = read('src/components/settings/LowDataToggle.tsx')
const navbar = read('src/components/layout/Navbar.tsx')
const settings = read('src/app/account/settings/page.tsx')
const account = read('src/app/account/page.tsx')
const englishTranslations = read('src/lib/i18n/translations/en.ts')
const kinyarwandaTranslations = read('src/lib/i18n/translations/rw.ts')
const english = englishTranslations.slice(englishTranslations.indexOf('low_data:'), englishTranslations.indexOf('nav:', englishTranslations.indexOf('low_data:')))
const kinyarwanda = kinyarwandaTranslations.slice(kinyarwandaTranslations.indexOf('low_data:'), kinyarwandaTranslations.indexOf('nav:', kinyarwandaTranslations.indexOf('low_data:')))

describe('visible low-data controls', () => {
  it('provides an accessible compact toggle with a practical target', () => {
    expect(toggle).toContain("variant === 'compact'")
    expect(toggle).toContain('onClick={toggleLowData}')
    expect(toggle).toContain("t('low_data.turn_off')")
    expect(toggle).toContain("t('low_data.turn_on')")
    expect(toggle).toContain('aria-pressed={isLowData}')
    expect(toggle).toContain('min-h-11')
  })

  it('provides explicit auto, on, and off preferences', () => {
    expect(toggle).toContain("value: 'auto'")
    expect(toggle).toContain("value: 'on'")
    expect(toggle).toContain("value: 'off'")
    expect(toggle).toContain('setUserPreference(option.value)')
    expect(toggle).toContain('aria-pressed={userPreference === option.value}')
    expect(toggle).toContain('<fieldset')
    expect(toggle).toContain('<legend')
  })

  it('shows network detection and effective status with icon and text', () => {
    expect(toggle).toContain('(isSlowConnection || saveData)')
    expect(toggle).toContain("t('low_data.slow_detected'")
    expect(toggle).toContain("t('low_data.save_data_detected')")
    expect(toggle).toContain('role="status"')
    expect(toggle).toContain('aria-live="polite"')
  })

  it('places controls in mobile navigation and account settings', () => {
    expect(navbar).toContain('<LowDataToggle variant="compact" />')
    expect(settings).toContain('<LowDataToggle />')
    expect(settings).toContain("t('low_data.settings_title')")
    expect(account).toContain("href: '/account/settings'")
  })

  it('renders all new text through translation keys', () => {
    expect(toggle).not.toMatch(/Mode yo|Data igabanywe|Full data|Slow connection detected/)
    for (const key of ['title', 'description', 'turn_on', 'turn_off', 'auto', 'on', 'off', 'slow_detected', 'current_status', 'settings_title']) {
      expect(english).toMatch(new RegExp(`${key}:`))
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
