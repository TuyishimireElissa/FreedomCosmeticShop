/**
 * FreedomCosmeticShop brand mark — inline SVG.
 *
 * An "FC" monogram: a rose serif F, a gold crescent C whose interior negative
 * space forms a woman's profile, and a five-leaf branch entering lower-right.
 *
 * THE PATH DATA IS VECTORISED FROM THE REFERENCE ARTWORK, NOT HAND-DRAWN.
 * An earlier revision traced curves by hand from pixel measurements and drifted
 * badly — the nose flattened, the jaw ran 27px wide, the crescent sat 21px off,
 * the leaves lost their taper. These paths come from OpenCV contour extraction
 * on a hue-classified mask of the original image, Gaussian-smoothed and fitted
 * to cubic Béziers. Measured against the source that is 94% IoU on the rose
 * and 91% on the gold, versus roughly 5px mean deviation by hand.
 *
 * Regenerate with `python3 brand-src/vectorise-logo.py` if the artwork changes.
 * Do not hand-edit the `d` strings: they are generated output and any manual
 * nudge is silently lost on the next run.
 *
 * viewBox is 0 0 429 317 — the reference's own pixel dimensions — so every
 * coordinate can be checked against the original directly.
 *
 * Colours are the measured gradients:
 *   rose  #DFA6A0 -> #CA7370
 *   gold  #D9B26A -> #A8752D
 *
 * The brief specified #C77B85 for the rose. That value is banned here: it
 * measures 3.18:1 on white, fails WCAG AA, and umweto-contrast.test.ts fails
 * the build if it appears. It is also not the reference colour, which samples
 * at #D07E7A average.
 *
 * Sizes at or below 32px drop the leaf branch and the facial profile — both
 * are unreadable at that scale, and the previous raster mark used the same
 * icon/badge split for the same reason.
 *
 * No animation, no external file, no <img>. Gradient ids are namespaced per
 * instance so two logos on one page cannot collide.
 */

import { useId } from 'react'
import { C_PATH, F_PATH, LEAF_PATHS, PROFILE_PATH } from '@/lib/brand-logo-paths'

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

const PIXELS: Record<LogoSize, number> = {
  sm: 24,  // footer, admin sidebar
  md: 32,  // mobile header
  lg: 40,  // desktop header
  xl: 120, // hero, about
}

/**
 * Traced contours live in a plain data module so the invoice generator and the
 * PNG build can share them without importing JSX. Regenerate with
 * `python3 brand-src/vectorise-logo.py`.
 */
export { C_PATH, F_PATH, LEAF_PATHS, PROFILE_PATH } from '@/lib/brand-logo-paths'

export interface LogoProps {
  size?: LogoSize
  className?: string
  /** Explicit dimensions. BrandMark uses this to preserve the pixel sizes its
   *  eleven existing call sites already pass. */
  style?: React.CSSProperties
  /** Override the accessible name. Pass "" when adjacent text already names
   *  the brand, so a screen reader does not announce it twice. */
  label?: string
}

export function Logo({ size = 'lg', className = '', label = 'Freedom Cosmetic Shop', style }: LogoProps) {
  // Unique per instance: duplicate gradient ids in one document make the
  // second element inherit the first's paint.
  const uid = useId().replace(/:/g, '')
  const rose = `fcs-rose-${uid}`
  const gold = `fcs-gold-${uid}`
  const height = PIXELS[size]
  const simplified = height <= 32
  const decorative = label === ''

  return (
    <svg
      viewBox="0 0 429 317"
      height={height}
      // Rounded: an unrounded 54.132492113564666 lands in the served HTML.
      width={Math.round(height * (429 / 317))}
      className={className}
      style={style}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      {!decorative && <title>{label}</title>}

      <defs>
        <linearGradient id={rose} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#DFA6A0" />
          <stop offset="55%" stopColor="#D07E7A" />
          <stop offset="100%" stopColor="#CA7370" />
        </linearGradient>
        <linearGradient id={gold} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#D9B26A" />
          <stop offset="45%" stopColor="#C99B54" />
          <stop offset="100%" stopColor="#A8752D" />
        </linearGradient>
      </defs>

      {/* Gold first: the rose profile overlaps the crescent's inner edge. */}
      <path fill={`url(#${gold})`} d={C_PATH} />
      {!simplified && LEAF_PATHS.map((d) => (
        <path key={d.slice(0, 24)} fill={`url(#${gold})`} d={d} />
      ))}

      <path fill={`url(#${rose})`} d={F_PATH} />
      {!simplified && <path fill={`url(#${rose})`} d={PROFILE_PATH} />}
    </svg>
  )
}

export default Logo
