/**
 * Generated brand assets carry the FC monogram, not the retired lotus.
 *
 * Every PNG and ICO in /public is produced by
 * `node brand-src/render-mark.mjs && python3 brand-src/build-brand-assets.py`,
 * which reads the paths out of `src/components/ui/logo.tsx`.
 *
 * The check that matters is colour. The lotus mark was single-colour rose with
 * zero gold pixels; the FC monogram is rose *and* gold. Sampling for gold is
 * therefore a reliable way to tell the two brands apart in a binary file, and
 * it fails loudly if someone regenerates from a stale master or restores an
 * old asset from git history.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path)

/**
 * Read the PLTE chunk of an indexed PNG and count brand hues in the palette.
 *
 * An earlier version of this test scanned the raw file bytes for RGB triples.
 * That was wrong and silently useless: PNG pixel data is deflate-compressed,
 * so the scan was sampling entropy. It reported 72 "gold" bytes in the old
 * single-colour lotus favicon, which contains no gold at all, and therefore
 * passed when the lotus assets were restored — the exact regression it
 * existed to catch.
 *
 * The compression step quantises every asset to an indexed palette, so PLTE
 * is uncompressed, authoritative, and tiny. Parsing it properly needs no
 * dependency.
 */
function palette(buffer: Buffer): Array<[number, number, number]> {
  let offset = 8 // skip the PNG signature
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    if (type === 'PLTE') {
      const start = offset + 8
      const entries: Array<[number, number, number]> = []
      for (let i = start; i + 2 < start + length; i += 3) {
        entries.push([buffer[i], buffer[i + 1], buffer[i + 2]])
      }
      return entries
    }
    if (type === 'IEND') break
    offset += 12 + length // length + type + data + crc
  }
  return []
}

function paletteHues(buffer: Buffer): { rose: number; gold: number } {
  let rose = 0
  let gold = 0
  for (const [r, g, b] of palette(buffer)) {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max < 60 || max - min < 25) continue // near-grey or near-black
    if (max !== r) continue // both brand colours are red-dominant
    if (g - b > 40) gold += 1
    else rose += 1
  }
  return { rose, gold }
}

/**
 * Indexed-colour assets only. favicon-16x16 and favicon-32x32 are written as
 * RGBA (colour type 6) to preserve alpha at those sizes, so they carry no
 * PLTE chunk to inspect. Their content is covered instead by the pipeline
 * assertions below, which pin that they are generated with `simple=True`
 * from the same master as everything else.
 */
const ASSETS = [
  'public/apple-touch-icon.png',
  'public/android-chrome-192x192.png',
  'public/android-chrome-512x512.png',
  'public/icon-maskable-512.png',
  'public/logo-icon.png',
  'public/logo-badge.png',
  'public/og-image.png',
]

describe('generated assets carry the two-colour FC monogram', () => {
  it.each(ASSETS)('%s contains gold, which the lotus never had', (path) => {
    const { gold } = paletteHues(read(path))
    expect(gold, `${path} has no gold — is it still the lotus mark?`).toBeGreaterThan(0)
  })

  it.each(ASSETS)('%s still contains rose', (path) => {
    const { rose } = paletteHues(read(path))
    expect(rose, `${path} has no rose`).toBeGreaterThan(0)
  })
})

describe('the pipeline stays reproducible from the shared geometry', () => {
  it('renders the masters from the shared path module, not a hand-copied SVG', () => {
    // The geometry moved out of the .tsx into a plain data module so the
    // component, the invoice generator and this script all read one copy.
    const script = readFileSync('brand-src/render-mark.mjs', 'utf8')
    expect(script).toContain("'src', 'lib', 'brand-logo-paths.ts'")
    expect(script).toContain('mark-full')
    expect(script).toContain('mark-simple')
  })

  it('regenerates public/logo.svg so the stale template logo cannot return', () => {
    const script = readFileSync('brand-src/render-mark.mjs', 'utf8')
    expect(script).toContain("join(here, '..', 'public', 'logo.svg')")
  })

  it('writes traced output back to the data module, not the component', () => {
    const vectorise = readFileSync('brand-src/vectorise-logo.py', 'utf8')
    expect(vectorise).toContain('"src" / "lib" / "brand-logo-paths.ts"')
    // The markers it searches for must match the `export const` form the
    // data module actually uses, or the rewrite silently no-ops.
    expect(vectorise).toContain('"export const F_PATH = \'"')
    expect(vectorise).toContain('"export const LEAF_PATHS = ["')
  })

  it('feeds the generator from those masters', () => {
    const build = readFileSync('brand-src/build-brand-assets.py', 'utf8')
    expect(build).toContain('mark-simple.png" if simple else "mark-full.png')
  })

  it('never flattens the two-colour mark for small sizes', () => {
    // solidify() floods every pixel to flat ROSE. Correct for the lotus,
    // destructive here — it would erase the gold C.
    const build = readFileSync('brand-src/build-brand-assets.py', 'utf8')
    const iconCalls = build.split('\n').filter((line) => line.includes('build_icon(PUB'))
    expect(iconCalls.length).toBeGreaterThan(5)
    for (const call of iconCalls) {
      expect(call, `still dilates: ${call.trim()}`).not.toContain('close=')
    }
  })

  it('uses the simplified art wherever the mark renders small', () => {
    const build = readFileSync('brand-src/build-brand-assets.py', 'utf8')
    for (const asset of ['favicon-16x16', 'favicon-32x32', 'logo-badge']) {
      // Scope to the build_icon call: the filename also appears in the
      // compression loop, which find() would match first.
      const line = build
        .split('\n')
        .find((row) => row.includes('build_icon(PUB') && row.includes(asset))
      expect(line, `no build_icon call for ${asset}`).toBeTruthy()
      expect(line, asset).toContain('simple=True')
    }
  })

  it('measures the OG wordmark instead of trusting a fixed size', () => {
    // The FC mark is 1.35:1 where the lotus was square, so it takes ~250px
    // more of the canvas; the old fixed size pushed "Shop" off the edge.
    const build = readFileSync('brand-src/build-brand-assets.py', 'utf8')
    expect(build).toContain('while f_name.size >')
    expect(build).toContain('_safe')
  })
})

describe('asset dimensions are unchanged', () => {
  it.each([
    ['public/favicon-16x16.png', 16],
    ['public/favicon-32x32.png', 32],
    ['public/apple-touch-icon.png', 180],
    ['public/android-chrome-192x192.png', 192],
    ['public/android-chrome-512x512.png', 512],
  ])('%s is %spx square', (path, size) => {
    // PNG IHDR: width and height are big-endian uint32 at bytes 16 and 20.
    const buffer = read(path)
    expect(buffer.readUInt32BE(16)).toBe(size)
    expect(buffer.readUInt32BE(20)).toBe(size)
  })

  it('the OpenGraph image is still 1200x630', () => {
    const buffer = read('public/og-image.png')
    expect(buffer.readUInt32BE(16)).toBe(1200)
    expect(buffer.readUInt32BE(20)).toBe(630)
  })
})
