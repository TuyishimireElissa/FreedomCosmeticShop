import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Phase 2 — pills that jump to the categories a search actually hit.
 *
 * A search for "isabune" returns 35 products across Soap (33), Baby & Kids (1)
 * and Body Care (1). On a phone the filter sidebar is off-screen, so that split
 * was invisible.
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const rawComponent = read('src/components/products/CategoryQuickJumps.tsx')
// The file documents its own reasoning; strip comments so prose can never
// satisfy an assertion about shipped code.
const component = rawComponent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const client = read('src/components/products/ProductsPageClient.tsx')
const rw = read('src/lib/i18n/translations/rw.ts')
const en = read('src/lib/i18n/translations/en.ts')

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

describe('the pills only appear when they add something', () => {
  it('needs at least three categories', () => {
    // The brief said both "multiple categories" and "3+". Two is multiple, but
    // with two the pills repeat what the grid already shows, and every row
    // costs vertical space at 360px.
    //
    // Read from source rather than imported: pulling a .tsx through Vitest
    // runs it via Vite's JSX transform, which fails on a .ts test file.
    const declared = component.match(/MIN_QUICK_JUMP_CATEGORIES = (\d+)/)
    expect(declared, 'threshold constant must be declared').not.toBeNull()
    expect(Number(declared![1])).toBe(3)
    expect(component).toContain('usable.length < MIN_QUICK_JUMP_CATEGORIES')
    expect(component).toContain('return null')
  })

  it('ignores categories with a zero count', () => {
    expect(component).toContain('category.count > 0')
  })

  it('is source-gated on a search that produced results', () => {
    // Never on a bare catalogue browse, where the pills duplicate the sidebar,
    // and never on an empty result, where the Coming Soon or sourcing panel
    // owns that space.
    expect(client).toContain('filters.search && products.length > 0')
  })

  it('costs no extra network request', () => {
    // useFacets is already mounted for the sidebar counts.
    expect(client).toContain('const { facets } = useFacets()')
    expect(component).not.toContain('fetch(')
    expect(component).not.toContain('useEffect')
  })
})

describe('labels resolve through the shared i18n map', () => {
  it('uses categoryLabel rather than printing a raw name', () => {
    expect(component).toContain('categoryLabel(')
    expect(component).toContain('nameRw: category.nameRw')
  })

  it('joins nameRw from the fetched categories, since facets omit it', () => {
    // /api/search/facets returns id/name/slug/count only.
    expect(client).toContain('nameRw: known?.nameRw ?? null')
  })

  it('declares nameRw on the Category type', () => {
    // The API has returned it since the column shipped, but the type did not
    // declare it, so consumers silently lost it.
    expect(read('src/lib/types.ts')).toMatch(/nameRw\?: string \| null/)
  })

  it('defines both i18n keys in both languages', () => {
    for (const key of ['quick_jump_title', 'quick_jump_label']) {
      expect(rw, `rw.ts missing ${key}`).toContain(`${key}:`)
      expect(en, `en.ts missing ${key}`).toContain(`${key}:`)
    }
  })

  it('marks the new Kinyarwanda strings as reviewed', () => {
    for (const key of ['quick_jump_title', 'quick_jump_label']) {
      const line = rw.split('\n').find((l) => l.trim().startsWith(`${key}:`))
      expect(line, `${key} must exist`).toBeDefined()
      expect(line, `${key} must carry // verified-rw`).toContain('// verified-rw')
    }
  })

  it('renders no hard-coded customer-facing English', () => {
    expect(component).toContain("t('search.quick_jump_title'")
    expect(component).toContain("t('search.quick_jump_label')")
  })
})

describe('contrast, computed not assumed', () => {
  const WHITE = '#FFFFFF'
  const SURFACE = '#FAF8F6'
  const BRAND_TEXT = '#9B545F'
  const BRAND_STRONG = '#A85D68'

  it('passes AA for every text pair', () => {
    expect(contrast('#6B7280', SURFACE)).toBeGreaterThanOrEqual(4.5) // panel title
    expect(contrast('#1a1a1a', WHITE)).toBeGreaterThanOrEqual(4.5) // pill label
    expect(contrast(BRAND_TEXT, WHITE)).toBeGreaterThanOrEqual(4.5) // count
    expect(contrast(WHITE, BRAND_STRONG)).toBeGreaterThanOrEqual(4.5) // selected
    expect(contrast('#1a1a1a', SURFACE)).toBeGreaterThanOrEqual(4.5) // hover
  })

  it('gives the pill boundary real contrast', () => {
    // WCAG 1.4.11: the pill is a control whose state must be perceivable.
    // --fcs-border-subtle #E5D9C8 measures 1.39:1 on white and was rejected.
    expect(contrast('#E5D9C8', WHITE)).toBeLessThan(3)
    expect(contrast(BRAND_TEXT, WHITE)).toBeGreaterThanOrEqual(3)
    expect(component).toContain('border-fcs-brand-text')
    expect(component).not.toContain('border-fcs-border-subtle')
  })

  it('does not fade the selected count below AA', () => {
    // white/90 on fcs-brand-strong measures 4.23:1 and fails.
    expect(contrast('#F2F2F2', BRAND_STRONG)).toBeLessThan(4.5)
    expect(component).not.toContain('text-white/90')
  })

  it('uses tokens, never raw hex', () => {
    expect(component).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(rawComponent).not.toContain('C77B85')
  })
})

describe('mobile and accessibility', () => {
  it('keeps a 44px tap target', () => {
    expect(component).toContain('min-h-11')
  })

  it('scrolls horizontally instead of wrapping at 360px', () => {
    // A wrapped row of five pills pushes the first product below the fold.
    expect(component).toContain('overflow-x-auto')
    expect(component).toContain('snap-x')
  })

  it('exposes selection state to assistive tech', () => {
    expect(component).toContain('aria-pressed={selected}')
    expect(component).toContain('aria-label={t(')
    expect(component).toContain('<nav')
  })

  it('lets a second tap clear the filter', () => {
    expect(client).toContain("filters.category === slug ? '' : slug")
  })
})
