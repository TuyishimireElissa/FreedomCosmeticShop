import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const uploadRoute = readFileSync(resolve(process.cwd(), 'src/app/api/admin/products/[id]/images/route.ts'), 'utf8')
const genericUploadRoute = readFileSync(resolve(process.cwd(), 'src/app/api/upload/route.ts'), 'utf8')
const imageRoute = readFileSync(resolve(process.cwd(), 'src/app/api/admin/products/[id]/images/[imageId]/route.ts'), 'utf8')
const productManager = readFileSync(resolve(process.cwd(), 'src/components/admin/AdminProductManager.tsx'), 'utf8')

describe('admin structured product image security', () => {
  it('requires product permissions and uses only the fixed product folder', () => {
    expect(uploadRoute).toContain('requirePermission(PERMISSIONS.PRODUCTS_UPDATE)')
    expect(uploadRoute).toContain("uploadImageBuffer(Buffer.from(await file.arrayBuffer()), 'freedomcosmeticshop/products')")
    expect(uploadRoute).not.toContain("form.get('folder')")
  })

  it('limits file type, file size, image count, and public metadata lengths', () => {
    expect(uploadRoute).toContain('MAX_FILE_BYTES = 10 * 1024 * 1024')
    expect(uploadRoute).toContain("'image/jpeg', 'image/png', 'image/webp'")
    expect(uploadRoute).toContain('if (count >= 20)')
    expect(uploadRoute).toContain('altText.length > 300')
  })

  it('scopes updates/deletions and synchronizes public product image URLs', () => {
    expect(imageRoute).toContain('where: { id: imageId, productId: id }')
    expect(imageRoute).toContain('requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PRODUCT_DELETE)')
    expect(uploadRoute).toContain('images: JSON.stringify(currentImages.map((entry) => entry.url))')
    expect(imageRoute).toContain('images: JSON.stringify(currentImages.map((entry) => entry.url))')
  })

  it('uses a simple direct-upload product form with five-photo limits', () => {
    expect(productManager).toContain("fetch('/api/upload', { method: 'POST', body })")
    expect(productManager).toContain('5 - form.images.length')
    expect(productManager).toContain('10 * 1024 * 1024')
    expect(productManager).toContain('multiple onChange={handlePhotoUpload}')
    expect(productManager).toContain('onDrop={(event) =>')
    expect(productManager).toContain('event.dataTransfer.files')
    expect(genericUploadRoute).toContain('generic-image-upload')
    expect(genericUploadRoute).toContain('maxActions: 20')
    expect(productManager).toContain('Advanced inventory and margin')
    expect(productManager).not.toContain('newImageUrl')
    expect(productManager).not.toContain('Legacy URL images')
    expect(productManager).not.toContain('Manage product images')
  })

  it('deletes Cloudinary assets only from the approved product folder', () => {
    expect(imageRoute).toContain("existing.publicId.startsWith('freedomcosmeticshop/products/')")
  })
})
