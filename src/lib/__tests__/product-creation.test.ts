import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const form = readFileSync('src/components/admin/AdminProductManager.tsx', 'utf8')
const createRoute = readFileSync('src/app/api/admin/products/route.ts', 'utf8')
const updateRoute = readFileSync('src/app/api/admin/products/[id]/route.ts', 'utf8')

describe('minimum working product creation', () => {
  it('requires only name, positive price, and category in the basic form', () => {
    expect(form).toContain('!form.name.trim() || !form.price || Number(form.price) <= 0 || !form.categoryId')
    expect(form).not.toContain('!form.description')
    expect(form).not.toContain('form.images.length === 0')
  })

  it('allows empty descriptions and image arrays in create and update APIs', () => {
    expect(createRoute).toContain("description: z.string().max(5000).optional().default('')")
    expect(createRoute).toContain('images: z.array(z.string().url()).max(5).optional().default([])')
    expect(updateRoute).toContain('description: z.string().max(5000).optional()')
  })

  it('auto-generates unique slug and SKU values', () => {
    expect(createRoute).toContain('let slug = slugify(data.name)')
    expect(createRoute).toContain('FCS-${randomBytes(4)')
    expect(createRoute).toContain('while (await prisma.product.findUnique')
  })

  it('loads complete admin category and brand lists', () => {
    expect(form).toContain('fetch("/api/admin/categories")')
    expect(form).toContain('fetch("/api/admin/brands")')
  })

  it('uses device photo upload and keeps advanced fields collapsed', () => {
    expect(form).toContain("fetch('/api/upload', { method: 'POST', body })")
    expect(form).toContain('Advanced inventory and margin')
    expect(form).toContain('Advanced product attributes')
    expect(form).not.toContain('newImageUrl')
  })
})
