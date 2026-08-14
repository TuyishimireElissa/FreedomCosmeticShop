/**
 * Navigation reads categories from the database, not a hardcoded list.
 *
 * THE BUG THIS CLOSES, verified live before the fix:
 *
 *   Navbar.tsx L32-38 and Footer.tsx L11-15 each hardcoded their own array
 *   of six categories. Both linked to Makeup, which has 0 live products, so
 *   `/products?category=makeup` rendered "No products match your filters".
 *   Meanwhile the homepage grid — which DID read the API — correctly hid it.
 *   The site contradicted itself depending on which control you tapped.
 *
 * THE SECOND BUG: three separate slug -> i18n maps, two of them wrong.
 *
 *   ProductsPageClient had `mens`; the real slug is `mens-grooming`, so the
 *   breadcrumb never matched and always fell back to English.
 *   CategoryGrid omitted `fragrance` and `mens-grooming` entirely, so a
 *   Kinyarwanda shopper saw "Fragrance" on the homepage rather than
 *   "Imibavu" — with the translation sitting unused in rw.ts.
 *
 * Visibility is now an owner decision: `isActive` alone. Product count only
 * drives the Soon badge and the Coming Soon page.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CATEGORY_I18N_KEYS, categoryLabel } from '@/lib/category-i18n-map'

const read = (path: string) => {
  const raw = readFileSync(path, 'utf8')
  expect(raw.length, `${path} is empty`).toBeGreaterThan(200)
  return raw
}
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const navbar = code('src/components/layout/Navbar.tsx')
const footer = code('src/components/layout/Footer.tsx')
const grid = code('src/components/home/CategoryGrid.tsx')
const productsPage = code('src/components/products/ProductsPageClient.tsx')
const categoriesApi = code('src/app/api/categories/route.ts')
const badge = code('src/components/layout/CategorySoonBadge.tsx')
const rwSource = read('src/lib/i18n/translations/rw.ts')

/** WCAG relative luminance. */
function luminance(hex: string) {
  const value = hex.replace('#', '')
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}
function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

describe('the public API no longer hides an empty category', () => {
  it('filters on isActive and isDeleted only', () => {
    expect(categoriesApi).toContain('isActive: true')
    expect(categoriesApi).toContain('isDeleted: false')
  })

  it('does not gate the category list on having products', () => {
    // The old WHERE had `products: { some: { ... stock: { gt: 0 } } }`, which
    // is exactly what hid Makeup from the homepage while the navbar linked
    // to it anyway.
    expect(categoriesApi).not.toContain('products: {\n          some:')
    expect(categoriesApi).not.toContain('nonEmptyCategories')
  })

  it('still counts only products a shopper can buy', () => {
    // The count drives the Soon badge, so it must mean "in stock now".
    // Including deleted or out-of-stock rows would make an empty shelf look
    // stocked.
    expect(categoriesApi).toContain('const liveProducts = { isActive: true, isDeleted: false, stock: { gt: 0 } }')
    expect(categoriesApi).toContain('_count: { select: { products: { where: liveProducts } } }')
  })

  it('orders by sortOrder so the nav sequence is owner-controlled', () => {
    // Counted, not merely present: the clause appears twice (top level and
    // the children relation). A single toContain passed when the top-level
    // ordering was removed, because the children clause still matched.
    // Mutation testing caught that.
    const ordered = categoriesApi.match(/orderBy: \[\{ sortOrder: 'asc' \}, \{ name: 'asc' \}\]/g) || []
    expect(ordered.length, 'both the list and its children must order by sortOrder').toBe(2)
  })
})

