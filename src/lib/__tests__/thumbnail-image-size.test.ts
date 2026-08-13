/**
 * Small thumbnails must not download full-size artwork.
 *
 * THE DEFECT. Nine surfaces rendered the stored image straight into a tiny
 * box with no Cloudinary transformation at all:
 *
 *     <img src={item.image} className="h-10 w-10" />
 *
 * The browser fetched the full asset and discarded ~99% of the pixels while
 * painting. Measured against live production data on 2026-08-13:
 *
 *     product photo    1024x1024  120,222 B  ->  w_80    1,893 B   98.4% saved
 *     order snapshot   w_1200     286,104 B  ->  w_80      632 B   99.8% saved
 *     blog cover       w_1200      24,150 B  ->  w_768   8,556 B   64.6% saved
 *
 * The order case is the worst of the three. `OrderItem.image` is a snapshot
 * frozen at checkout, and 8 of the 16 stored snapshots are Cloudinary
 * `/fetch/` URLs with a baked-in `w_1200`. The live database holds orders of
 * 44 and 43 items, so those pages pulled 1200px artwork dozens of times over
 * to paint a column of 56px squares.
 *
 * These assertions read the component source rather than rendering, matching
 * the approach already used by product-image-ratio.test.ts. Every slice is
 * bounds-asserted, and the whole file was mutation-tested: each `expect` was
 * confirmed to fail when the fix is reverted.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { thumbnailImageUrl, optimizedImageUrl, productCardImageUrl } from '@/lib/cloudinary-images'

/** Comments strip out: these files document the transform they replaced. */
const code = (path: string) => {
  const raw = readFileSync(path, 'utf8')
  expect(raw.length, `${path} is empty`).toBeGreaterThan(200)
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

const UPLOAD = 'https://res.cloudinary.com/dohoc0tmp/image/upload/v1784801868/freedomcosmeticshop/products/mi8iahdcfaewqx9ihzbq.jpg'
/** A real stored OrderItem.image value, copied from the live database. */
const FETCH_1200 = 'https://res.cloudinary.com/dohoc0tmp/image/fetch/f_auto,q_auto,w_1200/https://images.unsplash.com/photo-1607602132700-068258431c6c'

describe('thumbnailImageUrl sizes the image to the box', () => {
  it('pins width AND height, so the download matches the rendered box', () => {
    const url = thumbnailImageUrl(UPLOAD, 80)
    expect(url).toContain('w_80')
    expect(url).toContain('h_80')
  })

  it('rewrites a baked-in w_1200 rather than appending to it', () => {
    // This is the whole point: the stored URL already says w_1200. Stacking a
    // second transform would leave the 1200px fetch in place.
    const url = thumbnailImageUrl(FETCH_1200, 56)
    expect(url).toContain('w_56,h_56')
    expect(url).not.toContain('w_1200')
  })

  it('keeps the /fetch/ delivery type intact', () => {
    // Rewriting /fetch/ to /upload/ would 404: the asset is remote, not stored.
    const url = thumbnailImageUrl(FETCH_1200, 56)
    expect(url).toContain('/image/fetch/')
    expect(url).toContain('https://images.unsplash.com/photo-1607602132700-068258431c6c')
  })

  it('pads instead of cropping, so a bottle is never sliced', () => {
    const url = thumbnailImageUrl(UPLOAD, 40)
    expect(url).toContain('c_pad')
    expect(url).toContain('b_auto')
    expect(url).not.toContain('c_fill')
  })

  it('supports a non-square box for the banner row', () => {
    // The admin banner list is h-14 w-20, not a square.
    const url = thumbnailImageUrl(UPLOAD, 80, { height: 56 })
    expect(url).toContain('w_80,h_56')
  })

  it('returns an empty string for no image, never the text "undefined"', () => {
    expect(thumbnailImageUrl(null)).toBe('')
    expect(thumbnailImageUrl(undefined)).toBe('')
    expect(thumbnailImageUrl('')).toBe('')
  })

  it('leaves a blob: preview URL untouched', () => {
    // Admin upload previews are local object URLs; transforming them breaks
    // the preview before the file has even been uploaded.
    const blob = 'blob:https://freedom-cosmetic-shop.vercel.app/abc-123'
    expect(thumbnailImageUrl(blob, 80)).toBe(blob)
  })

  it('leaves a non-Cloudinary host untouched', () => {
    const foreign = 'https://example.com/photo.jpg'
    expect(thumbnailImageUrl(foreign, 80)).toBe(foreign)
  })

  it('clamps an absurd size instead of trusting the caller', () => {
    expect(thumbnailImageUrl(UPLOAD, 99999)).toContain('w_1280,h_1280')
    // A zero size must still produce a padded box. Without the clamp the
    // height falls through as 0, which reads as "no height" and silently
    // drops the URL back to the cropping `c_fill` branch — the exact bug
    // this helper exists to prevent. Caught by mutation testing: asserting
    // only `w_1` let an unclamped implementation pass.
    const zero = thumbnailImageUrl(UPLOAD, 0)
    expect(zero).toContain('w_1,h_1')
    expect(zero).toContain('c_pad')
    expect(zero).not.toContain('c_fill')
  })
})

describe('the existing helpers are not disturbed', () => {
  it('optimizedImageUrl still scales by width only', () => {
    // Hero banners and blog covers are legitimately wide; forcing a square
    // box on them would letterbox the artwork.
    const url = optimizedImageUrl(UPLOAD, 768)
    expect(url).toContain('w_768')
    expect(url).not.toContain('h_768')
    expect(url).not.toContain('c_pad')
  })

  it('productCardImageUrl still delivers the 4:5 card ratio', () => {
    expect(productCardImageUrl(UPLOAD, 500)).toContain('w_500,h_625,c_pad')
  })
})

describe('no surface renders a raw image into a small box', () => {
  const surfaces: Array<[string, string]> = [
    ['order tracking', 'src/components/storefront/TrackOrderView.tsx'],
    ['my orders', 'src/app/account/orders/page.tsx'],
    ['wishlist', 'src/app/account/wishlist/page.tsx'],
    ['wholesale dashboard', 'src/components/wholesale/WholesaleDashboard.tsx'],
    ['admin order detail', 'src/components/admin/AdminView.tsx'],
    ['admin analytics', 'src/components/admin/AdminAnalytics.tsx'],
    ['admin overview', 'src/components/admin/AdminOverview.tsx'],
    ['admin mobile panel', 'src/components/admin/AdminMobilePanel.tsx'],
    ['admin settings banners', 'src/components/admin/AdminSettings.tsx'],
    ['blog post', 'src/components/blog/BlogPostContent.tsx'],
  ]

  it.each(surfaces)('%s passes its image through a sizing helper', (_label, path) => {
    const src = code(path)
    // Every <img src={...}> here must call a helper, not hand over the raw
    // field. This is the regression guard: re-adding `src={item.image}`
    // fails the build.
    const rawBindings = src.match(/<img\s+src=\{(?!thumbnailImageUrl|productCardImageUrl|optimizedImageUrl)[a-zA-Z][^}]*\}/g) || []
    expect(rawBindings, `raw image binding in ${path}: ${rawBindings.join(' | ')}`).toEqual([])
  })

  it('the worst offender — order snapshots — is fixed on all three surfaces', () => {
    // These render OrderItem.image, the field that stores w_1200 URLs.
    for (const path of [
      'src/components/storefront/TrackOrderView.tsx',
      'src/app/account/orders/page.tsx',
      'src/components/admin/AdminView.tsx',
    ]) {
      expect(code(path), `${path} does not size order thumbnails`).toContain('thumbnailImageUrl(item.image')
    }
  })

  it('the wishlist uses the full product-card treatment, not a thumbnail', () => {
    // It is a product grid, not a thumbnail list, so it gets the same 4:5
    // ratio and srcSet as every other product card on the site.
    const src = code('src/app/account/wishlist/page.tsx')
    expect(src).toContain('productCardImageUrl(image,400)')
    expect(src).toContain('productCardSrcSet(image,[300,400,500])')
    expect(src).toContain('aspect-[4/5]')
  })

  it('thumbnails contain rather than crop, matching the cart and bag', () => {
    // CartDrawer was already fixed to object-contain; these lists must agree
    // or the same product looks different from screen to screen.
    for (const path of [
      'src/components/storefront/TrackOrderView.tsx',
      'src/app/account/orders/page.tsx',
      'src/components/admin/AdminView.tsx',
      'src/components/admin/AdminMobilePanel.tsx',
    ]) {
      const src = code(path)
      const thumbTags = src.match(/<img[\s\S]{0,400}?thumbnailImageUrl[\s\S]{0,400}?\/>/g) || []
      expect(thumbTags.length, `no thumbnail <img> found in ${path}`).toBeGreaterThan(0)
      for (const tag of thumbTags) {
        expect(tag, `${path} crops a thumbnail`).not.toContain('object-cover')
      }
    }
  })

  it('every thumbnail defers its download', () => {
    // These sit below the fold in long order lists; eager loading them all
    // is what made a 44-item order slow in the first place.
    for (const path of [
      'src/components/storefront/TrackOrderView.tsx',
      'src/app/account/orders/page.tsx',
      'src/components/wholesale/WholesaleDashboard.tsx',
      'src/components/admin/AdminView.tsx',
    ]) {
      const src = code(path)
      const index = src.indexOf('thumbnailImageUrl(')
      expect(index, `${path} never calls thumbnailImageUrl`).toBeGreaterThan(-1)
      const window = src.slice(index, index + 320)
      expect(window.length, 'slice is empty').toBeGreaterThan(50)
      expect(window, `${path} does not lazy-load its thumbnail`).toContain('loading="lazy"')
    }
  })
})
