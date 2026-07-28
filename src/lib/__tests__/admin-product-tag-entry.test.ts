import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CreateProductSchema } from '@/lib/admin-product-schema'

const form = readFileSync('src/components/admin/AdminProductManager.tsx', 'utf8')
const schema = readFileSync('src/lib/admin-product-schema.ts', 'utf8')

const valid = { name: 'Body Lotion', description: '', price: 5000, stock: 3, lowStockThreshold: 1, categoryId: 'category-1', images: [], featured: false, isActive: true }

/** Mirrors the addShade/addIngredient guards in AdminProductManager. */
function addTag(list: string[], raw: string, cap: number) {
  const value = raw.trim()
  if (!value) return { list, blocked: 'empty' as const }
  if (list.length >= cap) return { list, blocked: 'cap' as const }
  if (list.some((existing) => existing.toLowerCase() === value.toLowerCase())) return { list, blocked: 'duplicate' as const }
  return { list: [...list, value], blocked: null }
}

describe('admin product shade and ingredient entry', () => {
  it('adds shades and ingredients through a single shared handler', () => {
    expect(form).toContain('const addShade = () => {')
    expect(form).toContain('const addIngredient = () => {')
    expect(form).toContain('onClick={addShade}')
    expect(form).toContain('onClick={addIngredient}')
    expect(form).toContain('addShade()')
    expect(form).toContain('addIngredient()')
    // The previous inline duplicates must not return: Enter and Add must not drift apart.
    expect(form).not.toContain('shades: [...form.shades, form.newShade]')
    expect(form).not.toContain('ingredients: [...form.ingredients, form.newIngredient]')
  })

  it('trims entries and rejects whitespace-only values the server would reject', () => {
    expect(form).toContain('const shade = form.newShade.trim()')
    expect(form).toContain('const ingredient = form.newIngredient.trim()')
    expect(addTag([], '   ', 100).blocked).toBe('empty')
    expect(addTag([], '  Rose  ', 100).list).toEqual(['Rose'])
    // A whitespace-only tag fails server validation, so it must never leave the form.
    expect(CreateProductSchema.safeParse({ ...valid, shades: ['   '] }).success).toBe(false)
    expect(CreateProductSchema.safeParse({ ...valid, ingredients: ['   '] }).success).toBe(false)
  })

  it('blocks case-insensitive duplicates', () => {
    expect(form).toContain('existing.toLowerCase() === shade.toLowerCase()')
    expect(form).toContain('existing.toLowerCase() === ingredient.toLowerCase()')
    expect(addTag(['Rose'], 'rose', 100).blocked).toBe('duplicate')
    expect(addTag(['Rose'], 'Deep', 100).list).toEqual(['Rose', 'Deep'])
  })

  it('caps entry counts at the limits the create schema enforces', () => {
    expect(form).toContain('if (form.shades.length >= 100)')
    expect(form).toContain('if (form.ingredients.length >= 100)')
    expect(addTag(Array.from({ length: 100 }, (_, index) => `Shade ${index}`), 'Extra', 100).blocked).toBe('cap')
    expect(CreateProductSchema.safeParse({ ...valid, shades: Array(101).fill('Rose') }).success).toBe(false)
    expect(CreateProductSchema.safeParse({ ...valid, ingredients: Array(101).fill('Water') }).success).toBe(false)
  })

  it('limits single entry length to the per-item server maximum', () => {
    expect(schema).toContain('shades: z.array(z.string().trim().min(1).max(100)).max(100)')
    expect(schema).toContain('ingredients: z.array(z.string().trim().min(1).max(200)).max(100)')
    expect(CreateProductSchema.safeParse({ ...valid, shades: ['x'.repeat(101)] }).success).toBe(false)
    expect(CreateProductSchema.safeParse({ ...valid, ingredients: ['x'.repeat(201)] }).success).toBe(false)
  })

  it('guards array sizes before POST so edited products cannot exceed server limits', () => {
    expect(form).toContain("if (form.skinType.length > 10) return reject('Too many skin types'")
    expect(form).toContain("if (form.shades.length > 100) return reject('Too many shades'")
    expect(form).toContain("if (form.ingredients.length > 100) return reject('Too many ingredients'")
    expect(CreateProductSchema.safeParse({ ...valid, skinType: Array(11).fill('DRY') }).success).toBe(false)
    expect(CreateProductSchema.safeParse({ ...valid, skinType: Array(10).fill('DRY') }).success).toBe(true)
  })

  it('keeps valid entries working after the guards were added', () => {
    expect(CreateProductSchema.safeParse({ ...valid, shades: ['Rose', 'Deep'], ingredients: ['Vitamin C'] }).success).toBe(true)
    expect(CreateProductSchema.safeParse({ ...valid, shades: [], ingredients: [] }).success).toBe(true)
    expect(CreateProductSchema.safeParse({ ...valid, shades: Array.from({ length: 100 }, (_, index) => `Shade ${index}`) }).success).toBe(true)
  })
})
