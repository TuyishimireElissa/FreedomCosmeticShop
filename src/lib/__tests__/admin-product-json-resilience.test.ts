import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  parseProductJsonArray,
  parseProductStringArray,
  serializeProductJsonColumns,
} from '@/lib/product-json'

/**
 * Regression cover for the 2026-08-23 admin blackout.
 *
 * "Movit Blow Out Creme Hair Relaxer (150g)" had the plain sentence
 * "Refer to the product packaging for the complete INCI ingredient list."
 * stored in its `ingredients` column, which is meant to hold a JSON array
 * string. The admin list route ran a bare JSON.parse() inside a .map(), so
 * that single row threw and returned HTTP 500 for the entire page — the
 * owner saw "No products" while 108 products sat healthy in the database.
 */

const BAD_INGREDIENTS = 'Refer to the product packaging for the complete INCI ingredient list.'

const listRoute = readFileSync('src/app/api/admin/products/route.ts', 'utf8')
const detailRoute = readFileSync('src/app/api/admin/products/[id]/route.ts', 'utf8')
const manager = readFileSync('src/components/admin/AdminProductManager.tsx', 'utf8')

function row(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    images: '["https://res.cloudinary.com/dohoc0tmp/a.jpg"]',
    skinType: '["OILY"]',
    shades: null,
    ingredients: '["Water (Aqua)","Glycerin"]',
    ...overrides,
  } as { images: string; skinType: string | null; shades: string | null; ingredients: string | null }
}

describe('parseProductJsonArray', () => {
  it('parses a valid JSON array', () => {
    expect(parseProductJsonArray('["a","b"]')).toEqual(['a', 'b'])
  })

  it('returns null for null / undefined / empty string', () => {
    expect(parseProductJsonArray(null)).toBeNull()
    expect(parseProductJsonArray(undefined)).toBeNull()
    expect(parseProductJsonArray('')).toBeNull()
  })

  it('returns [] for the exact production sentence, instead of throwing', () => {
    expect(() => parseProductJsonArray(BAD_INGREDIENTS)).not.toThrow()
    expect(parseProductJsonArray(BAD_INGREDIENTS)).toEqual([])
  })

  it('returns [] for valid JSON that is not an array', () => {
    expect(parseProductJsonArray('{"a":1}')).toEqual([])
    expect(parseProductJsonArray('42')).toEqual([])
    expect(parseProductJsonArray('"text"')).toEqual([])
    expect(parseProductJsonArray('true')).toEqual([])
  })

  it('never throws on assorted malformed input', () => {
    for (const bad of ['[', '[1,', '{oops}', 'undefined', 'NaN', '\u0000', '[}']) {
      expect(() => parseProductJsonArray(bad), `input: ${bad}`).not.toThrow()
      expect(parseProductJsonArray(bad), `input: ${bad}`).toEqual([])
    }
  })

  it('preserves a legitimately empty array as empty, not null', () => {
    expect(parseProductJsonArray('[]')).toEqual([])
  })
})

describe('parseProductStringArray', () => {
  it('returns [] rather than null so images is always iterable', () => {
    expect(parseProductStringArray(null)).toEqual([])
    expect(parseProductStringArray(BAD_INGREDIENTS)).toEqual([])
  })

  it('drops non-string members', () => {
    expect(parseProductStringArray('["a",1,null,"b",{}]')).toEqual(['a', 'b'])
  })
})