describe('navbar and footer are data-driven', () => {
  it.each([
    ['navbar', 'src/components/layout/Navbar.tsx'],
    ['footer', 'src/components/layout/Footer.tsx'],
  ])('%s fetches categories instead of hardcoding them', (_label, path) => {
    expect(code(path)).toContain('useCategories()')
  })

  it('the hardcoded arrays are gone', () => {
    // Both used a `translationKey` property on a literal array.
    expect(navbar).not.toContain('translationKey')
    expect(footer).not.toContain('translationKey')
    expect(footer).not.toContain('const shopLinks')
  })

  it('neither file names a category slug directly any more', () => {
    // A hardcoded slug is how the Makeup dead link survived: the array
    // could not know the category was empty.
    for (const [label, source] of [['navbar', navbar], ['footer', footer]] as const) {
      for (const slug of ["'skincare'", "'makeup'", "'haircare'", "'fragrance'", "'body-care'", "'mens-grooming'"]) {
        expect(source, `${label} still hardcodes ${slug}`).not.toContain(slug)
      }
    }
  })

  it('the navbar badges an empty category in both menus', () => {
    const badges = navbar.match(/liveProductCount\(category\) === 0 && <CategorySoonBadge \/>/g) || []
    expect(badges.length, 'desktop strip and mobile menu both need the badge').toBe(2)
  })

  it('the footer does not badge, by design', () => {
    // A dense link column with a row of pills reads as clutter.
    expect(footer).not.toContain('CategorySoonBadge')
  })

  it('both menus show a skeleton rather than an empty bar while loading', () => {
    // Assert the two CATEGORY skeletons specifically. A bare animate-pulse
    // count passed when one was deleted, because an unrelated pulse elsewhere
    // in the navbar kept the total above the floor.
    const gated = navbar.match(/categoriesLoading\s*\?/g) || []
    expect(gated.length, 'desktop strip and mobile menu each need a loading branch').toBe(2)
    const reduced = navbar.match(/animate-pulse[^"]*motion-reduce:animate-none/g) || []
    expect(reduced.length, 'every category skeleton must respect reduced motion').toBe(2)
  })

  it('navigation survives a failed request', () => {
    const hook = code('src/hooks/use-categories.ts')
    expect(hook).toContain('.catch(')
    expect(hook).toContain('AbortController')
  })
})

describe('the Soon badge is readable', () => {
  it('uses white on fcs-brand-strong, which passes AA', () => {
    // The brief specified white on fcs-brand #B76E79. Measured: 3.80:1 —
    // below the 4.5:1 floor, and 10px is not large-scale text so the 3:1
    // exemption does not apply. This codebase already fails a build over
    // #C77B85 at 3.18:1, so shipping 3.80:1 would contradict a rule it
    // enforces elsewhere. Owner chose the darker background.
    expect(contrast('#FFFFFF', '#A85D68')).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#FFFFFF', '#B76E79')).toBeLessThan(4.5)
    expect(badge).toContain('bg-fcs-brand-strong')
    expect(badge).toContain('text-white')
    expect(badge).not.toContain('bg-fcs-brand ')
  })

  it('uses tokens, never raw hex', () => {
    const hex = badge.match(/#[0-9a-fA-F]{6}\b/g) || []
    expect(hex, `raw hex in badge: ${hex.join(', ')}`).toEqual([])
  })

  it('speaks both languages', () => {
    expect(badge).toContain("language === 'rw' ? 'Vuba' : 'Soon'")
    // The marker lives in a comment, which code() strips — read raw for it.
    expect(read('src/components/layout/CategorySoonBadge.tsx')).toContain('verified-rw')
  })
})

describe('one shared i18n map replaces the three broken ones', () => {
  it.each([
    ['CategoryGrid', 'src/components/home/CategoryGrid.tsx'],
    ['ProductsPageClient', 'src/components/products/ProductsPageClient.tsx'],
    ['Navbar', 'src/components/layout/Navbar.tsx'],
    ['Footer', 'src/components/layout/Footer.tsx'],
  ])('%s imports the shared map', (_label, path) => {
    expect(code(path)).toContain("from '@/lib/category-i18n-map'")
  })

  it('no component declares its own map', () => {
    expect(grid).not.toContain('const TRANSLATION_KEYS')
    expect(productsPage).not.toContain('const CATEGORY_TRANSLATION_KEYS')
  })

  it('covers every slug that exists in the database today', () => {
    // Queried live 2026-08-14.
    for (const slug of ['skincare', 'body-care', 'fragrance', 'haircare', 'makeup', 'mens-grooming', 'hair-care']) {
      expect(CATEGORY_I18N_KEYS[slug], `no i18n key for ${slug}`).toBeTruthy()
    }
  })

  it('fixes the two slugs that were previously wrong', () => {
    // These are the whole reason the map was consolidated.
    expect(CATEGORY_I18N_KEYS['mens-grooming']).toBe('categories.mens')
    expect(CATEGORY_I18N_KEYS.fragrance).toBe('categories.fragrance')
  })

  it('every mapped key resolves to a reviewed Kinyarwanda string', () => {
    const block = /^  categories: \{([\s\S]*?)^  \},/m.exec(rwSource)
    expect(block, 'categories namespace missing from rw.ts').not.toBeNull()
    const body = block![1]
    expect(body.length, 'categories block is empty').toBeGreaterThan(100)
    // Only the slugs whose rows exist today; later phases add the rest.
    for (const slug of ['skincare', 'body-care', 'fragrance', 'haircare', 'makeup', 'mens-grooming']) {
      const key = CATEGORY_I18N_KEYS[slug].split('.')[1]
      expect(body, `rw.ts has no ${key}`).toMatch(new RegExp(`\\b${key}:`))
    }
  })
})

describe('categoryLabel resolves in the right order', () => {
  const t = (key: string) => (key === 'categories.fragrance' ? 'Imibavu' : key)

  it('prefers the owner-set nameRw in Kinyarwanda', () => {
    const label = categoryLabel({ slug: 'fragrance', name: 'Fragrance', nameRw: 'Impumuro' }, t, 'rw')
    expect(label).toBe('Impumuro')
  })

  it('ignores nameRw in English', () => {
    const label = categoryLabel({ slug: 'fragrance', name: 'Fragrance', nameRw: 'Impumuro' }, t, 'en')
    expect(label).toBe('Imibavu')
  })

  it('falls back to the i18n key when nameRw is empty', () => {
    expect(categoryLabel({ slug: 'fragrance', name: 'Fragrance', nameRw: '   ' }, t, 'rw')).toBe('Imibavu')
    expect(categoryLabel({ slug: 'fragrance', name: 'Fragrance', nameRw: null }, t, 'rw')).toBe('Imibavu')
  })

  it('falls back to the English name for an unmapped slug', () => {
    // Never render a raw slug to a customer.
    expect(categoryLabel({ slug: 'brand-new', name: 'Brand New' }, t, 'rw')).toBe('Brand New')
  })

  it('never returns the raw i18n key when a translation is missing', () => {
    // t() echoes the key back on a miss; that must not reach the page.
    const label = categoryLabel({ slug: 'soap', name: 'Soap' }, t, 'rw')
    expect(label).toBe('Soap')
    expect(label).not.toContain('categories.')
  })
})
