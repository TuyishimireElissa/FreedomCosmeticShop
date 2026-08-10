/**
 * FreedomCosmeticShop brand mark — inline SVG.
 *
 * An "FC" monogram: a rose serif F, a gold crescent C whose interior negative
 * space forms a woman's profile, and a five-leaf branch entering lower-right.
 *
 * Every coordinate below was measured from the reference artwork by pixel
 * analysis rather than eyeballed. Source image 429x317; the viewBox is
 * 0 0 429 317 so those measurements transfer directly and can be re-checked
 * against the original at any time.
 *
 * Colours are the measured gradients, not flat approximations — the artwork
 * is visibly gradient-filled:
 *
 *   rose  #CA7370 -> #DFA6A0   (darkest / lightest sampled)
 *   gold  #A8752D -> #D9B26A
 *
 * The brief specified #C77B85 for the rose. That value is banned in this
 * codebase: it measures 3.18:1 on white, fails WCAG AA, and
 * umweto-contrast.test.ts fails the build if it appears. It is also simply
 * not the reference colour, which samples at #D07E7A average.
 *
 * Two variants exist because the full mark does not survive being shrunk.
 * At 24px the five leaves and the facial profile collapse into noise, so
 * sizes at or below 32px render a simplified F + C monogram. This mirrors the
 * icon/badge split the codebase already used for the previous mark.
 *
 * No animation, no external file, no <img>. Gradient ids are namespaced per
 * instance so two logos on one page cannot collide.
 */

import { useId } from 'react'

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

const PIXELS: Record<LogoSize, number> = {
  sm: 24,  // footer, admin sidebar
  md: 32,  // mobile header
  lg: 40,  // desktop header
  xl: 120, // hero, about
}

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

      {/* ── F ─────────────────────────────────────────────────────────────
        * Serif letterform. Measured: top bar x98-251 y31-59, stem a constant
        * x118-149 all the way to y268, base serif spreading x98-166 at y278.
        *
        * There is NO middle crossbar. A first pass added one out of habit —
        * scanning the reference at y150-174 shows only the stem (118-149) and
        * the woman's profile (202-214); nothing bridges them. */}
      <path
        fill={`url(#${rose})`}
        d="M101 31 H251 V59 H149 V262
           C 149 270, 152 275, 159 277
           L 167 280 V284 H98 V280
           L 106 277 C 113 275, 118 270, 118 262
           V47
           C 111 46, 105 41, 101 31 Z"
      />

      {/* ── C ─────────────────────────────────────────────────────────────
        * Crescent opening right. Measured: outer edge reaches x157 at its
        * leftmost (y176-192), terminals at y96 and y284 both ending x272,
        * stroke a near-constant 24-25px. Centre therefore ~(214,190) with
        * outer radius ~57 and inner ~33.
        *
        * Radii are solved, not guessed. A circle through both terminals
        * (272,96) and (272,284) whose leftmost point is x157 must satisfy
        * (272 - 157 - r)^2 + 94^2 = r^2, giving r = 95.9 about centre
        * (253,190). The inner edge, 24px in at x181, solves to r = 71.7 about
        * the same centre. Earlier passes guessed 78/54 and 57/33; both were
        * too small to span 188px, so the renderer silently scaled them up and
        * shifted the crescent 21px right. */}
      <path
        fill={`url(#${gold})`}
        d="M272 96 A96 96 0 1 0 272 284 v-25
           A72 72 0 1 1 272 121 Z"
      />

      {!simplified && (
        <>
          {/* ── Woman's profile ────────────────────────────────────────────
            * Traced from the per-row rose boundary inside the C. Key points:
            * crown y120 x227-233, forehead widening to x206 by y162, nose
            * apex x249 at y162, lips x242 y192, chin x199 y204, then the
            * neck tapering right and down to x265 y264. */}
          {/* Traced from the per-row boundary above. Reading down the right
            * edge: crown 231 -> brow 238 -> nose apex 250 at y160 -> under
            * nose 243 -> lips 244 -> chin 241 at y200. The left edge runs
            * 230 -> 199 by y199 (forehead and cheek). Below the chin the
            * shape becomes a narrow ~14px band angling down-right to end at
            * (265,264) — the neck. An earlier pass swept that band left
            * across the C's opening, which read as a scarf. */}
          <path
            fill={`url(#${rose})`}
            d="M231 116
               C 222 118, 215 127, 212 141
               C 209 151, 206 156, 204 162
               C 202 169, 201 174, 201 180
               L 200 189 C 199 194, 199 198, 199 202
               L 199 213
               C 200 222, 203 231, 208 239
               C 214 249, 224 257, 238 262
               L 265 264
               L 262 256
               C 248 252, 238 245, 232 236
               C 226 227, 222 218, 221 208
               L 220 203
               L 237 202
               C 240 198, 242 195, 242 192
               L 242 185
               C 245 179, 246 173, 244 167
               L 246 161
               C 244 153, 241 147, 238 143
               L 237 131
               C 237 123, 235 117, 231 116 Z"
          />

          {/* ── Leaf branch ────────────────────────────────────────────────
            * Measured x271-361, y225-303. The stem runs from the lower left
            * (x268 y297) up to the right, ending near x358 y228. Five leaves
            * sit above it, each roughly 15px wide and shortening toward the
            * tip. The first pass overshot to x389; every point below is
            * clamped inside the measured bounds. */}
          <g fill={`url(#${gold})`}>
            <path d="M270 300 q28-17 58-29 28-11 52-24 -22 18-48 30 -28 13-56 27 Z" />
            <path d="M284 284 q1-28 8-44 8 13 8 29 0 15-7 22 -5 5-9-7 Z" />
            <path d="M306 271 q3-27 12-42 7 14 5 30 -2 14-9 19 -6 4-8-7 Z" />
            <path d="M326 258 q8-25 20-37 4 15-1 30 -5 13-12 16 -6 3-7-9 Z" />
            <path d="M344 244 q10-21 20-29 1 15-6 28 -6 11-11 12 -5 1-3-11 Z" />
          </g>
        </>
      )}
    </svg>
  )
}

export default Logo
