/** Responsive Cloudinary image helpers for FreedomCosmeticShop. */

export const CLOUDINARY_CLOUD_NAME = 'dohoc0tmp'
const BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`

export const IMAGE_SIZES = {
  thumbnail: { lowData: 60, mobile: 80, desktop: 120 },
  card: { lowData: 240, mobile: 300, desktop: 500 },
  detail: { lowData: 480, mobile: 600, desktop: 800 },
  hero: { lowData: 480, mobile: 640, desktop: 1280 },
} as const

export const IMAGE_QUALITY = {
  normal: 'auto:good',
  lowData: 'auto:eco',
} as const

export const IMAGE_PRESETS = {
  CARD_MOBILE: { width: 300, height: 300, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  CARD_TABLET: { width: 400, height: 400, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  CARD_DESKTOP: { width: 500, height: 500, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  DETAIL_MOBILE: { width: 600, height: 600, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  DETAIL_DESKTOP: { width: 800, height: 800, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  THUMBNAIL: { width: 120, height: 120, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  HERO_MOBILE: { width: 640, height: 512, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
  HERO_DESKTOP: { width: 1280, height: 640, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'face' },
  ADMIN_THUMB: { width: 80, height: 80, quality: 'auto:good', format: 'auto', crop: 'fill', gravity: 'auto' },
} as const

export type ImagePreset = keyof typeof IMAGE_PRESETS
export type ResponsiveImageContext = keyof typeof IMAGE_SIZES

/**
 * Aspect ratio every product card renders at.
 *
 * 4:5 (0.8), matching the `aspect-[4/5]` box ProductCard already uses. Not the
 * 3:4 some style guides suggest: this catalogue is overwhelmingly square
 * (11 of 14 sampled images are 1:1), and a taller box would shrink every one
 * of them on screen for no gain.
 */
export const PRODUCT_CARD_RATIO = { width: 4, height: 5 } as const

/** Card height for a given width, on the product ratio. */
export function productCardHeight(width: number) {
  return Math.round((width * PRODUCT_CARD_RATIO.height) / PRODUCT_CARD_RATIO.width)
}

export function optimizeCloudinaryUrl(
  source: string,
  { width, quality = IMAGE_QUALITY.normal }: { width: number; quality?: string },
) {
  return buildCloudinaryUrl(source, { width, quality })
}

/**
 * Build a Cloudinary delivery URL.
 *
 * `ratio: true` pins the output to PRODUCT_CARD_RATIO with `c_pad`, so every
 * product image arrives the same shape.
 *
 * WHY c_pad AND NOT c_fill
 *
 * The old transformation was `w_500,c_fill,g_auto` with NO height. Without a
 * height, `c_fill` has no target box, so it only scales: a 480x359 photo came
 * back 500x374 (ratio 1.34) while a 1024x1024 came back 500x500 (ratio 1.00).
 * Dropped into the same `aspect-[4/5]` container with `object-contain`, the
 * wide one shrank to a letterboxed sliver and the square one nearly filled the
 * box — which is exactly the "unequal photo sizes" the owner reported. The
 * containers were always identical; the images inside them were not.
 *
 * Adding a height fixes the ratio, but `c_fill` would crop to reach it. On the
 * measured 1.73-wide image that discards ~54% of the frame. Verified visually
 * on a real product: `c_fill` sliced the "fresh / ANTI-BACTERIAL" wording off
 * a Dettol pack, while `c_pad` kept the whole thing. For cosmetics the label
 * and bottle silhouette are the recognition cue, so nothing may be cropped.
 *
 * `b_auto` fills the padding with a colour sampled from the image edge, so the
 * bars read as background rather than as a grey box. Measured cost: 20 kB vs
 * 17 kB on the wide image, 24 kB unchanged on the square one.
 */
export function buildCloudinaryUrl(
  source: string,
  { width, quality = IMAGE_QUALITY.normal, ratio = false }: { width: number; quality?: string; ratio?: boolean },
) {
  try {
    const url = new URL(source)
    const uploadPrefix = `/${CLOUDINARY_CLOUD_NAME}/image/upload/`
    const fetchPrefix = `/${CLOUDINARY_CLOUD_NAME}/image/fetch/`
    const prefix = url.pathname.startsWith(uploadPrefix)
      ? uploadPrefix
      : url.pathname.startsWith(fetchPrefix)
        ? fetchPrefix
        : null
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !prefix) return source

    const safeWidth = Math.max(1, Math.min(1280, Math.round(width)))
    const safeQuality = quality === IMAGE_QUALITY.lowData ? IMAGE_QUALITY.lowData : IMAGE_QUALITY.normal
    const transformation = ratio
      ? `w_${safeWidth},h_${productCardHeight(safeWidth)},c_pad,b_auto,q_${safeQuality},f_auto,dpr_auto`
      : `w_${safeWidth},c_fill,g_auto,q_${safeQuality},f_auto,dpr_auto`
    const remainder = url.pathname.slice(prefix.length)
    const segments = remainder.split('/')
    const firstSegment = segments[0] || ''
    const hasExistingTransformation = /(?:^|,)(?:w|h|c|g|q|f|b|dpr)_/.test(firstSegment)
    if (hasExistingTransformation) segments.shift()
    url.pathname = `${prefix}${transformation}/${segments.join('/')}`
    return url.toString()
  } catch {
    return source
  }
}

/** Reliable Cloudinary delivery URL for native <img> elements. */
export function optimizedImageUrl(url: string | null | undefined, width = 400, quality: string = IMAGE_QUALITY.normal) {
  if (!url) return ''
  return optimizeCloudinaryUrl(url, { width: Math.max(1, Math.min(1280, Math.round(width))), quality })
}

export function optimizedImageSrcSet(url: string | null | undefined, widths: number[]) {
  if (!url) return ''
  return [...new Set(widths)].filter((width) => width > 0 && width <= 1280)
    .map((width) => `${optimizedImageUrl(url, width)} ${width}w`).join(', ')
}

/**
 * Product card image, normalised to PRODUCT_CARD_RATIO.
 *
 * Separate from `optimizedImageUrl` on purpose: hero banners, category tiles
 * and review photos are legitimately other shapes and must keep the plain
 * width-only transform. Only product imagery is pinned.
 */
export function productCardImageUrl(url: string | null | undefined, width = 400, quality: string = IMAGE_QUALITY.normal) {
  if (!url) return ''
  return buildCloudinaryUrl(url, { width: Math.max(1, Math.min(1280, Math.round(width))), quality, ratio: true })
}

/** Matching srcSet, every entry on the same ratio. */
export function productCardSrcSet(url: string | null | undefined, widths: number[]) {
  if (!url) return ''
  return [...new Set(widths)].filter((width) => width > 0 && width <= 1280)
    .map((width) => `${productCardImageUrl(url, width)} ${width}w`).join(', ')
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
  const safeWidth = Math.max(1, Math.min(1280, Math.round(width)))
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
      .filter((width) => Number.isInteger(width) && width > 0 && width <= 1280)
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
