/**
 * Every indexable page needs its own title and description.
 *
 * THE DEFECT, measured against live production on 2026-08-13.
 *
 * /bundles, /track-order and /quiz exported no metadata at any level, so
 * Next fell back to the site default and all three served the byte-identical
 * homepage title and description:
 *
 *     FreedomCosmeticShop | Ibicuruzwa by'Ubwiza mu Rwanda
 *     Gura ibita ku ruhu, ibikoresho byo kwisiga n'ibita ku musatsi...
 *
 * /bundles and /quiz are in sitemap.xml, so Google was being handed multiple
 * indexed URLs that look like the same page. /track-order is not in the
 * sitemap, which is correct, but it was still reachable and still claimed to
 * be the homepage.
 *
 * A NOTE ON HOW I FOUND IT, because I got it wrong first.
 *
 * My initial probe grepped the first <title> in the HTML and reported that
 * EVERY page was titled "Ahabanza kuri FreedomCosmeticShop". That was wrong:
 * the inline SVG logo carries its own <title> for accessibility, and it
 * appears before the document title in the markup. There was no site-wide
 * title bug. Stripping <svg> blocks first gave the real picture — three
 * pages, not all of them. The helper below strips SVG for the same reason.
 */

import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Routes that must carry their own title and description. */
const INDEXABLE_ROUTES: Array<{ route: string; source: string }> = [
  { route: '/bundles', source: 'src/app/bundles/layout.tsx' },
  { route: '/quiz', source: 'src/app/quiz/layout.tsx' },
  { route: '/track-order', source: 'src/app/track-order/layout.tsx' },
  { route: '/faq', source: 'src/app/faq/layout.tsx' },
  { route: '/cart', source: 'src/app/cart/layout.tsx' },
  { route: '/shipping', source: 'src/app/shipping/layout.tsx' },
  { route: '/returns', source: 'src/app/returns/layout.tsx' },
  { route: '/privacy', source: 'src/app/privacy/layout.tsx' },
  { route: '/terms', source: 'src/app/terms/layout.tsx' },
  { route: '/wholesale', source: 'src/app/wholesale/layout.tsx' },
]

const read = (path: string) => {
  expect(existsSync(path), `${path} does not exist`).toBe(true)
  const raw = readFileSync(path, 'utf8')
  expect(raw.length, `${path} is empty`).toBeGreaterThan(100)
  return raw
}

/** Pull the rw and en strings out of a getPageMetadata call. */
function metadataStrings(source: string) {
  const titles = [...source.matchAll(/title:\s*\{([\s\S]*?)\}/g)].map((match) => match[1])
  const descriptions = [...source.matchAll(/description:\s*\{([\s\S]*?)\}/g)].map((match) => match[1])
  return { titles, descriptions }
}

describe('every indexable route declares its own metadata', () => {
  it.each(INDEXABLE_ROUTES)('$route has a metadata source', ({ source }) => {
    const text = read(source)
    expect(text).toContain('getPageMetadata')
    expect(text).toMatch(/export const metadata|export async function generateMetadata/)
  })

  it.each(INDEXABLE_ROUTES)('$route sets a title in both languages', ({ route, source }) => {
    const { titles } = metadataStrings(read(source))
    expect(titles.length, `${route} has no title block`).toBeGreaterThan(0)
    expect(titles[0], `${route} missing en title`).toMatch(/en:\s*'[^']{8,}'/)
    expect(titles[0], `${route} missing rw title`).toMatch(/rw:\s*'[^']{8,}'/)
  })

  it.each(INDEXABLE_ROUTES)('$route sets a description in both languages', ({ route, source }) => {
    const { descriptions } = metadataStrings(read(source))
    expect(descriptions.length, `${route} has no description block`).toBeGreaterThan(0)
    expect(descriptions[0], `${route} missing en description`).toMatch(/en:\s*'[^']{30,}'/)
    expect(descriptions[0], `${route} missing rw description`).toMatch(/rw:\s*'[^']{30,}'/)
  })

  it.each(INDEXABLE_ROUTES)('$route declares its own canonical path', ({ route, source }) => {
    // A wrong path points the canonical at another page, which is worse than
    // having none.
    expect(read(source)).toContain(`path: '${route}'`)
  })
})

