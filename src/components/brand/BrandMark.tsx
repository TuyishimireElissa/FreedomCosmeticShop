import Logo, { type LogoSize } from '@/components/ui/logo'

type BrandMarkVariant = 'icon' | 'badge'

export type BrandMarkProps = {
  /** `badge` for 24-32px chrome, `icon` everywhere else. */
  variant?: BrandMarkVariant
  /** Rendered square size in CSS pixels. */
  size?: number
  className?: string
  /** Retained for API compatibility. Inline SVG has nothing to preload, so
   *  this is now a no-op rather than a breaking signature change across the
   *  eleven call sites. */
  priority?: boolean
  /**
   * Decorative by default: these marks nearly always sit beside the words
   * "FreedomCosmeticShop", and a duplicate alt makes screen readers announce
   * the brand twice. Pass an explicit alt when the mark stands alone.
   */
  alt?: string
}

/** Map a pixel size onto the nearest Logo step. Below 32px the Logo component
 *  drops the leaf branch and facial detail, which are unreadable at that
 *  scale — the same reasoning behind the old badge/icon raster split. */
function toLogoSize(pixels: number): LogoSize {
  if (pixels <= 24) return 'sm'
  if (pixels <= 32) return 'md'
  if (pixels <= 64) return 'lg'
  return 'xl'
}

/**
 * The FreedomCosmeticShop "FC" monogram.
 *
 * One component so the logo cannot drift out of sync across the storefront,
 * the admin panel, auth and checkout.
 *
 * Now renders the inline SVG in `ui/logo.tsx` rather than a PNG. The previous
 * raster mark was a rose lotus flower — a different design entirely, with no
 * gold anywhere in it — replaced by the owner-supplied FC monogram.
 *
 * `size` stays a pixel number because eleven call sites pass one. It is
 * mapped to the Logo scale and applied as an explicit height so those call
 * sites keep their existing dimensions.
 */
export default function BrandMark({
  variant = 'icon',
  size = 40,
  className,
  alt,
}: BrandMarkProps) {
  // `badge` used to mean "simplified art for small chrome". The Logo component
  // makes that decision from the rendered size, so the variant only needs to
  // pull the size down when a caller asks for a badge at a large number.
  const pixels = variant === 'badge' ? Math.min(size, 32) : size

  return (
    <Logo
      size={toLogoSize(pixels)}
      label={alt ?? ''}
      className={className}
      style={{ height: pixels, width: 'auto' }}
    />
  )
}
