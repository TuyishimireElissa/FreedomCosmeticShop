/**
 * The mark on repeating surfaces: product cards, category tiles, bottom nav.
 *
 * The owner asked for the logo in these three places after I had argued
 * against it. Two of my three reasons did not survive checking:
 *
 *   - "a sixth nav item makes tap targets too small" was FALSE. Six items at
 *     320px is 53px each, above the 44px guideline. The real reason not to add
 *     one is that it is unnecessary — the Home tab can carry the mark instead.
 *   - "watermarking fights the photo" was a taste argument, not a constraint.
 *
 * The one real constraint I found by measuring: the mark is ~2,950 characters
 * of path data simplified, so 48 inline copies on a product listing is ~138 KB
 * of extra DOM. Hence the sprite. These tests pin that, and pin the contrast
 * problem the sprite work exposed.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { C_PATH, F_PATH, LEAF_PATHS, PROFILE_PATH } from '@/lib/brand-logo-paths'

const read = (path: string) => readFileSync(path, 'utf8')

/** Source with comments stripped: every file here documents what it replaced,
 *  and a naive substring check matches the prose instead of the code. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const sprite = code('src/components/brand/LogoSprite.tsx')
const logoRef = code('src/components/brand/LogoRef.tsx')
const productCard = code('src/components/storefront/ProductCard.tsx')
const categoryGrid = code('src/components/home/CategoryGrid.tsx')
const bottomNav = code('src/components/layout/BottomNav.tsx')
const siteChrome = code('src/components/layout/SiteChrome.tsx')

describe('the geometry is defined once per page, not once per card', () => {
  it('the sprite carries the real traced paths', () => {
    expect(sprite).toContain('C_PATH')
    expect(sprite).toContain('F_PATH')
    expect(sprite).toContain('PROFILE_PATH')
    expect(sprite).toContain('LEAF_PATHS')
    expect(sprite).toContain("from '@/lib/brand-logo-paths'")
  })

  it('offers a simplified symbol for the small placements', () => {
    // Below ~32px the leaf branch and facial profile turn to mud.
    expect(sprite).toContain('SPRITE_SIMPLE_ID')
    expect(sprite).toContain('SPRITE_FULL_ID')
  })

  it('is mounted once by SiteChrome so every storefront page has it', () => {
    expect(siteChrome).toContain('<LogoSprite />')
    expect(siteChrome).toContain("from '@/components/brand/LogoSprite'")
  })

  it('stays paintable — display:none would break <use> in some browsers', () => {
    expect(sprite).not.toContain("display: 'none'")
    expect(sprite).toContain("position: 'absolute'")
  })

  it('hides the sprite itself from assistive technology', () => {
    expect(sprite).toContain('aria-hidden="true"')
  })
})

describe('repeating placements reference the sprite instead of inlining it', () => {
  it.each([
    ['src/components/storefront/ProductCard.tsx', productCard],
    ['src/components/home/CategoryGrid.tsx', categoryGrid],
    ['src/components/layout/BottomNav.tsx', bottomNav],
  ])('%s uses LogoRef', (_path, source) => {
    expect(source).toContain('<LogoRef')
    expect(source).toContain("from '@/components/brand/LogoRef'")
  })

  it.each([
    ['ProductCard', productCard],
    ['CategoryGrid', categoryGrid],
    ['BottomNav', bottomNav],
  ])('%s never inlines the path data', (_name, source) => {
    // The whole point of the sprite. A regression here is invisible in the
    // UI and only shows up as page weight.
    for (const d of [F_PATH, C_PATH, PROFILE_PATH, ...LEAF_PATHS]) {
      expect(source).not.toContain(d)
    }
  })

  it('LogoRef emits a <use> reference, not paths', () => {
    expect(logoRef).toContain('<use')
    expect(logoRef).toContain('SPRITE_SIMPLE_ID')
    expect(logoRef).not.toContain('<path')
  })

  it('LogoRef keeps the artwork aspect ratio', () => {
    // 429:317. Forcing a square would stretch the F.
    expect(logoRef).toContain('429 / 317')
    expect(logoRef).toContain('Math.round(height * ASPECT)')
  })
})

describe('the mark stays visible on every background it can land on', () => {
  it('photo category tiles put the mark on a white chip', () => {
    // The tile scrim is a bottom-up gradient protecting the caption, so the
    // top-left corner shows the raw photo. Against a beige or skin-tone
    // image the rose measures 1.54:1 and the mark disappears.
    expect(categoryGrid).toMatch(/hasImage \?[\s\S]{0,400}?bg-white\/90[\s\S]{0,200}?<LogoRef/)
  })

  it('colour tiles need no chip and do not get one', () => {
    // They are already pale and flat. A chip there would be visual noise.
    const elseBranch = categoryGrid.slice(categoryGrid.indexOf(') : ('))
    expect(elseBranch).toContain('<LogoRef')
    expect(elseBranch.slice(0, 300)).not.toContain('bg-white/90')
  })
})

describe('the mark does not break the surfaces it sits on', () => {
  it('the product card mark cannot intercept a tap meant for the product', () => {
    expect(productCard).toMatch(/pointer-events-none[^"]*absolute bottom-2 left-2/)
  })

  it('the product card mark avoids the three occupied corners', () => {
    // discount top-left, wishlist top-right, quick view bottom-right.
    const mark = productCard.slice(productCard.indexOf('<LogoRef'))
    expect(mark).toContain('bottom-2 left-2')
  })

  it('the category tile mark cannot intercept a tap', () => {
    expect(categoryGrid).toContain('pointer-events-none absolute left-3 top-3')
  })

  it('the bottom nav still has exactly five items', () => {
    // The mark replaced the Home glyph rather than adding a sixth tab, so
    // every tap target keeps its width — 72px at 360px.
    const list = bottomNav.slice(
      bottomNav.indexOf('const navItems'),
      bottomNav.indexOf('const isActive'),
    )
    expect([...list.matchAll(/kind: '/g)]).toHaveLength(5)
  })

  it('the bottom nav swaps the Home glyph for the mark', () => {
    expect(bottomNav).toMatch(/item\.kind === 'home' \?[\s\S]{0,200}?<LogoRef/)
    // The other four tabs must still render their lucide icon.
    expect(bottomNav).toContain('<Icon size={22}')
  })

  it('the inactive Home mark is dimmed so it does not read as selected', () => {
    // Four grey icons beside one full-colour mark looks like the active tab.
    expect(bottomNav).toMatch(/<LogoRef[^>]*active \? '' : 'opacity-55'/)
  })
})

describe('these marks are decorative', () => {
  it('LogoRef defaults to no accessible name', () => {
    // One label per card would make a screen reader announce the brand 48
    // times on a product listing.
    expect(logoRef).toContain("label = ''")
    expect(logoRef).toContain('aria-hidden={decorative || undefined}')
  })

  it.each([
    ['ProductCard', productCard],
    ['CategoryGrid', categoryGrid],
    ['BottomNav', bottomNav],
  ])('%s does not override the default with a label', (_name, source) => {
    expect(source).not.toMatch(/<LogoRef[^>]*label=/)
  })
})
