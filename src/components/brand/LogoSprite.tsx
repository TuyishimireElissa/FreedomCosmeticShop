/**
 * The FC monogram, defined once per page as an SVG sprite.
 *
 * WHY THIS EXISTS
 *
 * The mark is roughly 2,950 characters of path data in its simplified form and
 * 6,500 in full. Inlining a full copy into every product card would put about
 * 138 KB of extra DOM on a 48-product listing — measured, not guessed. That is
 * a real cost on a Rwandan mobile connection, and it is pure duplication:
 * every copy is byte-identical.
 *
 * So the geometry is emitted once inside a hidden <svg>, and each consumer
 * renders a ~40 byte <use href="#..."> reference instead. Browsers paint the
 * referenced symbol exactly as if it were inline.
 *
 * The gradients live here too. A <use> element cannot carry its own gradient
 * definitions, and duplicating them per instance would reintroduce the problem
 * this component exists to solve.
 *
 * MOUNTING
 *
 * Rendered once by SiteChrome, so it is present on every storefront page.
 * Admin routes bypass SiteChrome and use the standalone <Logo> component
 * instead — there is no repetition problem there, so the extra machinery is
 * not worth it.
 *
 * The ids are global to the document by necessity: that is how <use> resolves.
 * They are prefixed `fcs-sprite-` to make collisions with anything else on the
 * page effectively impossible.
 */

import { C_PATH, F_PATH, LEAF_PATHS, PROFILE_PATH } from '@/lib/brand-logo-paths'

/** Referenced by `<use href>`. Exported so consumers cannot typo the id. */
export const SPRITE_FULL_ID = 'fcs-sprite-mark'
export const SPRITE_SIMPLE_ID = 'fcs-sprite-mark-simple'

export default function LogoSprite() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      // display:none would stop some browsers painting referenced symbols, so
      // the sprite is collapsed to zero size and taken out of flow instead.
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fcs-sprite-rose" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#DFA6A0" />
          <stop offset="55%" stopColor="#D07E7A" />
          <stop offset="100%" stopColor="#CA7370" />
        </linearGradient>
        <linearGradient id="fcs-sprite-gold" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#D9B26A" />
          <stop offset="45%" stopColor="#C99B54" />
          <stop offset="100%" stopColor="#A8752D" />
        </linearGradient>
      </defs>

      {/* Full mark: F + C + profile + leaves. */}
      <symbol id={SPRITE_FULL_ID} viewBox="0 0 429 317">
        <path fill="url(#fcs-sprite-gold)" d={C_PATH} />
        {LEAF_PATHS.map((d) => (
          <path key={d.slice(0, 24)} fill="url(#fcs-sprite-gold)" d={d} />
        ))}
        <path fill="url(#fcs-sprite-rose)" d={F_PATH} />
        <path fill="url(#fcs-sprite-rose)" d={PROFILE_PATH} />
      </symbol>

      {/* Simplified: the leaf branch and the facial profile turn to mud below
        * about 32px, which is the only size these small placements use. */}
      <symbol id={SPRITE_SIMPLE_ID} viewBox="0 0 429 317">
        <path fill="url(#fcs-sprite-gold)" d={C_PATH} />
        <path fill="url(#fcs-sprite-rose)" d={F_PATH} />
      </symbol>
    </svg>
  )
}
