import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LANGUAGE,
  isAvailableLanguage,
  resolveTranslation,
  resolveTranslationArray,
} from '@/lib/i18n'

describe('language translation resolution', () => {
  it('uses Kinyarwanda as the default customer language', () => {
    expect(DEFAULT_LANGUAGE).toBe('rw')
    expect(resolveTranslation(DEFAULT_LANGUAGE, 'nav.home')).toBe('Ahabanza')
  })

  it('keeps English available as a selectable content source', () => {
    expect(resolveTranslation('en', 'nav.home')).toBe('Home')
  })

  it('resolves Kinyarwanda without changing RWF tokens', () => {
    expect(resolveTranslation('rw', 'nav.home')).toBe('Ahabanza')
    expect(resolveTranslation('rw', 'orders.total', { amount: '5,000' }))
      .toBe('Igiteranyo: 5,000 RWF')
  })

  it('falls back to English when disabled French content is missing', () => {
    expect(resolveTranslation('fr', 'common.save')).toBe('Save')
  })

  it('returns the key when no translation exists', () => {
    expect(resolveTranslation('rw', 'missing.translation')).toBe('missing.translation')
  })

  it('resolves translated arrays with interpolation support', () => {
    const steps = resolveTranslationArray('rw', 'checkout.momo_steps')
    expect(steps).toHaveLength(4)
    expect(steps[0]).toContain('MoMo')
  })

  it('allows only enabled languages to be selected', () => {
    expect(isAvailableLanguage('en')).toBe(true)
    expect(isAvailableLanguage('rw')).toBe(true)
    expect(isAvailableLanguage('fr')).toBe(false)
    expect(isAvailableLanguage('unknown')).toBe(false)
  })
})
