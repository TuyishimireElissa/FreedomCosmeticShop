/** Responsive Cloudinary image helpers for FreedomCosmeticShop. */

const CLOUD_NAME = 'dohoc0tmp'
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`

export const IMAGE_PRESETS = {
  CARD_MOBILE: { width: 300, height: 300, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'auto' },
  CARD_TABLET: { width: 400, height: 400, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'auto' },
  CARD_DESKTOP: { width: 500, height: 500, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'auto' },
  DETAIL_MOBILE: { width: 600, height: 600, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  DETAIL_DESKTOP: { width: 900, height: 900, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  THUMBNAIL: { width: 120, height: 120, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'auto' },
  HERO_MOBILE: { width: 750, height: 600, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'auto' },
  HERO_DESKTOP: { width: 1920, height: 600, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'face' },
  ADMIN_THUMB: { width: 80, height: 80, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'auto' },
} as const

export type ImagePreset = keyof typeof IMAGE_PRESETS

export interface StructuredProductImage {
  id?: string
  url: string
  publicId: string
  isPrimary: boolean
  altText: string
  altTextRw?: string | null
  imageType: string
  sortOrder: number
}

export function getCloudinaryUrl(publicId: string, preset: ImagePreset = 'CARD_MOBILE') {
  const normalizedPublicId = publicId.trim().replace(/^\/+/, '')
  if (!normalizedPublicId || normalizedPublicId.includes('://')) return ''
  const selected = IMAGE_PRESETS[preset]
  const transforms = [
    `w_${selected.width}`,
    `h_${selected.height}`,
    `c_${selected.crop}`,
    `g_${selected.gravity}`,
    `q_${selected.quality}`,
    `f_${selected.format}`,
  ].join(',')
  return `${BASE_URL}/${transforms}/${normalizedPublicId}`
}

export function getResponsiveSrcSet(publicId: string, widths = [300, 400, 600, 800]) {
  const normalizedPublicId = publicId.trim().replace(/^\/+/, '')
  if (!normalizedPublicId || normalizedPublicId.includes('://')) return ''
  return widths
    .filter((width) => Number.isInteger(width) && width > 0 && width <= 900)
    .map((width) => `${BASE_URL}/w_${width},q_auto,f_auto/${normalizedPublicId} ${width}w`)
    .join(', ')
}

export function getImageSizes(context: 'card' | 'card_compact' | 'detail' | 'thumbnail' | 'hero' | 'admin') {
  const sizes = {
    card: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
    card_compact: '(max-width: 640px) calc(50vw - 20px), 180px',
    detail: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px',
    thumbnail: '120px',
    hero: '100vw',
    admin: '80px',
  }
  return sizes[context]
}

export function getProductPrimaryImage(product: {
  productImages?: StructuredProductImage[]
  images?: string[]
  name: string
}) {
  if (product.productImages?.length) {
    return product.productImages.find((image) => image.isPrimary) || product.productImages[0]
  }
  if (product.images?.length) {
    return {
      url: product.images[0],
      publicId: '',
      isPrimary: true,
      altText: product.name,
      altTextRw: null,
      imageType: 'PRODUCT',
      sortOrder: 0,
    } satisfies StructuredProductImage
  }
  return null
}

export function getProductImageGallery(product: {
  productImages?: StructuredProductImage[]
  images?: string[]
  name: string
}) {
  if (product.productImages?.length) {
    const typePriority: Record<string, number> = {
      PRODUCT: 0,
      PACKAGING: 1,
      BACK_LABEL: 2,
      SEAL: 3,
      TEXTURE: 4,
      SIZE_SCALE: 5,
      SHADE: 6,
      LIFESTYLE: 7,
      VIDEO_THUMB: 8,
    }
    return [...product.productImages].sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1
      const typeDifference = (typePriority[left.imageType] ?? 99) - (typePriority[right.imageType] ?? 99)
      return typeDifference || left.sortOrder - right.sortOrder
    })
  }
  return (product.images || []).map((url, index) => ({
    url,
    publicId: '',
    isPrimary: index === 0,
    altText: product.name,
    altTextRw: null,
    imageType: 'PRODUCT',
    sortOrder: index,
  } satisfies StructuredProductImage))
}
