import { describe, expect, it } from 'vitest'
import { PUBLIC_PRODUCT_SELECT } from '@/lib/public-product'

const ADMIN_ONLY_FIELDS = [
  'costPrice',
  'supplierId',
  'supplier',
  'batchNumber',
  'manufacturedDate',
  'expiryDate',
  'batches',
] as const

describe('public product field allow-list', () => {
  it('does not select admin-only inventory or margin fields', () => {
    for (const field of ADMIN_ONLY_FIELDS) {
      expect(PUBLIC_PRODUCT_SELECT).not.toHaveProperty(field)
    }
  })

  it('selects structured public images without batch or supplier relations', () => {
    expect(PUBLIC_PRODUCT_SELECT.productImages).toBeTruthy()
    expect(PUBLIC_PRODUCT_SELECT).not.toHaveProperty('productBatches')
  })
})
