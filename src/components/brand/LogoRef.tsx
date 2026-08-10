/**
 * A reference to the sprite-defined FC monogram.
 *
 * Renders ~40 bytes of markup instead of a ~2,950 character copy of the path
 * data. Use this anywhere the mark repeats many times on one page — product
 * cards, category tiles — and use the ordinary <Logo> component everywhere it
 * appears once.
 *
 * Requires <LogoSprite /> to be mounted in the same document. SiteChrome does
 * that for every storefront page. Admin routes bypass SiteChrome, so use
 * <Logo> there instead.
 */

import { SPRITE_FULL_ID, SPRITE_SIMPLE_ID } from '@/components/brand/LogoSprite'

/** Aspect ratio of the reference artwork, 429x317. */
const ASPECT = 429 / 317

export interface LogoRefProps {
  /** Rendered height in CSS pixels. Width follows the artwork aspect. */
  height?: number
  /** Drop the leaf branch and facial profile. Default below 33px, where that
   *  detail is unreadable anyway. */
  simple?: boolean
  className?: string
  /**
   * Accessible name. Defaults to empty because these placements sit beside a
   * product or category name that already carries the meaning — a label here
   * would make a screen reader read the brand once per card.
   */
  label?: string
}

export default function LogoRef({ height = 16, simple, className, label = '' }: LogoRefProps) {
  const useSimple = simple ?? height <= 32
  const decorative = label === ''

  return (
    <svg
      height={height}
      width={Math.round(height * ASPECT)}
      className={className}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      {!decorative && <title>{label}</title>}
      <use href={`#${useSimple ? SPRITE_SIMPLE_ID : SPRITE_FULL_ID}`} />
    </svg>
  )
}
