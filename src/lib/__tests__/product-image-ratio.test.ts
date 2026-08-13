/**
 * Product photos render at one consistent size.
 *
 * THE REPORT: "unequal product photo sizes across the site".
 *
 * THE ACTUAL CAUSE — not what the brief assumed. The card CONTAINERS were
 * already identical: ProductCard has always used a fixed `aspect-[4/5]` box.
 * The images inside them were not.
 *
 * `optimizeCloudinaryUrl` emitted `w_500,c_fill,g_auto` with NO height. Without
 * a target height `c_fill` cannot crop to a box — it only scales. Measured on
 * live product images:
 *
 *     480x359  ->  500x374   ratio 1.34
 *     1024x1024 -> 500x500   ratio 1.00
 *
 * Both then dropped into the same 4:5 container with `object-contain` and
 * `p-4`. The wide one shrank to a letterboxed sliver; the square one nearly
 * filled the frame. Same box, visibly different product sizes.
 *
 * THE FIX: pin height as well as width and pad rather than crop —
 * `w_N,h_N*1.25,c_pad,b_auto`. Every product image now arrives at exactly 4:5,
 * so the card can use `object-cover` and fill the frame with nothing cut off.
 *
 * WHY PAD, NOT CROP. `c_fill` would also give a uniform ratio, but on the
 * measured 1.73-wide image it discards ~54% of the frame. Verified visually on
 * a real product: crop sliced the "fresh / ANTI-BACTERIAL" wording off a Dettol
 * pack; pad kept the whole thing. For cosmetics the label and bottle silhouette
 * are the recognition cue.
 *
 * Measured cost of padding: 20 kB vs 17 kB on the wide image, 24 kB unchanged
 * on a square one.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PRODUCT_CARD_RATIO,
  productCardHeight,
  productCardImageUrl,
  productCardSrcSet,
  optimizedImageUrl,
} from '@/lib/cloudinary-images'

const read = (path: string) => readFileSync(path, 'utf8')

/** Comments stripped: these files document the old transform in prose. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const card = code('src/components/storefront/ProductCard.tsx')
const drawer = code('src/components/storefront/CartDrawer.tsx')
const SAMPLE = 'https://res.cloudinary.com/dohoc0tmp/image/upload/v1/freedomcosmeticshop/products/abc123'

describe('every product card image is delivered at one ratio', () => {
  it('pins both width and height', () => {
    // The old transform set width only, which is why nothing was normalised.
    const url = productCardImageUrl(SAMPLE, 500)
    expect(url).toContain('w_500')
    expect(url).toContain('h_625')
  })

  it('computes height from the shared ratio, not a magic number', () => {
    expect(productCardHeight(400)).toBe(500)
    expect(productCardHeight(300)).toBe(375)
    expect(PRODUCT_CARD_RATIO.width / PRODUCT_CARD_RATIO.height).toBeCloseTo(0.8)
  })

  it('every srcSet entry keeps the same ratio', () => {
    // A mixed-ratio srcSet would make the card jump shape as the browser
    // swaps sources on resize.
    const set = productCardSrcSet(SAMPLE, [300, 400, 500])
    for (const [w, h] of [[300, 375], [400, 500], [500, 625]]) {
      expect(set, `missing ${w}x${h}`).toContain(`w_${w},h_${h}`)
    }
  })

  it('pads instead of cropping', () => {
    const url = productCardImageUrl(SAMPLE, 500)
    expect(url).toContain('c_pad')
    expect(url).not.toContain('c_fill')
    // b_auto samples the edge colour so the bars read as background rather
    // than a grey box.
    expect(url).toContain('b_auto')
  })

  it('never crops product imagery, at any width', () => {
    for (const width of [80, 300, 500, 1280]) {
      expect(productCardImageUrl(SAMPLE, width), `crops at ${width}`).not.toContain('c_fill')
    }
  })
})

describe('non-product imagery is left alone', () => {
  it('the generic helper still scales by width only', () => {
    // Hero banners and category tiles are legitimately other shapes; forcing
    // 4:5 on a 16:9 banner would letterbox it.
    const url = optimizedImageUrl(SAMPLE, 1280)
    expect(url).toContain('w_1280')
    expect(url).not.toContain('h_1600')
    expect(url).not.toContain('c_pad')
  })

  it('a non-Cloudinary source is returned untouched', () => {
    const foreign = 'https://example.com/photo.jpg'
    expect(productCardImageUrl(foreign, 500)).toBe(foreign)
  })

  it('an empty source yields an empty string, never "undefined"', () => {
    expect(productCardImageUrl(null, 500)).toBe('')
    expect(productCardSrcSet(undefined, [300])).toBe('')
  })

  it('replaces an existing transformation rather than stacking one', () => {
    // Double-transforming would apply c_pad to an already padded image.
    const already = 'https://res.cloudinary.com/dohoc0tmp/image/upload/w_100,c_fill/v1/x/y'
    const url = productCardImageUrl(already, 500)
    expect(url).toContain('w_500,h_625,c_pad')
    expect(url).not.toContain('w_100')
  })
})

describe('the card renders the padded image edge to edge', () => {
  it('uses the ratio-locked helpers', () => {
    expect(card).toContain('productCardImageUrl(imageUrl, 500)')
    expect(card).toContain('productCardSrcSet(imageUrl, [300, 400, 500])')
  })

  it('keeps the fixed 4:5 container', () => {
    expect(card).toContain('aspect-[4/5]')
  })

  it('fills the frame instead of shrinking inside it', () => {
    // object-contain + p-4 on an already padded image would pad it twice and
    // leave the product smaller than the box again.
    expect(card).toContain('object-cover')
    expect(card).not.toContain('object-contain p-4')
  })

  it('respects reduced motion on the hover zoom', () => {
    expect(card).toContain('motion-reduce:group-hover:scale-100')
  })
})

describe('thumbnails agree with each other', () => {
  it('the cart drawer no longer crops where the bag page does not', () => {
    // The drawer used object-cover on a square box while /cart used
    // object-contain, so the same item looked different in each.
    expect(drawer).toContain('object-contain')
    expect(drawer).not.toMatch(/className="h-full w-full object-cover"/)
  })
})
