/**
 * The FC monogram as an SVG **markup string**.
 *
 * Most of the site renders the mark through the React component in
 * `components/ui/logo.tsx`. Two places cannot: the printed invoice builds a
 * whole HTML document as a string and writes it into a popup window, and any
 * future email or PDF template will have the same constraint.
 *
 * This module exists so those places do not each hand-copy the path data. The
 * geometry is imported from the component, so a re-run of
 * `brand-src/vectorise-logo.py` updates every consumer at once. A second copy
 * of the `d` strings would drift the first time the artwork changed, and the
 * drift would only surface on a customer's printed invoice.
 *
 * Gradient ids take a prefix because a printed invoice may contain several
 * marks in one document, and duplicate ids make every instance after the
 * first inherit the first one's paint.
 */

import { C_PATH, F_PATH, LEAF_PATHS, PROFILE_PATH } from '@/lib/brand-logo-paths'

export interface LogoMarkupOptions {
  /** Rendered height in CSS pixels. Width follows the 429:317 aspect. */
  height?: number
  /** Namespace for the gradient ids. Must be unique per document. */
  idPrefix?: string
  /**
   * Drop the leaf branch and the facial profile, matching what the component
   * does at 32px and below where that detail turns to mud.
   */
  simple?: boolean
  /** Accessible name. Pass '' when adjacent text already names the brand. */
  label?: string
}

/** Aspect ratio of the reference artwork, 429x317. */
const ASPECT = 429 / 317

export function logoSvgMarkup({
  height = 48,
  idPrefix = 'fcs',
  simple = false,
  label = 'Freedom Cosmetic Shop',
}: LogoMarkupOptions = {}): string {
  const rose = `${idPrefix}-rose`
  const gold = `${idPrefix}-gold`
  const width = Math.round(height * ASPECT)
  const decorative = label === ''

  const gold_paths = [
    `<path fill="url(#${gold})" d="${C_PATH}"/>`,
    ...(simple ? [] : LEAF_PATHS.map((d) => `<path fill="url(#${gold})" d="${d}"/>`)),
  ]
  const rose_paths = [
    `<path fill="url(#${rose})" d="${F_PATH}"/>`,
    ...(simple ? [] : [`<path fill="url(#${rose})" d="${PROFILE_PATH}"/>`]),
  ]

  // Gold first: the rose profile overlaps the crescent's inner edge. Same
  // paint order as the component.
  return [
    `<svg viewBox="0 0 429 317" width="${width}" height="${height}"`,
    decorative ? ' role="presentation" aria-hidden="true"' : ` role="img" aria-label="${label}"`,
    ' xmlns="http://www.w3.org/2000/svg">',
    decorative ? '' : `<title>${label}</title>`,
    `<defs>`,
    `<linearGradient id="${rose}" x1="0" y1="0" x2="0.35" y2="1">`,
    `<stop offset="0%" stop-color="#DFA6A0"/><stop offset="55%" stop-color="#D07E7A"/><stop offset="100%" stop-color="#CA7370"/>`,
    `</linearGradient>`,
    `<linearGradient id="${gold}" x1="0.1" y1="0" x2="0.9" y2="1">`,
    `<stop offset="0%" stop-color="#D9B26A"/><stop offset="45%" stop-color="#C99B54"/><stop offset="100%" stop-color="#A8752D"/>`,
    `</linearGradient>`,
    `</defs>`,
    ...gold_paths,
    ...rose_paths,
    `</svg>`,
  ].join('')
}