describe('serializeProductJsonColumns', () => {
  it('serializes a healthy row unchanged in meaning', () => {
    const out = serializeProductJsonColumns(row())
    expect(out.images).toEqual(['https://res.cloudinary.com/dohoc0tmp/a.jpg'])
    expect(out.skinType).toEqual(['OILY'])
    expect(out.shades).toBeNull()
    expect(out.ingredients).toEqual(['Water (Aqua)', 'Glycerin'])
  })

  it('does not throw on the exact offending production row', () => {
    expect(() => serializeProductJsonColumns(row({ ingredients: BAD_INGREDIENTS }))).not.toThrow()
  })

  it('isolates the damage to the bad field only', () => {
    const out = serializeProductJsonColumns(row({ ingredients: BAD_INGREDIENTS }))
    expect(out.ingredients).toEqual([])
    // The healthy siblings must survive untouched.
    expect(out.images).toEqual(['https://res.cloudinary.com/dohoc0tmp/a.jpg'])
    expect(out.skinType).toEqual(['OILY'])
  })

  it('survives every column being malformed at once', () => {
    const out = serializeProductJsonColumns({
      images: 'not json',
      skinType: 'not json',
      shades: 'not json',
      ingredients: 'not json',
    })
    expect(out).toMatchObject({ images: [], skinType: [], shades: [], ingredients: [] })
  })

  it('does not mutate the input row', () => {
    const input = row({ ingredients: BAD_INGREDIENTS })
    serializeProductJsonColumns(input)
    expect(input.ingredients).toBe(BAD_INGREDIENTS)
    expect(typeof input.images).toBe('string')
  })

  it('carries unrelated fields through untouched', () => {
    const out = serializeProductJsonColumns({ ...row(), id: 'p1', name: 'X', price: 2500 } as never)
    expect(out).toMatchObject({ id: 'p1', name: 'X', price: 2500 })
  })

  it('a full page of 20 rows still serializes when one row is poisoned', () => {
    const page = Array.from({ length: 20 }, (_, i) =>
      row(i === 0 ? { ingredients: BAD_INGREDIENTS } : {}),
    )
    // The original bug: .map() aborted on row 0 and the other 19 were lost.
    const out = page.map((p) => serializeProductJsonColumns(p))
    expect(out).toHaveLength(20)
    expect(out[0].ingredients).toEqual([])
    expect(out[19].ingredients).toEqual(['Water (Aqua)', 'Glycerin'])
  })
})

describe('admin routes use the guarded parser', () => {
  it('the list route no longer bare-parses the legacy JSON columns', () => {
    expect(listRoute).not.toMatch(/JSON\.parse\(p\.(images|skinType|shades|ingredients)\)/)
    expect(listRoute).not.toMatch(/JSON\.parse\(product\.(images|skinType|shades|ingredients)\)/)
  })

  it('the detail route no longer bare-parses the legacy JSON columns', () => {
    expect(detailRoute).not.toMatch(/JSON\.parse\(p\.(images|skinType|shades|ingredients)\)/)
  })

  it('both routes import the shared guarded serializer', () => {
    expect(listRoute).toContain("from '@/lib/product-json'")
    expect(detailRoute).toContain("from '@/lib/product-json'")
    expect(listRoute).toContain('serializeProductJsonColumns')
    expect(detailRoute).toContain('serializeProductJsonColumns')
  })
})

describe('AdminProductManager reports load failures instead of faking an empty catalogue', () => {
  it('treats any non-ok response as an error', () => {
    expect(manager).toContain('if (!res.ok) throw new Error')
  })

  it('validates the response shape before trusting it', () => {
    expect(manager).toContain('Array.isArray(data.products)')
  })

  it('no longer silently coerces a missing products key to an empty list', () => {
    expect(manager).not.toContain('setProducts(data.products || [])')
  })

  it('renders a distinct error state, gated ahead of the "No products" state', () => {
    expect(manager).toContain('Products could not be loaded')
    expect(manager.indexOf('loadError ?')).toBeGreaterThan(-1)
    expect(manager.indexOf('loadError ?')).toBeLessThan(manager.indexOf('products.length === 0 ?'))
  })

  it('reassures the owner that the catalogue is not lost', () => {
    expect(manager).toContain('Your catalogue is safe')
  })

  it('offers a retry control that meets the 44px touch target', () => {
    const block = manager.slice(manager.indexOf('loadError ?'), manager.indexOf('products.length === 0 ?'))
    expect(block).toContain('Try again')
    expect(block).toMatch(/className="[^"]*min-h-11[^"]*"[^>]*\n?\s*onClick=\{\(\) => void loadProducts\(\)\}/)
  })

  it('clears the error once a load succeeds', () => {
    expect(manager).toContain('setLoadError(null)')
  })

  it('uses only fcs-* design tokens in the new error state', () => {
    const block = manager.slice(manager.indexOf('loadError ?'), manager.indexOf('products.length === 0 ?'))
    expect(block).toContain('text-fcs-umber')
    expect(block).toContain('text-fcs-text')
    expect(block).toContain('text-fcs-text-muted')
    // No raw hex and no opacity modifier on an fcs token (those emit no CSS).
    expect(block).not.toMatch(/#[0-9a-fA-F]{6}/)
    expect(block).not.toMatch(/fcs-[a-z-]+\/\d/)
  })

  it('exposes the error to assistive technology', () => {
    const block = manager.slice(manager.indexOf('loadError ?'), manager.indexOf('products.length === 0 ?'))
    expect(block).toContain('role="alert"')
  })
})
