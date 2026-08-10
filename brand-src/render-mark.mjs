/**
 * Rasterise the FC monogram from the React component.
 *
 * `src/components/ui/logo.tsx` is the single source of truth: the site renders
 * that SVG inline. Favicons and OpenGraph images cannot consume SVG, so this
 * script reads the traced path constants out of the component and renders two
 * PNG masters for `build-brand-assets.py`.
 *
 * Reading the constants rather than keeping a second copy of the geometry
 * matters: a duplicated SVG beside the component drifts the first time someone
 * regenerates one and not the other, and the drift stays invisible until a
 * favicon looks subtly wrong months later.
 *
 *   python3 brand-src/vectorise-logo.py   # artwork  -> path constants
 *   node    brand-src/render-mark.mjs     # constants -> PNG masters
 *   python3 brand-src/build-brand-assets.py
 *
 * Two masters are produced:
 *   mark-full.png    F + C + profile + leaves, for 128px and above
 *   mark-simple.png  F + C only, matching what the component renders at <=32px
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const component = join(here, '..', 'src', 'components', 'ui', 'logo.tsx')

/** Read a single-quoted string constant out of the component. */
function constant(source, name) {
  const marker = `const ${name} = '`
  const start = source.indexOf(marker)
  if (start === -1) throw new Error(`${name} not found in logo.tsx`)
  const from = start + marker.length
  return source.slice(from, source.indexOf("'", from))
}

/** Read the LEAF_PATHS array. */
function leafPaths(source) {
  const marker = 'const LEAF_PATHS = ['
  const start = source.indexOf(marker)
  if (start === -1) throw new Error('LEAF_PATHS not found in logo.tsx')
  const block = source.slice(start + marker.length, source.indexOf(']', start))
  return [...block.matchAll(/'([^']+)'/g)].map((match) => match[1])
}

const GRADIENTS = `  <defs>
    <linearGradient id="rose" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="#DFA6A0"/>
      <stop offset="55%" stop-color="#D07E7A"/>
      <stop offset="100%" stop-color="#CA7370"/>
    </linearGradient>
    <linearGradient id="gold" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="#D9B26A"/>
      <stop offset="45%" stop-color="#C99B54"/>
      <stop offset="100%" stop-color="#A8752D"/>
    </linearGradient>
  </defs>`

const wrap = (inner) =>
  `<svg viewBox="0 0 429 317" xmlns="http://www.w3.org/2000/svg">\n${inner}\n</svg>`

const source = readFileSync(component, 'utf8')
const fPath = constant(source, 'F_PATH')
const cPath = constant(source, 'C_PATH')
const profilePath = constant(source, 'PROFILE_PATH')
const leaves = leafPaths(source)

// Gold first: the rose profile overlaps the crescent's inner edge, matching
// the paint order in the component.
const full = [
  GRADIENTS,
  `  <path fill="url(#gold)" d="${cPath}"/>`,
  ...leaves.map((d) => `  <path fill="url(#gold)" d="${d}"/>`),
  `  <path fill="url(#rose)" d="${fPath}"/>`,
  `  <path fill="url(#rose)" d="${profilePath}"/>`,
].join('\n')

const simple = [
  GRADIENTS,
  `  <path fill="url(#gold)" d="${cPath}"/>`,
  `  <path fill="url(#rose)" d="${fPath}"/>`,
].join('\n')

writeFileSync(join(here, 'logo-full.svg'), wrap(full))
writeFileSync(join(here, 'logo-simple.svg'), wrap(simple))

// 2048px tall: four times the largest consumer (512px), so every downsample
// has headroom and none of them upscale.
for (const name of ['full', 'simple']) {
  const out = join(here, `mark-${name}.png`)
  await sharp(join(here, `logo-${name}.svg`), { density: 600 })
    .resize({ height: 2048, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out)
  const meta = await sharp(out).metadata()
  console.log(`  brand-src/mark-${name}.png  ${meta.width}x${meta.height}`)
}
