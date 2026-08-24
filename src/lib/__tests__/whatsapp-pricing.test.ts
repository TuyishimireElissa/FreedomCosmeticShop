/**
 * WhatsApp pricing — message generation, reply parsing, and the security
 * boundary around price writes.
 *
 * These exist because this feature writes MONEY into a live shop from text a
 * human typed on a phone. The parser is the only thing between "2500 / 2000"
 * in a WhatsApp thread and a real price on a real product page. Every rule
 * below is one a person could plausibly break by typing naturally.
 *
 * The digit-trap tests matter most: 29 of the 97 unpriced products have digits
 * in their names ("777 MEN Super Love Perfume Set", "Barakkat Rouge 540"), so
 * a parser that scans for numbers anywhere in a line will misprice real stock.
 */

import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BATCH_HEADER_MARGIN,
  DEFAULT_BATCH_SIZE,
  DEFAULT_PRICE_REQUEST_MODE,
  PHOTO_MODE_BATCH_SIZE,
  MAX_PRICE_RWF,
  MAX_URL_CHARS,
  MIN_PRICE_RWF,
  PHOTO_LINK_RESERVE,
  buildPriceBatches,
  buildPriceRequestTarget,
  buildPriceRequestUrl,
  fitsWhatsAppUrl,
  generateWhatsAppPriceRequest,
  parseWhatsAppPriceReply,
  type PricingProduct,
} from '@/lib/whatsapp-pricing'
import { QUICK_PRICE_WHATSAPP_RECIPIENT } from '@/lib/business-config'

const read = (path: string) => readFileSync(path, 'utf8')
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Names chosen from the real catalogue, including the digit-heavy ones. */
const PRODUCTS: PricingProduct[] = [
  { slug: '777-men-super-love-perfume-set-2-pcs-1', name: '777 MEN Super Love Perfume Set (2 Pcs)', sku: 'FCS-790880' },
  { slug: 'american-dream-cocoa-butter-lemon-cream', name: 'American Dream Cocoa Butter Lemon Cream', sku: 'FCS-C6032B' },
  { slug: 'barakkat-rouge-540-eau-de-parfum', name: 'Barakkat Rouge 540 Eau De Parfum', sku: 'FCS-679852' },
  { slug: 'dettol-juniors-glycerine-soap', name: 'Dettol Juniors Glycerine Soap', sku: 'FCS-AA1122' },
]

const batchOf = (products: PricingProduct[]) => ({ index: 1, total: 1, products })

describe('batching keeps every message inside the WhatsApp URL limit', () => {
  it('splits a long list into numbered batches', () => {
    const many = Array.from({ length: 97 }, (_, index) => ({
      slug: `product-${index}`, name: `Product ${index}`, sku: `FCS-${index}`,
    }))
    const batches = buildPriceBatches(many)
    // Deliberately NOT ceil(97 / size): length splitting can close a batch
    // early, so the count is a range, not a division. Asserting the division
    // would silently re-break the moment a name grows.
    expect(batches.length).toBeGreaterThanOrEqual(Math.ceil(97 / DEFAULT_BATCH_SIZE))
    expect(batches[0].index).toBe(1)
    expect(batches[0].total).toBe(batches.length)
    expect(batches.at(-1)?.index).toBe(batches.length)
    for (const batch of batches) expect(batch.products.length).toBeGreaterThan(0)
    // Nothing may be dropped between batches.
    expect(batches.flatMap((batch) => batch.products)).toHaveLength(97)
  })

  it('never emits an empty batch, even for an empty catalogue', () => {
    expect(buildPriceBatches([])).toHaveLength(0)
    expect(buildPriceBatches(PRODUCTS.slice(0, 1))).toHaveLength(1)
  })

  it('splits by encoded length, not just item count', () => {
    // 17 real products have non-ASCII names. This Thai one is 67 characters
    // that percent-encode to 275 — four times an ASCII name of equal length.
    // A fixed count of 8 such rows overflows the URL, so batching must measure.
    const heavy = Array.from({ length: DEFAULT_BATCH_SIZE * 3 }, (_, index) => ({
      slug: `very-long-product-slug-number-${index}`,
      name: 'ASANTEE Tamarind & Goat Milk Herbal Soap (สบู่สมุนไพรมะขามผสมนมแพะ) 125g',
      sku: `FCS-${index}${'X'.repeat(12)}`,
    }))
    const batches = buildPriceBatches(heavy)
    // Every batch must fit once a real signed photo link is attached.
    const token = `https://freedomcosmeticshop.com/quick-prices?token=${'e'.repeat(210)}`
    for (const batch of batches) {
      const message = generateWhatsAppPriceRequest(batch, { photoUrl: token })
      expect(buildPriceRequestUrl(message).length).toBeLessThanOrEqual(MAX_URL_CHARS)
      expect(fitsWhatsAppUrl(message)).toBe(true)
      // Measured splitting must have kicked in below the nominal ceiling.
      expect(batch.products.length).toBeLessThanOrEqual(DEFAULT_BATCH_SIZE)
    }
    // Nothing may be lost while splitting.
    expect(batches.flatMap((batch) => batch.products)).toHaveLength(heavy.length)
  })

  it('still emits a single product that cannot fit on its own', () => {
    const enormous = [{ slug: 'x', name: 'ครีม'.repeat(200), sku: 'FCS-1' }]
    const batches = buildPriceBatches(enormous)
    expect(batches).toHaveLength(1)
    expect(batches[0].products).toHaveLength(1)
  })

  it('reports honestly when a message would be truncated', () => {
    const huge = Array.from({ length: 60 }, (_, index) => ({
      slug: `p-${index}`, name: `Product number ${index} with a fairly long descriptive name`, sku: `FCS-${index}`,
    }))
    expect(fitsWhatsAppUrl(generateWhatsAppPriceRequest(batchOf(huge)))).toBe(false)
  })
})

