import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const importer = readFileSync(resolve(process.cwd(), 'scripts/import-real-products.ts'), 'utf8')
const seedEntry = readFileSync(resolve(process.cwd(), 'scripts/seed.ts'), 'utf8')
const template = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/real-products.template.json'), 'utf8')) as { products: Array<{ enabled: boolean; isAuthentic: boolean; isActive: boolean }> }

describe('safe real product import template', () => {
  it('contains no destructive database reset operations', () => {
    expect(importer).not.toContain('.deleteMany(')
    expect(seedEntry).not.toContain('.deleteMany(')
  })

  it('requires explicit apply and approved Supabase project confirmation', () => {
    expect(importer).toContain("process.argv.includes('--apply')")
    expect(importer).toContain("--confirm-project=${APPROVED_PROJECT_REF}")
    expect(importer).toContain("if (!apply)")
  })

  it('does not seed fabricated ratings, reviews, sales, or new-product flags', () => {
    expect(importer).toContain('rating: 0')
    expect(importer).toContain('reviewsCount: 0')
    expect(importer).toContain('isNew: false')
    expect(importer).not.toContain('review.create')
    expect(importer).not.toContain('orderItem.create')
  })

  it('ships with disabled, inactive, unverified placeholder records', () => {
    expect(template.products.length).toBeGreaterThan(0)
    for (const product of template.products) {
      expect(product.enabled).toBe(false)
      expect(product.isActive).toBe(false)
      expect(product.isAuthentic).toBe(false)
    }
  })

  it('requires approved Cloudinary product-folder public IDs', () => {
    expect(importer).toContain("PRODUCT_FOLDER = 'freedomcosmeticshop/products/'")
    expect(importer).toContain('startsWith(PRODUCT_FOLDER)')
  })
})
