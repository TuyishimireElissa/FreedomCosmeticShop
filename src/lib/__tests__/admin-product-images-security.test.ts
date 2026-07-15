import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const uploadRoute = readFileSync(resolve(process.cwd(), 'src/app/api/admin/products/[id]/images/route.ts'), 'utf8')
const imageRoute = readFileSync(resolve(process.cwd(), 'src/app/api/admin/products/[id]/images/[imageId]/route.ts'), 'utf8')

describe('admin structured product image security', () => {
  it('requires product permissions and uses only the fixed product folder', () => {
    expect(uploadRoute).toContain('requirePermission(PERMISSIONS.PRODUCTS_UPDATE)')
    expect(uploadRoute).toContain("folder: 'freedomcosmeticshop/products'")
    expect(uploadRoute).not.toContain("form.get('folder')")
  })

  it('limits file type, file size, image count, and public metadata lengths', () => {
    expect(uploadRoute).toContain('MAX_FILE_BYTES = 8 * 1024 * 1024')
    expect(uploadRoute).toContain("'image/jpeg', 'image/png', 'image/webp'")
    expect(uploadRoute).toContain('if (count >= 20)')
    expect(uploadRoute).toContain('altText.length > 300')
  })

  it('scopes updates and deletions to both product and image identifiers', () => {
    expect(imageRoute).toContain('where: { id: imageId, productId: id }')
    expect(imageRoute).toContain('requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PRODUCT_DELETE)')
  })

  it('deletes Cloudinary assets only from the approved product folder', () => {
    expect(imageRoute).toContain("existing.publicId.startsWith('freedomcosmeticshop/products/')")
  })
})
