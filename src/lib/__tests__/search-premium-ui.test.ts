import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Phase 1 — premium search bar UI (2026-08-26 brief).
 *
 * Source-reading tests, same style as the other search tests. They lock the
 * spec: 48px field on phones / 56px on desktop, fcs-surface field, brand-text
 * focus ring, rounded-fcs-lg + shadow-fcs-2, a real clear-X inside the field,
 * a 200ms open/close transition that respects prefers-reduced-motion, and the
 * compact bilingual placeholder (key-driven, never hard-coded copy).
 */

const overlay = readFileSync(resolve(process.cwd(), 'src/components/storefront/SearchOverlay.tsx'), 'utf8')
const bar = readFileSync(resolve(process.cwd(), 'src/components/layout/MobileSearchBar.tsx'), 'utf8')
const en = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/en.ts'), 'utf8')
const rw = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/rw.ts'), 'utf8')

describe('Phase 1 — premium search field (overlay)', () => {
  it('sizes the field 48px on phones and 56px on desktop', () => {
    expect(overlay).toContain('flex min-h-12 w-full flex-1 items-center')
    expect(overlay).toContain('md:min-h-14')
  })

  it('uses the fcs-surface field, rounded-fcs-lg and the fcs-2 shadow token', () => {
    // Combined className fragments: a bare token can also appear in a comment
    // (or in another element, e.g. md:rounded-fcs-lg on the panel), which
    // would let a regression slip through.
    expect(overlay).toContain('rounded-fcs-lg border border-fcs-border bg-fcs-surface px-2 shadow-fcs-2')
  })

  it('focuses with a fcs-brand-text ring on the whole field (focus-within)', () => {
    expect(overlay).toContain('focus-within:border-fcs-brand-text')
    expect(overlay).toContain('focus-within:ring-2')
    expect(overlay).toContain('focus-within:ring-fcs-brand-text')
  })

  it('keeps the translation key, and never hard-codes the placeholder copy', () => {
    expect(overlay).toContain("t('search.overlay_placeholder')")
    expect(overlay).not.toContain('Search products')
    expect(overlay).not.toContain('Shakisha')
  })

  it('renders a clear-X inside the field only when there is text', () => {
    expect(overlay).toContain("query.length > 0 &&")
    expect(overlay).toContain("{t('common.clear')}")
    expect(overlay).toContain("setQuery('')")
  })

  it('animates open/close in 200ms and honours prefers-reduced-motion', () => {
    expect(overlay).toContain('duration-200')
    expect(overlay).toContain('motion-reduce:transition-none')
    // The exit keeps the panel mounted for the duration of the fade.
    expect(overlay).toContain('setTimeout(() => setMounted(false), 200)')
    expect(overlay).toContain('if (!mounted) return null')
  })

  it('keeps both in-field suffix icons at a 44px minimum touch target', () => {
    expect(overlay).toContain('h-11 w-11')
  })
})

describe('Phase 1 — mobile search bar', () => {
  it('sizes the fake-field button at 48px and matches the overlay radius/shadow', () => {
    expect(bar).toContain('flex min-h-12 flex-1 items-center gap-2 rounded-fcs-lg border border-fcs-border bg-fcs-surface px-3 text-left shadow-fcs-2')
  })

  it('never hard-codes a hex and keeps the AA-safe muted placeholder colour', () => {
    expect(bar).not.toMatch(/#[0-9A-Fa-f]{6}/)
    expect(bar).toContain('text-fcs-text-muted')
  })
})

describe('Phase 1 — compact bilingual placeholder values', () => {
  it('sets the concise copy in both languages', () => {
    expect(en).toContain("overlay_placeholder: 'Search products...'")
    expect(rw).toContain("overlay_placeholder: 'Shakisha ibicuruzwa...'")
  })

  it('keeps the Kinyarwanda string marked as reviewed', () => {
    expect(rw).toMatch(/overlay_placeholder: 'Shakisha ibicuruzwa\.\.\.', \/\/ verified-rw/)
  })
})
