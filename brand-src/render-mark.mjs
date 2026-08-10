/**
 * Rasterise the FC monogram from the React component.
 *
 * `src/components/ui/logo.tsx` is the single source of truth: the site renders
 * that SVG inline. Favicons and OpenGraph images cannot consume SVG, so this
 * script extracts the paths straight out of the component and renders two PNG
 * masters for `build-brand-assets.py` to consume.
 *
 * Extracting rather than duplicating matters. A hand-copied SVG beside the
 * component drifts the first time someone nudges a curve, and the drift is
 * invisible until a favicon looks subtly wrong months later.
 *
 *   node brand-src/render-mark.mjs
 *   python3 brand-src/build-brand-assets.py
 *
 * Two masters are produced:
 *   mark-full.png    F + C + profile + leaves, for 128px and above
 *   mark-simple.png  F + C only, for favicons and 24-32px chrome
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const component = join(here, '..', 'src', 'components', 'ui', 'logo.tsx')

/** Turn the component's JSX into standalone SVG markup. */
function toSvg(jsx) {
  return jsx
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')                 // JSX comments
    .replace(/\{`url\(#\$\{rose\}\)`\}/g, '"url(#rose)"')
    .replace(/\{`url\(#\$\{gold\}\)`\}/g, '"url(#gold)"')
    .replace(/id=\{rose\}/g, 'id="rose"')
    .replace(/id=\{gold\}/g, 'id="gold"')
    .replace(/stopColor/g, 'stop-color')
}

const source = readFileSync(component, 'utf8')
const body = source.slice(source.indexOf('      <defs>'), source.lastIndexOf('    </svg>'))

// The detail block is wrapped in {!simplified && (<> ... </>)}; everything
// before it is the F and C that both variants share.
const detailStart = body.indexOf('{!simplified')
const shared = toSvg(body.slice(0, detailStart))
const full = toSvg(body).replace(/\{!simplified && \(\s*<>/, '').replace(/<\/>\s*\)\}/, '')

const wrap = (inner) => `<svg viewBox="0 0 429 317" xmlns="http://www.w3.org/2000/svg">\n${inner}\n</svg>`

writeFileSync(join(here, 'logo-full.svg'), wrap(full))
writeFileSync(join(here, 'logo-simple.svg'), wrap(shared))

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