/**
 * Regression cover for the 2026-08-23 reserve bug.
 *
 * PHOTO_LINK_RESERVE was 320, estimated at "~270 characters". A token minted
 * by the live quick-price-link endpoint is 289 characters, so the real link is
 * 340 and costs 374 once encoded. The dashboard sized batches WITHOUT the link
 * and then rendered them WITH it, so 2 of 13 batches shipped at 1,846
 * characters -- 46 over the limit -- and WhatsApp would have truncated them,
 * dropping products off the end of the message.
 *
 * The old tests missed this because they used short placeholder tokens.
 */
describe('a REAL signed photo link still fits (the 2026-08-23 reserve bug)', () => {
  // Exactly what /api/admin/products/quick-price-link returns today.
  const REAL_TOKEN = 'x'.repeat(289)
  const REAL_LINK = `https://freedomcosmeticshop.com/quick-prices?token=${REAL_TOKEN}`

  /** The real catalogue shape: 97 items, 17 of them non-ASCII. */
  const catalogue: PricingProduct[] = Array.from({ length: 97 }, (_, index) => (
    index % 6 === 0
      ? {
        slug: `asantee-tamarind-goat-milk-herbal-soap-${index}`,
        name: 'ASANTEE Tamarind & Goat Milk Herbal Soap (สบู่สมุนไพรมะขามผสมนมแพะ) 125g',
        sku: `FCS-${index}A1B2C3`,
      }
      : {
        slug: `american-dream-cocoa-butter-lemon-cream-${index}`,
        name: `American Dream Cocoa Butter Lemon Cream ${index} (500ml)`,
        sku: `FCS-${index}D4E5F6`,
      }
  ))

  it('the real link is longer than the old 320 reserve, which is why it broke', () => {
    expect(REAL_LINK.length).toBe(340)
    expect(REAL_LINK.length).toBeGreaterThan(320)
    // The reserve must now cover the real encoded cost.
    expect(PHOTO_LINK_RESERVE).toBeGreaterThanOrEqual(REAL_LINK.length)
  })

  it('batching WITH the real link keeps every batch under the limit', () => {
    const batches = buildPriceBatches(catalogue, DEFAULT_BATCH_SIZE, { photoUrl: REAL_LINK, language: 'rw' })
    for (const batch of batches) {
      const message = generateWhatsAppPriceRequest(batch, { photoUrl: REAL_LINK, language: 'rw' })
      expect(buildPriceRequestUrl(message).length).toBeLessThanOrEqual(MAX_URL_CHARS)
    }
    expect(batches.flatMap((b) => b.products)).toHaveLength(97)
  })

  it('batching WITHOUT a link still fits once the real link is added later', () => {
    // This is the exact path that broke: size on the reserve, render on the
    // real link. It must hold while the token is still being minted.
    const batches = buildPriceBatches(catalogue, DEFAULT_BATCH_SIZE)
    for (const batch of batches) {
      const message = generateWhatsAppPriceRequest(batch, { photoUrl: REAL_LINK, language: 'rw' })
      expect(buildPriceRequestUrl(message).length).toBeLessThanOrEqual(MAX_URL_CHARS)
    }
    expect(batches.flatMap((b) => b.products)).toHaveLength(97)
  })

  it('holds for the English message too, which is not shorter', () => {
    const batches = buildPriceBatches(catalogue, DEFAULT_BATCH_SIZE, { photoUrl: REAL_LINK, language: 'en' })
    for (const batch of batches) {
      const message = generateWhatsAppPriceRequest(batch, { photoUrl: REAL_LINK, language: 'en' })
      expect(buildPriceRequestUrl(message).length).toBeLessThanOrEqual(MAX_URL_CHARS)
    }
  })

  it('survives a token 25% longer than today, so a new claim cannot silently break it', () => {
    const longer = `https://freedomcosmeticshop.com/quick-prices?token=${'x'.repeat(360)}`
    const batches = buildPriceBatches(catalogue, DEFAULT_BATCH_SIZE, { photoUrl: longer, language: 'rw' })
    for (const batch of batches) {
      const message = generateWhatsAppPriceRequest(batch, { photoUrl: longer, language: 'rw' })
      expect(buildPriceRequestUrl(message).length).toBeLessThanOrEqual(MAX_URL_CHARS)
    }
    expect(batches.flatMap((b) => b.products)).toHaveLength(97)
  })

  it('leaves real headroom, not a one-character escape', () => {
    // The first corrected attempt passed with 1 character to spare, which is
    // not a fix. BATCH_HEADER_MARGIN buys back room for the "11/13" header
    // that is only known after every batch is formed.
    const batches = buildPriceBatches(catalogue, DEFAULT_BATCH_SIZE, { photoUrl: REAL_LINK, language: 'rw' })
    const worst = Math.max(...batches.map((batch) =>
      buildPriceRequestUrl(generateWhatsAppPriceRequest(batch, { photoUrl: REAL_LINK, language: 'rw' })).length))
    expect(MAX_URL_CHARS - worst).toBeGreaterThanOrEqual(16)
    expect(BATCH_HEADER_MARGIN).toBeGreaterThan(0)
  })

  it('the margin is load-bearing: a boundary catalogue overflows without it', () => {
    // Found by sweeping name lengths. At 102 characters the packer lands a
    // batch exactly on MAX_URL_CHARS while measuring the "1/1" header, then
    // the real "27/27" header pushes the shipped URL to 1,802 -- 2 over.
    // BATCH_HEADER_MARGIN is what keeps this under. Without this fixture the
    // margin could be deleted and every other test would still pass (it
    // survived mutation M2 before this test existed).
    const boundary: PricingProduct[] = Array.from({ length: 150 }, (_, index) => ({
      slug: `p-${index}`,
      name: `Product ${index} ${'N'.repeat(102)}`,
      sku: `FCS-${index}ABCDEF`,
    }))
    const batches = buildPriceBatches(boundary, DEFAULT_BATCH_SIZE, { photoUrl: REAL_LINK, language: 'rw' })
    for (const batch of batches) {
      const rendered = generateWhatsAppPriceRequest(batch, { photoUrl: REAL_LINK, language: 'rw' })
      expect(buildPriceRequestUrl(rendered).length).toBeLessThanOrEqual(MAX_URL_CHARS)
    }
    expect(batches.flatMap((b) => b.products)).toHaveLength(150)
  })

  it('the real multi-digit header is accounted for, not the 1/1 placeholder', () => {
    // Fitting measures "1/1"; the shipped header can read "13/13".
    const batches = buildPriceBatches(catalogue, DEFAULT_BATCH_SIZE, { photoUrl: REAL_LINK, language: 'rw' })
    const last = batches.at(-1)!
    expect(last.total).toBeGreaterThan(9)
    const rendered = generateWhatsAppPriceRequest(last, { photoUrl: REAL_LINK, language: 'rw' })
    expect(rendered).toContain(`${last.index}/${last.total}`)
    expect(buildPriceRequestUrl(rendered).length).toBeLessThanOrEqual(MAX_URL_CHARS)
  })

  it('honours the owner-requested ceiling of 15 without ever exceeding it', () => {
    expect(DEFAULT_BATCH_SIZE).toBe(15)
    const batches = buildPriceBatches(catalogue, DEFAULT_BATCH_SIZE, { photoUrl: REAL_LINK, language: 'rw' })
    for (const batch of batches) expect(batch.products.length).toBeLessThanOrEqual(15)
  })
})

