import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A category slug is a public URL: /products?category=<slug>. Customers share
 * those links on WhatsApp and there is no redirect table to catch a stale one.
 *
 * The PUT route used to rebuild the slug from the name on every rename, so
 * correcting a typo in a category name silently broke every link already sent.
 * These assertions exist to stop that behaviour coming back.
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const raw = read('src/app/api/admin/categories/[id]/route.ts')
// Comments explain the old behaviour, so code assertions must ignore them.
const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('renaming a category does not change its public URL', () => {
  it('never derives a slug from the name', () => {
    // The exact regeneration that used to run on rename.
    expect(code).not.toMatch(/data\.slug\s*=\s*parsed\.data\.name/)
    expect(code).not.toMatch(/slug\s*=\s*parsed\.data\.name\s*\.toLowerCase\(\)/)
    // No slugify-shaped expression anywhere in the update path.
    expect(code).not.toMatch(/parsed\.data\.name[\s\S]{0,40}replace\(\/\[\^a-z0-9\]/)
  })

  it('does not branch on the name having changed', () => {
    expect(code).not.toMatch(/parsed\.data\.name\s*!==\s*existing\.name/)
  })

  it('only writes a slug the caller asked for', () => {
    expect(code).toContain('parsed.data.slug && parsed.data.slug !== existing.slug')
    expect(code).toContain('data.slug = parsed.data.slug')
    // Anything else must be stripped so a stray key cannot slip through the spread.
    expect(code).toContain('delete data.slug')
  })

  it('rejects a slug already taken by another category', () => {
    expect(code).toContain('id: { not: id }')
    expect(code).toMatch(/status:\s*409/)
  })

  it('validates slug shape instead of trusting the client', () => {
    expect(code).toMatch(/slug:\s*z\.string\(\)/)
    expect(code).toContain('^[a-z0-9]+(?:-[a-z0-9]+)*$')
  })

  it('still lets the name be updated on its own', () => {
    expect(code).toMatch(/name:\s*z\.string\(\)\.min\(2\)\.max\(100\)\.optional\(\)/)
    expect(code).toContain('const data: Record<string, unknown> = { ...parsed.data }')
  })

  it('leaves POST free to generate a slug for a brand-new category', () => {
    // Creating a category has no existing URL to protect.
    const create = read('src/app/api/admin/categories/route.ts')
    expect(create).toContain('function slugify')
    expect(create).toContain('slugify(parsed.data.name)')
  })
})
