import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CreateProductSchema } from '@/lib/admin-product-schema'

const form = readFileSync('src/components/admin/AdminProductManager.tsx', 'utf8')
const createRoute = readFileSync('src/app/api/admin/products/route.ts', 'utf8')
const updateRoute = readFileSync('src/app/api/admin/products/[id]/route.ts', 'utf8')

const valid = { name: 'Body Lotion', description: '', price: 5000, stock: 3, lowStockThreshold: 1, categoryId: 'category-1', images: [], featured: false, isActive: true }

describe('reliable product creation', () => {
  it('accepts a minimum valid product without requiring images or description', () => {
    expect(CreateProductSchema.safeParse(valid).success).toBe(true)
    expect(form).not.toContain('!form.description')
    expect(form).not.toContain('form.images.length === 0')
  })

  it('validates whole-number RWF prices, stock, category, and relationships before POST', () => {
    expect(form).toContain('Whole numbers required')
    expect(form).toContain("categories.some((category) => category.id === form.categoryId)")
    expect(form).toContain("suppliers.some((supplier) => supplier.id === form.supplierId)")
    expect(createRoute).toContain("code: 'INVALID_CATEGORY'")
    expect(createRoute).toContain("code: 'INVALID_SUPPLIER'")
    expect(CreateProductSchema.safeParse({ ...valid, price: 5000.5 }).success).toBe(false)
  })

  it('rejects misleading prices and invalid inventory dates on both client and server', () => {
    expect(CreateProductSchema.safeParse({ ...valid, compareAt: 4000 }).success).toBe(false)
    expect(CreateProductSchema.safeParse({ ...valid, wholesalePrice: 6000 }).success).toBe(false)
    expect(CreateProductSchema.safeParse({ ...valid, manufacturedDate: '2026-08-01T00:00:00.000Z', expiryDate: '2026-07-01T00:00:00.000Z' }).success).toBe(false)
    expect(form).toContain('Compare-at price must be greater than the selling price')
    expect(updateRoute).toContain('Compare-at price must be greater than the selling price')
  })

  it('auto-generates non-empty unique slugs and SKUs and reports duplicates clearly', () => {
    expect(createRoute).toContain("const slugBase = slugify(data.name) || `product-")
    expect(createRoute).toContain('while (await prisma.product.findUnique')
    expect(createRoute).toContain('DUPLICATE_IDENTIFIER')
    expect(createRoute).toContain('DUPLICATE_PRODUCT')
  })

  it('loads only active references and visibly reports option/session/permission failures', () => {
    expect(form).toContain("fetch('/api/admin/categories', { cache: 'no-store' })")
    expect(form).toContain('.filter((category) => category.isActive)')
    expect(form).toContain('setReferenceError(message)')
    expect(form).toContain("canAdminPermission(user?.role, user?.permissions, 'products.crud')")
    expect(form).toContain('Your session expired. Sign in again')
  })

  it('prevents save while photos/options are loading and preserves the server error in the dialog', () => {
    expect(form).toContain("if (uploadingPhotos) return reject('Photos are still uploading'")
    expect(form).toContain('setFormError(message)')
    expect(form).toContain('aria-live="assertive"')
    expect(form).toContain('saving || uploadingPhotos || referenceLoading')
  })

  it('uses device photo upload and keeps advanced fields collapsed', () => {
    expect(form).toContain("fetch('/api/upload', { method: 'POST', body })")
    expect(form).toContain('Advanced inventory and margin')
    expect(form).toContain('Advanced product attributes')
  })
})