/**
 * Owner decision 2026-08-24: two mutually exclusive photo modes.
 *
 * Inline Cloudinary URLs cost ~116 characters each; the signed app link costs
 * 340. Asking for both at 5 items per batch produced a worst message of 2,165
 * characters and put 17 of 20 batches over the limit. So the modes must never
 * combine, and each must fit on its own.
 */
describe('photo delivery modes', () => {
  const REAL_LINK = `https://freedomcosmeticshop.com/quick-prices?token=${'x'.repeat(289)}`
  const IMG = (n: number) =>
    `https://res.cloudinary.com/dohoc0tmp/image/upload/v178552693${n}/freedomcosmeticshop/products/vwj4mnnahfjk8pm9hsx${n}.jpg`

  /** Real catalogue shape: 97 items, every 6th non-ASCII, 3 with no photo. */
  const catalogue: PricingProduct[] = Array.from({ length: 97 }, (_, index) => ({
    slug: `product-${index}`,
    name: index % 6 === 0
      ? 'ASANTEE Tamarind & Goat Milk Herbal Soap (สบู่สมุนไพรมะขามผสมนมแพะ) 125g'
      : `American Dream Cocoa Butter Lemon Cream ${index} (500ml)`,
    sku: `FCS-${index}A1B2C3`,
    imageUrl: index < 3 ? null : IMG(index % 10),
  }))

  it('link mode omits inline photos and keeps the signed link', () => {
    const batch = { index: 1, total: 1, products: catalogue.slice(3, 8) }
    const message = generateWhatsAppPriceRequest(batch, { photoUrl: REAL_LINK, mode: 'link' })
    expect(message).toContain(REAL_LINK)
    expect(message).not.toContain('res.cloudinary.com')
  })

  it('photos mode inlines each image and drops the link entirely', () => {
    const batch = { index: 1, total: 1, products: catalogue.slice(3, 8) }
    const message = generateWhatsAppPriceRequest(batch, { photoUrl: REAL_LINK, mode: 'photos' })
    // Even though a photoUrl was passed, photos mode must ignore it: the two
    // together overflow the URL.
    expect(message).not.toContain(REAL_LINK)
    expect(message).not.toContain('/quick-prices?token=')
    for (const product of catalogue.slice(3, 8)) expect(message).toContain(product.imageUrl!)
  })

  it('defaults to link mode when no mode is given', () => {
    expect(DEFAULT_PRICE_REQUEST_MODE).toBe('link')
    const batch = { index: 1, total: 1, products: catalogue.slice(3, 8) }
    expect(generateWhatsAppPriceRequest(batch, { photoUrl: REAL_LINK })).toContain(REAL_LINK)
  })

  it('imageless products degrade to name + SKU, never a broken link', () => {
    const batch = { index: 1, total: 1, products: catalogue.slice(0, 3) }
    const message = generateWhatsAppPriceRequest(batch, { mode: 'photos' })
    expect(message).not.toContain('Ifoto')
    expect(message).not.toContain('undefined')
    expect(message).not.toContain('null')
    for (const product of catalogue.slice(0, 3)) expect(message).toContain(product.sku!)
  })

  it('honours the owner-chosen ceiling of 5 for photos mode', () => {
    // The length guard binds before the item count on the real catalogue, so
    // changing this constant does not overflow anything -- it silently changes
    // how many messages the owner sends by hand. Pin the agreed number.
    expect(PHOTO_MODE_BATCH_SIZE).toBe(5)
  })

  it('photos mode fits at 5 per batch across the whole catalogue', () => {
    const batches = buildPriceBatches(catalogue, PHOTO_MODE_BATCH_SIZE, { mode: 'photos', language: 'rw' })
    for (const batch of batches) {
      const message = generateWhatsAppPriceRequest(batch, { mode: 'photos', language: 'rw' })
      expect(buildPriceRequestUrl(message).length).toBeLessThanOrEqual(MAX_URL_CHARS)
      expect(batch.products.length).toBeLessThanOrEqual(PHOTO_MODE_BATCH_SIZE)
    }
    expect(batches.flatMap((b) => b.products)).toHaveLength(97)
  })

  it('photos mode fits in English too', () => {
    const batches = buildPriceBatches(catalogue, PHOTO_MODE_BATCH_SIZE, { mode: 'photos', language: 'en' })
    for (const batch of batches) {
      const message = generateWhatsAppPriceRequest(batch, { mode: 'photos', language: 'en' })
      expect(buildPriceRequestUrl(message).length).toBeLessThanOrEqual(MAX_URL_CHARS)
    }
    expect(batches.flatMap((b) => b.products)).toHaveLength(97)
  })

  it('photos mode does not waste the link reserve on a link it never sends', () => {
    // Direct proof rather than a guess about batch sizes: if the 400-char
    // reserve were still being subtracted, no batch could exceed
    // MAX_URL_CHARS - PHOTO_LINK_RESERVE - BATCH_HEADER_MARGIN. At least one
    // batch must use the space the link would have occupied.
    const cap = MAX_URL_CHARS - PHOTO_LINK_RESERVE - BATCH_HEADER_MARGIN
    const batches = buildPriceBatches(catalogue, PHOTO_MODE_BATCH_SIZE, { mode: 'photos' })
    const lengths = batches.map((batch) =>
      buildPriceRequestUrl(generateWhatsAppPriceRequest(batch, { mode: 'photos' })).length)
    expect(Math.max(...lengths)).toBeGreaterThan(cap)
    // ...while still respecting the real limit.
    expect(Math.max(...lengths)).toBeLessThanOrEqual(MAX_URL_CHARS)
  })

  it('the parser reads a photos-mode reply unchanged', () => {
    // The 📷 line must be ignored, not misread as a product or a price.
    const batch = { index: 1, total: 1, products: catalogue.slice(3, 6) }
    const sent = generateWhatsAppPriceRequest(batch, { mode: 'photos' })
    expect(sent).toContain('res.cloudinary.com')
    const result = parseWhatsAppPriceReply('1. 2500 / 2000\n2. 3000\n3. 4500', batch.products)
    expect(result.issues).toHaveLength(0)
    expect(result.matched.map((row) => row.retail)).toEqual([2500, 3000, 4500])
    expect(result.matched[0].wholesale).toBe(2000)
  })

  it('a pasted photo URL in the reply cannot be read as a price', () => {
    // The father might quote the message back. Digits inside a Cloudinary URL
    // (v1785526939) must never become a price.
    const batch = { index: 1, total: 1, products: catalogue.slice(3, 5) }
    const reply = `1. ${IMG(1)}\n1. 2500\n2. 3000`
    const result = parseWhatsAppPriceReply(reply, batch.products)
    const prices = result.matched.map((row) => row.retail)
    expect(prices).not.toContain(1785526931)
    expect(prices).toEqual([2500, 3000])
  })
})