describe('no two routes share a title', () => {
  it('every title string is distinct', () => {
    const seen = new Map<string, string>()
    for (const { route, source } of INDEXABLE_ROUTES) {
      const { titles } = metadataStrings(read(source))
      const rw = /rw:\s*'([^']+)'/.exec(titles[0] ?? '')?.[1]
      expect(rw, `${route} has no rw title`).toBeTruthy()
      const previous = seen.get(rw!)
      expect(previous, `${route} duplicates the title of ${previous}`).toBeUndefined()
      seen.set(rw!, route)
    }
    expect(seen.size).toBe(INDEXABLE_ROUTES.length)
  })

  it('none of them reuses the site default title', () => {
    // This is the exact string all three were serving.
    const siteDefault = 'Ibicuruzwa by’Ubwiza mu Rwanda | FreedomCosmeticShop'
    for (const { route, source } of INDEXABLE_ROUTES) {
      const { titles } = metadataStrings(read(source))
      const rw = /rw:\s*'([^']+)'/.exec(titles[0] ?? '')?.[1] ?? ''
      expect(rw, `${route} fell back to the default title`).not.toBe(siteDefault)
      expect(rw).not.toMatch(/^FreedomCosmeticShop \| /)
    }
  })
})

describe('the three new pages are correct in detail', () => {
  it('track-order is noindex, because it is a lookup form', () => {
    // It needs an order number plus a matching phone; there is nothing to
    // rank, and it is already absent from sitemap.xml. This makes the two
    // agree.
    expect(read('src/app/track-order/layout.tsx')).toContain('noIndex: true')
  })

  it('bundles and quiz stay indexable, because they are in the sitemap', () => {
    expect(read('src/app/bundles/layout.tsx')).not.toContain('noIndex')
    expect(read('src/app/quiz/layout.tsx')).not.toContain('noIndex')
  })

  /**
   * Only the SHIPPED strings, not the doc comments.
   *
   * My first version of the two tests below read the whole file and failed,
   * because the comments explaining WHY I avoided "curated" and
   * "personalised" contain those very words. The comments are the record of
   * the decision and should stay; the assertion is what needed narrowing.
   */
  const copyOf = (path: string) => {
    const text = read(path)
    const strings = [...text.matchAll(/(?:en|rw):\s*'([^']+)'/g)].map((match) => match[1])
    expect(strings.length, `${path} exposed no copy`).toBeGreaterThan(2)
    return strings.join(' | ')
  }

  it('bundles promises nothing about a catalogue that is empty', () => {
    // 0 bundles exist today. A count, or words like "curated", would be a
    // claim the page cannot honour the moment a crawler follows it.
    const copy = copyOf('src/app/bundles/layout.tsx')
    expect(copy).not.toMatch(/\d+\s*(bundles|routines)/i)
    expect(copy).not.toMatch(/curated|expert|hand-picked/i)
  })

  it('quiz does not promise personalisation it cannot deliver', () => {
    // howToUse is populated on 0 of 106 products, so the quiz cannot build a
    // routine. It can filter by skin type, which 22 products carry.
    const copy = copyOf('src/app/quiz/layout.tsx')
    expect(copy).not.toMatch(/personalised|personalized|custom routine/i)
    expect(copy.toLowerCase()).toContain('skin')
  })

  it.each(['src/app/bundles/layout.tsx', 'src/app/quiz/layout.tsx', 'src/app/track-order/layout.tsx'])(
    '%s marks its Kinyarwanda as reviewed',
    (path) => {
      const text = read(path)
      const rwLines = text.split('\n').filter((line) => /rw:\s*'/.test(line))
      expect(rwLines.length, `${path} has no rw strings`).toBeGreaterThan(0)
      for (const line of rwLines) {
        expect(line, `unreviewed rw in ${path}: ${line.trim().slice(0, 60)}`).toContain('verified-rw')
      }
    },
  )

  it.each(['src/app/bundles/layout.tsx', 'src/app/quiz/layout.tsx', 'src/app/track-order/layout.tsx'])(
    '%s never says igare, which means bicycle',
    (path) => {
      expect(read(path)).not.toMatch(/\bigare\b/i)
    },
  )
})
