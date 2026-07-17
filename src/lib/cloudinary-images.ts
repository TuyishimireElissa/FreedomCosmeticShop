/** Responsive Cloudinary image helpers for FreedomCosmeticShop. */

export const CLOUDINARY_CLOUD_NAME = 'dohoc0tmp'
const BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`

export const IMAGE_SIZES = {
  thumbnail: { lowData: 60, mobile: 80, desktop: 120 },
  card: { lowData: 240, mobile: 320, desktop: 640 },
  detail: { lowData: 480, mobile: 640, desktop: 1024 },
  hero: { lowData: 480, mobile: 640, desktop: 1024 },
} as const

export const IMAGE_QUALITY = {
  normal: 'auto:good',
  lowData: 'auto:eco',
} as const

export const IMAGE_PRESETS = {
  CARD_MOBILE: { width: 320, height: 320, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  CARD_TABLET: { width: 640, height: 640, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  CARD_DESKTOP: { width: 640, height: 640, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  DETAIL_MOBILE: { width: 640, height: 640, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  DETAIL_DESKTOP: { width: 1024, height: 1024, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  THUMBNAIL: { width: 120, height: 120, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  HERO_MOBILE: { width: 640, height: 512, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  HERO_DESKTOP: { width: 1024, height: 512, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'face' },
  ADMIN_THUMB: { width: 80, height: 80, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
} as const

export type ImagePreset = keyof typeof IMAGE_PRESETS
export type ResponsiveImageContext = keyof typeof IMAGE_SIZES

export function optimizeCloudinaryUrl(
  source: string,
  { width, quality = IMAGE_QUALITY.normal }: { width: number; quality?: string },
) {
  try {
    const url = new URL(source)
    const uploadPrefix = `/${CLOUDINARY_CLOUD_NAME}/image/upload/`
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(uploadPrefix)) {
      return source
    }
    const safeWidth = Math.max(1, Math.min(1024, Math.round(width)))
    const safeQuality = quality === IMAGE_QUALITY.lowData ? IMAGE_QUALITY.lowData : IMAGE_QUALITY.normal
    const transformation = `w_${safeWidth},c_fill,g_auto,q_${safeQuality},f_auto,dpr_auto`
    url.pathname = url.pathname.replace(uploadPrefix, `${uploadPrefix}${transformation}/`)
    return url.toString()
  } catch {
    return source
  }
}

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

function normalizePublicId(publicId: string) {
  const normalized = publicId.trim().replace(/^\/+/, '')
  return !normalized || normalized.includes('://') || normalized.includes('..') ? '' : normalized
}

export function buildImageUrl({
  publicId,
  width,
  height,
  quality = IMAGE_QUALITY.normal,
  crop = 'fill',
  format = 'auto',
  gravity = 'auto',
}: {
  publicId: string
  width: number
  height?: number
  quality?: string
  crop?: string
  format?: string
  gravity?: string
}) {
  const normalizedPublicId = normalizePublicId(publicId)
  if (!normalizedPublicId) return ''
  const safeWidth = Math.max(1, Math.min(1024, Math.round(width)))
  const safeHeight = height ? Math.max(1, Math.min(1024, Math.round(height))) : undefined
  const safeQuality = quality === IMAGE_QUALITY.lowData ? IMAGE_QUALITY.lowData : IMAGE_QUALITY.normal
  const transforms = [
    `w_${safeWidth}`,
    safeHeight && `h_${safeHeight}`,
    `c_${crop}`,
    `g_${gravity}`,
    `q_${safeQuality}`,
    `f_${format}`,
    'dpr_auto',
  ].filter(Boolean).join(',')
  return `${BASE_URL}/${transforms}/${normalizedPublicId}`
}

export function getCloudinaryUrl(publicId: string, preset: ImagePreset = 'CARD_MOBILE') {
  const selected = IMAGE_PRESETS[preset]
  return buildImageUrl({
    publicId,
    width: selected.width,
    height: selected.height,
    quality: selected.quality,
    crop: selected.crop,
    format: selected.format,
    gravity: selected.gravity,
  })
}

interface ResponsiveOptions {
  context: ResponsiveImageContext
  isLowData?: boolean
  aspectRatio?: number
}
interface ResponsiveResult { src: string; srcSet: string; sizes: string }

export function getResponsiveSrcSet(publicId: string, widths?: number[]): string
export function getResponsiveSrcSet(publicId: string, options: ResponsiveOptions): ResponsiveResult
export function getResponsiveSrcSet(publicId: string, widthsOrOptions: number[] | ResponsiveOptions = [320, 640, 1024]): string | ResponsiveResult {
  const normalizedPublicId = normalizePublicId(publicId)
  if (!normalizedPublicId) return Array.isArray(widthsOrOptions) ? '' : { src: '', srcSet: '', sizes: '' }

  if (Array.isArray(widthsOrOptions)) {
    return [...new Set(widthsOrOptions)]
      .filter((width) => Number.isInteger(width) && width > 0 && width <= 1024)
      .map((width) => `${buildImageUrl({ publicId: normalizedPublicId, width })} ${width}w`)
      .join(', ')
  }

  const { context, isLowData = false, aspectRatio } = widthsOrOptions
  const configured = IMAGE_SIZES[context]
  const quality = isLowData ? IMAGE_QUALITY.lowData : IMAGE_QUALITY.normal
  const widths = [...new Set(isLowData
    ? [configured.lowData, configured.mobile]
    : [configured.mobile, configured.desktop])]
  const heightFor = (width: number) => aspectRatio && aspectRatio > 0 ? Math.round(width / aspectRatio) : undefined
  const srcSet = widths.map((width) => `${buildImageUrl({ publicId: normalizedPublicId, width, height: heightFor(width), quality })} ${width}w`).join(', ')
  const defaultWidth = widths[widths.length - 1]
  return {
    src: buildImageUrl({ publicId: normalizedPublicId, width: defaultWidth, height: heightFor(defaultWidth), quality }),
    srcSet,
    sizes: context === 'hero'
      ? '100vw'
      : context === 'detail'
        ? '(max-width: 768px) 100vw, 50vw'
        : context === 'thumbnail'
          ? `${configured.desktop}px`
          : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  }
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