describe('the dashboard exposes both modes', () => {
  const dashboard = read('src/components/admin/AdminWhatsAppPricing.tsx')

  it('renders a mode selector', () => {
    expect(dashboard).toContain("name=\"pricing-mode\"")
    expect(dashboard).toContain('pricing.mode_link')
    expect(dashboard).toContain('pricing.mode_photos')
  })

  it('uses the smaller ceiling in photos mode', () => {
    expect(dashboard).toContain('PHOTO_MODE_BATCH_SIZE')
    expect(dashboard).toMatch(/mode === 'photos' \? PHOTO_MODE_BATCH_SIZE : DEFAULT_BATCH_SIZE/)
  })

  it('never sends the signed link in photos mode', () => {
    expect(dashboard).toMatch(/photoUrl: mode === 'photos' \? null : photoLink/)
  })

  it('batches and renders through one shared options object', () => {
    expect(dashboard).toContain('requestOptions')
    expect(dashboard).toMatch(/buildPriceBatches\(products, batchCeiling, requestOptions\)/)
    expect(dashboard).toMatch(/generateWhatsAppPriceRequest\(batch, requestOptions\)/)
  })

  it('resets to the first batch when the mode changes', () => {
    expect(dashboard).toMatch(/setMode\(value\); setBatchIndex\(0\)/)
  })
})

