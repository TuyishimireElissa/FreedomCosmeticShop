import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const collection = read('src/app/api/admin/bundles/route.ts')
const item = read('src/app/api/admin/bundles/[id]/route.ts')
const manager = read('src/components/admin/BundleManager.tsx')

describe('admin bundle management', () => {
  it('protects reads/writes with least-privilege permissions', () => {
    expect(collection).toContain('requirePermission(PERMISSIONS.PRODUCTS_READ)')
    expect(collection).toContain('requirePermission(PERMISSIONS.PRODUCTS_CRUD)')
    expect(item).toContain('requirePermission(PERMISSIONS.PRODUCTS_UPDATE)')
    expect(item).toContain('requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.CONTENT_DELETE)')
    expect(collection).not.toContain('next-auth')
  })
  it('validates real products and recalculates totals and stock before saving', () => {
    expect(collection).toContain('BundleInputSchema.safeParse')
    expect(collection).toContain('prisma.product.findMany')
    expect(collection).toContain('calculateBundleFacts')
    expect(item).toContain('calculateBundleFacts')
  })
  it('supports product quantities, steps, optional status, cover upload, and performance', () => {
    for (const term of ['stepOrder', 'stepLabelRw', 'quantity', 'isOptional', "body.set('folder', 'bundles')", 'totalSales']) expect(manager).toContain(term)
  })
  it('soft deletes bundles rather than destroying order history', () => {
    expect(item).toContain('deletedAt: new Date()')
    expect(item).not.toContain('prisma.bundle.delete(')
  })
})