describe("the father's mobile app", () => {
  const client = read('src/components/admin/QuickPricesClient.tsx')
  const en = read('src/lib/i18n/translations/en.ts')
  const rw = read('src/lib/i18n/translations/rw.ts')

  it('uses real Tailwind sizing, not the dead h-15 class', () => {
    // h-15/w-15 are not in the default spacing scale, so they emitted no CSS
    // and the thumbnail only rendered at 60px via its width/height attributes.
    expect(client).not.toMatch(/\bh-15\b/)
    expect(client).not.toMatch(/\bw-15\b/)
    expect(client).not.toMatch(/\bh-22\b/)
    // h-16 w-16 (64px) is the owner's specified size. I previously shipped
    // h-20 without asking; pinned here so it cannot drift again.
    expect(client).toContain('h-16 w-16')
    expect(client).not.toMatch(/\bh-20 w-20\b/)
  })

  it('requests a thumbnail matching the rendered size', () => {
    // 2x the 64px CSS box, for retina without over-fetching on 3G.
    expect(client).toContain('w_128,h_128,c_fill,q_auto,f_auto')
    expect(client).toContain('width={64}')
    expect(client).toContain('height={64}')
  })

  it('gives retail the full width and folds wholesale away', () => {
    expect(client).not.toContain('grid-cols-2')
    expect(client).toContain('wholesaleOpen')
    expect(client).toContain('setOpenWholesale')
    expect(client).toContain('aria-expanded')
  })

  it('marks each saved row individually, from the server response', () => {
    expect(client).toContain('savedSlugs')
    expect(client).toContain("status === 'updated'")
    expect(client).toContain('pricing.saved_row')
    // The owner asked for "Yabitswe" specifically. I shipped "Byabitswe"
    // without asking; pinned so the wording cannot drift again.
    expect(rw).toMatch(/saved_row:\s*'Yabitswe'/)
    expect(en).toMatch(/saved_row:\s*'Saved'/)
  })

  it('keeps inputs at or above the 44px touch target', () => {
    const inputs = client.match(/min-h-1[12]/g) || []
    expect(inputs.length).toBeGreaterThanOrEqual(4)
  })

  it('uses only fcs-* tokens, with no dead opacity modifiers', () => {
    // Strip comments first: the contrast reasoning is documented in-file and
    // legitimately names hex values.
    const code = stripComments(client)
    expect(code).not.toMatch(/#[0-9a-fA-F]{6}/)
    // Opacity modifiers on fcs-* tokens generate NO CSS -- the palette is bare
    // var(--x) with no <alpha-value>.
    expect(code).not.toMatch(/fcs-[a-z-]+\/\d/)
  })
})

describe('the dashboard sizes batches with the same link it renders with', () => {
  const dashboard = read('src/components/admin/AdminWhatsAppPricing.tsx')

  it('passes the link into buildPriceBatches via the shared options', () => {
    // Was an inline object; now requestOptions, which carries photoUrl and is
    // used for BOTH batching and rendering so the two cannot drift apart.
    expect(dashboard).toMatch(/buildPriceBatches\(products, batchCeiling, requestOptions\)/)
    expect(dashboard).toMatch(/photoUrl: mode === 'photos' \? null : photoLink/)
  })

  it('recomputes batches when the link arrives or the mode changes', () => {
    expect(dashboard).toMatch(/\[mode,\s*photoLink\]/)
    expect(dashboard).toMatch(/\[products,\s*batchCeiling,\s*requestOptions\]/)
  })

  it('clamps the selected batch if re-batching shortens the list', () => {
    expect(dashboard).toContain('batchIndex >= batches.length')
  })
})

describe('the request message', () => {
  const message = generateWhatsAppPriceRequest(batchOf(PRODUCTS.slice(0, 2)), {
    photoUrl: 'https://freedomcosmeticshop.com/quick-prices?token=abc',
  })

  it('numbers each item and prints the SKU as the key', () => {
    expect(message).toContain('1. 777 MEN Super Love Perfume Set (2 Pcs)')
    expect(message).toContain('FCS-790880')
    expect(message).toContain('2. American Dream Cocoa Butter Lemon Cream')
    // Slugs run to 81 chars and one collides with a category slug.
    expect(message).not.toContain('777-men-super-love-perfume-set')
  })

  it('carries one photo link for the batch, not one per product', () => {
    // A Cloudinary URL per item pushed a 10-item message to 3,871 chars.
    expect(message.match(/https:\/\//g) ?? []).toHaveLength(1)
    expect(message).not.toContain('res.cloudinary.com')
  })

  it('leaves a blank for both prices', () => {
    expect(message.match(/_____ \/ _____/g)).toHaveLength(2)
  })

  it('shows a worked example so the reply format is unambiguous', () => {
    expect(message).toContain('1. 2500 / 2000')
    expect(message).toContain('2. 3000')
  })

  it('defaults to Kinyarwanda, and honours English on request', () => {
    expect(message).toContain('IBICIRO')
    const english = generateWhatsAppPriceRequest(batchOf(PRODUCTS.slice(0, 1)), { language: 'en' })
    expect(english).toContain('PRICE REQUEST')
    expect(english).toContain('retail / wholesale')
  })

  it('omits the photo line entirely when there is no link', () => {
    expect(generateWhatsAppPriceRequest(batchOf(PRODUCTS.slice(0, 1)))).not.toContain('https://')
  })

  it('falls back to the slug when a product has no SKU', () => {
    const noSku = generateWhatsAppPriceRequest(batchOf([{ slug: 'no-sku-product', name: 'No SKU', sku: null }]))
    expect(noSku).toContain('no-sku-product')
  })
})

describe('parsing the reply — formats a person actually types', () => {
  const parse = (text: string) => parseWhatsAppPriceReply(text, PRODUCTS)

  it('reads retail and wholesale', () => {
    const { matched, issues } = parse('1. 2500 / 2000\n2. 3000 / 2400')
    expect(issues).toHaveLength(0)
    expect(matched).toHaveLength(2)
    expect(matched[0]).toMatchObject({ slug: PRODUCTS[0].slug, retail: 2500, wholesale: 2000, matchedBy: 'index' })
    expect(matched[1]).toMatchObject({ retail: 3000, wholesale: 2400 })
  })

  it('accepts retail alone and leaves wholesale untouched', () => {
    // Owner decision: "1. 2500" is valid and must not clear wholesale.
    const { matched, issues } = parse('1. 2500')
    expect(issues).toHaveLength(0)
    expect(matched[0].wholesale).toBeNull()
  })

  it('accepts the separators people actually use', () => {
    for (const line of ['1. 2500', '1) 2500', '1 - 2500', '1: 2500', '1] 2500']) {
      expect(parse(line).matched[0]?.retail, line).toBe(2500)
    }
  })

  it('accepts thousands separators and a currency suffix', () => {
    expect(parse('1. 2,500 / 2 000').matched[0]).toMatchObject({ retail: 2500, wholesale: 2000 })
    expect(parse('1. 2.500').matched[0].retail).toBe(2500)
    expect(parse('1. 2500 RWF / 2000 RWF').matched[0]).toMatchObject({ retail: 2500, wholesale: 2000 })
  })

  it('matches on SKU and on slug', () => {
    expect(parse('FCS-C6032B: 2500 / 2000').matched[0]).toMatchObject({ slug: PRODUCTS[1].slug, matchedBy: 'sku' })
    expect(parse('dettol-juniors-glycerine-soap 4500').matched[0]).toMatchObject({ slug: PRODUCTS[3].slug, matchedBy: 'slug' })
    // SKU casing should not matter on a phone keyboard.
    expect(parse('fcs-c6032b: 2500').matched[0]?.slug).toBe(PRODUCTS[1].slug)
  })

  it('treats an unfilled blank as "not answered", never as zero', () => {
    const { matched, issues } = parse('1. _____ / _____\n2. 3000')
    expect(matched).toHaveLength(1)
    expect(matched[0].retail).toBe(3000)
    expect(issues).toHaveLength(0)
    // Retail given, wholesale left blank.
    expect(parse('1. 2500 / _____').matched[0].wholesale).toBeNull()
  })

  it('ignores the message furniture quoted back in a reply', () => {
    const quoted = [
      'IBICIRO — FreedomCosmeticShop',
      'Urutonde 1/13',
      '-------------------------',
      '1. 2500 / 2000',
      'Amafoto y\'ibi bicuruzwa:',
      'https://freedomcosmeticshop.com/quick-prices?token=abc',
      'Subiza gutya (igiciro / igiciro cyo kurangura):',
    ].join('\n')
    const { matched, issues } = parseWhatsAppPriceReply(quoted, PRODUCTS)
    expect(matched).toHaveLength(1)
    expect(issues).toHaveLength(0)
  })

  it('tolerates blank lines and stray whitespace', () => {
    expect(parse('\n\n  1.  2500  \n\n  2. 3000\n').matched).toHaveLength(2)
  })
})

describe('parsing refuses to guess', () => {
  const parse = (text: string) => parseWhatsAppPriceReply(text, PRODUCTS)

  it('does not read a digit inside a product name as a line number', () => {
    // THE trap: 29 of 97 real names contain digits. Reading "777" as an index
    // and "2500" as its price would misprice a real product silently.
    const { matched, issues } = parse('777 MEN Super Love Perfume Set 2500')
    expect(matched).toHaveLength(0)
    expect(issues[0].code).toBe('UNKNOWN_ID')

    // "Barakkat Rouge 540" must not be read as index 540 either.
    expect(parse('Barakkat Rouge 540 Eau De Parfum 7000').matched).toHaveLength(0)
  })

  it('rejects zero and negative amounts', () => {
    expect(parse('1. 0').issues[0].code).toBe('OUT_OF_RANGE')
    // A minus sign is not a digit, so this reads as malformed rather than -500.
    expect(parse('1. -500').issues[0].code).toBe('BAD_NUMBER')
    expect(parse('1. 0').matched).toHaveLength(0)
    expect(parse('1. -500').matched).toHaveLength(0)
  })

  it('rejects amounts outside the accepted RWF range', () => {
    expect(parse(`1. ${MAX_PRICE_RWF + 1}`).issues[0].code).toBe('OUT_OF_RANGE')
    expect(parse(`1. ${MIN_PRICE_RWF}`).matched[0].retail).toBe(MIN_PRICE_RWF)
    expect(parse(`1. ${MAX_PRICE_RWF}`).matched[0].retail).toBe(MAX_PRICE_RWF)
  })

  it('rejects a wholesale price above retail as the typo it is', () => {
    // The admin schema enforces this too; catching it here gives a readable
    // message instead of a 400 after the owner has already pressed save.
    const { matched, issues } = parse('1. 2000 / 2500')
    expect(matched).toHaveLength(0)
    expect(issues[0].code).toBe('WHOLESALE_ABOVE_RETAIL')
  })

  it('accepts wholesale exactly equal to retail', () => {
    expect(parse('1. 2500 / 2500').matched[0]).toMatchObject({ retail: 2500, wholesale: 2500 })
  })

  it('flags a product priced twice rather than silently taking one', () => {
    const { matched, issues } = parse('1. 2500\n1. 3000')
    expect(matched).toHaveLength(1)
    expect(matched[0].retail).toBe(2500)
    expect(issues[0].code).toBe('DUPLICATE')
  })

  it('flags an index beyond the batch and an unknown identifier', () => {
    expect(parse('99. 2500').issues[0].code).toBe('NO_MATCH')
    expect(parse('FCS-NOTREAL: 2500').issues[0].code).toBe('UNKNOWN_ID')
  })

  it('flags non-numeric prices', () => {
    // The index matched, so the line is understood — it is the amount that is
    // wrong. BAD_NUMBER says that precisely; NO_MATCH would be misleading.
    expect(parse('1. abc').issues[0].code).toBe('BAD_NUMBER')
    expect(parse('1. 2500 / abc').issues[0].code).toBe('BAD_NUMBER')
    expect(parse('1. abc').matched).toHaveLength(0)
  })

  it('returns nothing for empty or whitespace input', () => {
    for (const input of ['', '   ', '\n\n']) {
      expect(parseWhatsAppPriceReply(input, PRODUCTS).matched).toHaveLength(0)
      expect(parseWhatsAppPriceReply(input, PRODUCTS).issues).toHaveLength(0)
    }
  })

  it('keeps the offending line on every issue so a human can see it', () => {
    const { issues } = parse('1. 2000 / 2500')
    expect(issues[0].line).toBe('1. 2000 / 2500')
    expect(issues[0].message.length).toBeGreaterThan(0)
  })
})

describe('the wa.me link', () => {
  it('percent-encodes the message', () => {
    const url = buildPriceRequestUrl('1. 2500 / 2000\nnext')
    expect(url).toContain('%0A')
    expect(url).not.toContain('\n')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
  })

  it('strips punctuation from a phone number', () => {
    expect(buildPriceRequestUrl('hi', '+250 790 215 965')).toContain('wa.me/250790215965?text=')
  })
})

describe('price writes are guarded at the API boundary', () => {
  const route = stripComments(read('src/app/api/admin/products/price-sync/route.ts'))
  const token = stripComments(read('src/lib/quick-price-token.ts'))
  const unpriced = stripComments(read('src/app/api/admin/products/unpriced/route.ts'))

  it('never overwrites a product that already has a price unless told to', () => {
    // The guard that matters most: this feature fills blanks. Quietly revising
    // a price the owner set would be the worst bug it could have.
    expect(route).toContain('product.price > 0 && !overwrite')
    expect(route).toContain('skipped_has_price')
    expect(route).toContain('.default(false)')
  })

  it('leaves wholesale alone when the reply did not give one', () => {
    expect(route).toContain('row.wholesale != null ? { wholesalePrice: row.wholesale } : {}')
  })

  it('re-enforces the wholesale rule at the boundary', () => {
    expect(route).toContain('value.wholesale > value.retail')
  })

  it('requires either an admin permission or a signed token', () => {
    expect(route).toContain('verifyQuickPriceToken')
    expect(route).toContain('requirePermission(PERMISSIONS.PRODUCTS_UPDATE)')
  })

  it('rate limits and audit logs every write', () => {
    expect(route).toContain('rateLimit(')
    expect(route).toContain('PRODUCT_PRICES_SYNCED')
  })

  it('scopes the token by purpose so it cannot be replayed elsewhere', () => {
    expect(token).toContain("const PURPOSE = 'quick-prices'")
    expect(token).toContain("payload.purpose !== PURPOSE")
    expect(token).toContain("AUDIENCE = 'freedom-quick-prices'")
  })

  it('expires the token after seven days', () => {
    expect(token).toContain("QUICK_PRICE_TTL = '7d'")
    expect(token).toContain('setExpirationTime')
  })

  it('reuses the existing signing secret rather than inventing one', () => {
    // Same helper as order-access.ts, which fails closed in production.
    expect(token).toContain("from '@/lib/auth-secret'")
    expect(token).toContain('resolveAuthSecret')
    // A `const SECRET = "..."` check is too narrow: a secret can just as
    // easily be inlined at the call site. Assert that the ONLY string
    // literals long enough to be a key are the issuer/audience/purpose
    // constants, so any embedded key material fails here.
    const longLiterals = (token.match(/['"][^'"\n]{16,}['"]/g) ?? [])
      .filter((literal) => !/@\/lib|freedom-|quick-prices|HS256/.test(literal))
    expect(longLiterals, `unexpected long string literal: ${longLiterals.join(', ')}`).toHaveLength(0)
  })

  it('refuses a bad token without saying why', () => {
    // Returning null for both forged and expired means a probe learns nothing.
    expect(token).toContain('return null')
    expect(token).not.toMatch(/expired.*forged|forged.*expired/i)
  })

  it('does not leak cost, supplier or margin to a token holder', () => {
    for (const field of ['costPrice', 'supplier', 'wholesalePrice', 'batchNumber']) {
      expect(unpriced, `unpriced route must not select ${field}`).not.toContain(`${field}: true`)
    }
  })
})

describe('the dashboard and mobile form', () => {
  const dashboard = stripComments(read('src/components/admin/AdminWhatsAppPricing.tsx'))
  const mobile = stripComments(read('src/components/admin/QuickPricesClient.tsx'))
  const page = read('src/app/quick-prices/page.tsx')

  it('uses the AA-passing WhatsApp token, never the 1.98:1 brand green', () => {
    expect(dashboard).toContain('bg-fcs-whatsapp-pill')
    expect(mobile).toContain('bg-fcs-whatsapp-pill')
    expect(dashboard).not.toMatch(/bg-fcs-whatsapp(?!-pill)/)
    expect(mobile).not.toMatch(/bg-fcs-whatsapp(?!-pill)/)
  })

  it('never hard-codes a hex colour', () => {
    expect(dashboard).not.toMatch(/#[0-9A-Fa-f]{6}/)
    expect(mobile).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })

  it('keeps 44px touch targets on every interactive control', () => {
    // Counting matters: `toContain` passes while one control is shrunk,
    // because its siblings still satisfy the assertion. Assert that no
    // interactive element carries a sub-44px height instead.
    for (const [name, source] of [['dashboard', dashboard], ['mobile', mobile]] as const) {
      expect(source, `${name} lost its 44px targets`).toMatch(/min-h-1[12]/)
      expect(source, `${name} has a sub-44px control`).not.toMatch(/min-h-(?:[0-9]|10)\b/)
      expect(source, `${name} has a short fixed-height control`).not.toMatch(/\bh-(?:[0-9]|10)\s+w-full/)
    }
    // The mobile form's own inputs and its save button must all clear it.
    expect((mobile.match(/min-h-1[12]/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })

  it('is bilingual through the existing i18n, with no hard-coded English', () => {
    expect(dashboard).toContain("useT()")
    expect(mobile).toContain("useT()")
    expect(dashboard).not.toMatch(/>\s*(Send|Save|Copy|Paste)\s+[A-Za-z]/)
  })

  it('respects reduced motion on every spinner', () => {
    const spinners = (dashboard + mobile).match(/animate-spin/g) ?? []
    const guarded = (dashboard + mobile).match(/motion-reduce:animate-none/g) ?? []
    expect(guarded.length).toBe(spinners.length)
  })

  it('keeps the father\'s page out of search results', () => {
    expect(page).toContain('robots')
    expect(page).toContain('index: false')
  })

  it('sends the token as a bearer header when saving from the mobile form', () => {
    expect(mobile).toContain('Authorization: `Bearer ${token}`')
  })

  it('shows a plain expiry message rather than a login prompt', () => {
    // There is no account the recipient could log into.
    expect(mobile).toContain("pricing.link_expired")
    expect(mobile).not.toContain('/login')
  })
})

describe('translations', () => {
  const en = read('src/lib/i18n/translations/en.ts')
  const rw = read('src/lib/i18n/translations/rw.ts')
  const keysOf = (source: string) => {
    const start = source.indexOf('\n  pricing: {')
    const end = source.indexOf('\n  },', start)
    return (source.slice(start, end).match(/^\s{4}(\w+):/gm) ?? []).map((line) => line.trim())
  }

  it('defines the pricing namespace in both languages with matching keys', () => {
    const enKeys = keysOf(en)
    expect(enKeys.length).toBeGreaterThan(20)
    expect(keysOf(rw)).toEqual(enKeys)
  })

  it('marks every Kinyarwanda pricing string as reviewed', () => {
    const start = rw.indexOf('\n  pricing: {')
    const block = rw.slice(start, rw.indexOf('\n  },', start))
    const valueLines = block.split('\n').filter((line) => /^\s{4}\w+:/.test(line))
    for (const line of valueLines) {
      expect(line, `missing verified-rw: ${line.trim()}`).toContain('verified-rw')
    }
  })
})

describe('buildPriceRequestTarget — where the open button actually goes', () => {
  const MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
  const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  const PHONE_DIGITS = '250790215965'

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mobile: opens wa.me in the SAME tab — no blank tab from the whatsapp:// hand-off', () => {
    vi.stubGlobal('navigator', { userAgent: MOBILE })
    const { href, target } = buildPriceRequestTarget('Muraho', '+250790215965')
    expect(href).toBe(`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Muraho')}`)
    expect(target).toBe('_self')
  })

  it('mobile with no configured recipient: share picker, still same tab', () => {
    vi.stubGlobal('navigator', { userAgent: MOBILE })
    const { href, target } = buildPriceRequestTarget('Muraho')
    expect(href).toBe(`https://wa.me/?text=${encodeURIComponent('Muraho')}`)
    expect(target).toBe('_self')
  })

  it('desktop: opens web.whatsapp.com in a new tab — plain HTTPS, no custom scheme', () => {
    vi.stubGlobal('navigator', { userAgent: DESKTOP })
    const { href, target } = buildPriceRequestTarget('Muraho', '+250790215965')
    expect(href).toBe(`https://web.whatsapp.com/send?phone=${PHONE_DIGITS}&text=${encodeURIComponent('Muraho')}`)
    expect(target).toBe('_blank')
  })

  it('desktop with no configured recipient: web share UI, still a usable page', () => {
    vi.stubGlobal('navigator', { userAgent: DESKTOP })
    const { href, target } = buildPriceRequestTarget('Muraho')
    expect(href).toBe(`https://web.whatsapp.com/send?text=${encodeURIComponent('Muraho')}`)
    expect(target).toBe('_blank')
  })

  it('strips non-digits from the recipient the same way the other builders do', () => {
    vi.stubGlobal('navigator', { userAgent: MOBILE })
    expect(buildPriceRequestTarget('x', '250 790 215 965').href).toContain(`wa.me/${PHONE_DIGITS}`)
    expect(buildPriceRequestTarget('x', '0788123456').href).toContain('wa.me/0788123456')
  })

  it('percent-encodes the message in every shape, so non-ASCII names survive', () => {
    vi.stubGlobal('navigator', { userAgent: MOBILE })
    expect(buildPriceRequestTarget('Gahunda + 2/3', '').href).toContain(encodeURIComponent('Gahunda + 2/3'))
    vi.stubGlobal('navigator', { userAgent: DESKTOP })
    expect(buildPriceRequestTarget('Gahunda + 2/3', '+250790215965').href).toContain(encodeURIComponent('Gahunda + 2/3'))
  })
})

describe('dashboard recipient — owner-confirmed config', () => {
  it('resolves to the owner-confirmed number when no env override is set', () => {
    expect(QUICK_PRICE_WHATSAPP_RECIPIENT).toBe('+250790215965')
    expect(QUICK_PRICE_WHATSAPP_RECIPIENT.replace(/\D/g, '')).toBe('250790215965')
  })

  it('mobile: the shipped button lands in the recipient chat, not the picker', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    })
    const { href, target } = buildPriceRequestTarget(
      generateWhatsAppPriceRequest({ index: 1, total: 1, products: PRODUCTS.slice(0, 2) }, { language: 'en' }),
      QUICK_PRICE_WHATSAPP_RECIPIENT,
    )
    expect(href).toMatch(/^https:\/\/wa\.me\/250790215965\?text=/)
    expect(target).toBe('_self')
    vi.unstubAllGlobals()
  })
})
