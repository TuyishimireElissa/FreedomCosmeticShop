/**
 * WhatsApp pricing workflow — message generation and reply parsing.
 *
 * WHY THIS EXISTS
 *
 * 97 of 108 live products are priced at 0 RWF. The prices were never captured
 * in the snapshot that survived the 2026-08-20 database loss, so they exist
 * only in the owner's father's head. He does not use the admin panel; he uses
 * WhatsApp. This module turns that into a workflow: send him a list, paste his
 * reply back, sync.
 *
 * Pure functions only — no React, no Prisma, no fetch. That keeps the shared
 * client bundle unchanged and makes every rule below unit-testable.
 *
 * ─── WHY PHOTO URLS ARE NOT IN THE MESSAGE ───────────────────────────────
 *
 * The original spec put a Cloudinary link under every item. Measured against
 * real rows: a batch of 10 produces a 3,871-character wa.me URL and a batch of
 * 15 produces 5,607. WhatsApp truncates prefilled text around 1,000 characters
 * and the URL hard-fails near 2,057, so those messages would arrive cut in
 * half — silently, and only for the longest batches.
 *
 * Instead each batch carries ONE signed link to a mobile photo page. Owner
 * decision 2026-08-22 (option B). Measured result below MAX_MESSAGE_CHARS.
 *
 * ─── WHY SKU IS THE PRINTED KEY ──────────────────────────────────────────
 *
 * Slugs run to 81 characters and one product's slug is literally `soap`, which
 * collides with a category slug. SKUs are 97/97 unique and max 21 characters.
 * Shorter message, unambiguous match.
 */

/**
 * Ceiling for the encoded wa.me URL, which is the limit that actually bites.
 *
 * Measured, not assumed. Reported behaviour: prefilled text starts truncating
 * around 1,000 characters and the whole URL hard-fails near 2,057. 1,800 keeps
 * a margin under that ceiling for the longest batch.
 */
export const MAX_URL_CHARS = 1800

/**
 * Room set aside for the signed photo link when batches are sized before one
 * exists. A real quick-price JWT plus the origin measures ~270 characters;
 * 320 leaves margin for a longer host or a future claim.
 */
export const PHOTO_LINK_RESERVE = 320

/**
 * Batch size, chosen by measuring every batch against the real 97 products
 * rather than picking a round number.
 *
 *   size  batches  longest message  longest wa.me URL
 *      4       25              832               1221
 *      8       13             1212               1692   <- chosen
 *     10       10             1349               1946   (too close to 2057)
 *     12        9             1523               2226   (over the hard limit)
 *
 * 8 is the largest size that leaves real headroom. It also keeps the count to
 * 13 messages instead of 25, which matters when a person has to send them by
 * hand and read the replies.
 */
export const DEFAULT_BATCH_SIZE = 8

/** Rwandan Franc sanity bounds. The real catalogue runs 2,300–17,000 RWF; the
 *  ceiling is deliberately generous but still catches a slipped decimal or a
 *  phone number pasted into a price column. */
export const MIN_PRICE_RWF = 1
export const MAX_PRICE_RWF = 10_000_000

export interface PricingProduct {
  slug: string
  name: string
  sku: string | null
  imageUrl?: string | null
}

export interface PriceBatch {
  index: number
  total: number
  products: PricingProduct[]
}

/**
 * Split the unpriced list into batches that each fit in one WhatsApp message.
 *
 * `batchSize` is a CEILING, not a promise. Batches are also split by measured
 * encoded length, because a fixed item count is not safe: 17 of the 97 real
 * products have non-ASCII names, and percent-encoding inflates them badly.
 * "ASANTEE Tamarind & Goat Milk Herbal Soap (สบู่สมุนไพรมะขามผสมนมแพะ)" is 67
 * characters that become 275 in a URL — four times the cost of an ASCII name
 * of the same length. A batch of 8 such rows blows the limit even though 8
 * ASCII rows fit comfortably.
 *
 * So each product is added only while the resulting URL still fits, and a
 * single product that cannot fit on its own is still emitted alone rather than
 * silently dropped from the catalogue.
 */
export function buildPriceBatches(
  products: PricingProduct[],
  batchSize: number = DEFAULT_BATCH_SIZE,
  options: PriceRequestOptions = {},
): PriceBatch[] {
  const size = Math.max(1, Math.floor(batchSize))
  const groups: PricingProduct[][] = []
  let current: PricingProduct[] = []

  // A signed photo link is attached later by the dashboard. Reserve room for
  // it now, or a batch sized without one overflows the moment it is added.
  const reserved = options.photoUrl ? 0 : PHOTO_LINK_RESERVE
  const fits = (candidate: PricingProduct[]) => {
    const message = generateWhatsAppPriceRequest(
      { index: 1, total: 1, products: candidate },
      options,
    )
    return buildPriceRequestUrl(message).length + reserved <= MAX_URL_CHARS
  }

  for (const product of products) {
    const next = [...current, product]
    if (current.length > 0 && (next.length > size || !fits(next))) {
      groups.push(current)
      current = [product]
    } else {
      current = next
    }
  }
  if (current.length > 0) groups.push(current)

  return groups.map((batch, position) => ({
    index: position + 1,
    total: groups.length,
    products: batch,
  }))
}

export interface PriceRequestOptions {
  /** Signed, expiring link to the photo page for this batch. Optional so the
   *  message still generates in tests and previews without a token. */
  photoUrl?: string | null
  language?: 'en' | 'rw'
}

/**
 * Format one batch as a WhatsApp message.
 *
 * Kinyarwanda is the default because that is the language the recipient reads.
 */
export function generateWhatsAppPriceRequest(
  batch: PriceBatch,
  options: PriceRequestOptions = {},
): string {
  const isRW = (options.language ?? 'rw') === 'rw'
  const rule = '-------------------------'

  const header = isRW
    ? `IBICIRO — FreedomCosmeticShop\nUrutonde ${batch.index}/${batch.total}`
    : `PRICE REQUEST — FreedomCosmeticShop\nBatch ${batch.index} of ${batch.total}`

  const lines = batch.products.map((product, position) => {
    const number = position + 1
    const id = product.sku?.trim() || product.slug
    return `${number}. ${product.name}\n   ${id}\n   _____ / _____`
  })

  const photoLine = options.photoUrl
    ? (isRW
      ? `\nAmafoto y'ibi bicuruzwa:\n${options.photoUrl}\n`
      : `\nPhotos for these items:\n${options.photoUrl}\n`)
    : '\n'

  // The example is numbered 1 and 2 so the reply format is unmistakable, and
  // states plainly that wholesale is optional — the owner confirmed a
  // retail-only reply must be valid.
  const footer = isRW
    ? `${rule}\nSubiza gutya (igiciro / igiciro cyo kurangura):\n1. 2500 / 2000\n2. 3000\n\nNiba nta giciro cyo kurangura, andika kimwe gusa.`
    : `${rule}\nReply like this (retail / wholesale):\n1. 2500 / 2000\n2. 3000\n\nIf there is no wholesale price, send just the one number.`

  return `${header}\n${rule}\n${lines.join('\n\n')}\n${photoLine}${footer}`
}

export type ParseErrorCode =
  | 'NO_MATCH'
  | 'BAD_NUMBER'
  | 'OUT_OF_RANGE'
  | 'WHOLESALE_ABOVE_RETAIL'
  | 'UNKNOWN_ID'
  | 'DUPLICATE'

export interface ParsedPrice {
  slug: string
  name: string
  sku: string | null
  retail: number
  wholesale: number | null
  /** How the line was matched, so the UI can show why. */
  matchedBy: 'index' | 'sku' | 'slug'
  sourceLine: string
}

export interface ParseIssue {
  line: string
  code: ParseErrorCode
  message: string
}

export interface ParseResult {
  matched: ParsedPrice[]
  issues: ParseIssue[]
}

/** `2 500`, `2,500`, `2.500` and `2500 RWF` all mean 2500. */
function toAmount(raw: string): number | null {
  const cleaned = raw.replace(/rwf|frw/gi, '').replace(/[\s,.']/g, '').trim()
  if (!/^\d+$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isSafeInteger(value) ? value : null
}

/**
 * Parse a WhatsApp reply into price updates.
 *
 * Accepts the formats a person actually types:
 *   `1. 2500 / 2000`   `1) 2500/2000`   `1 - 2500`
 *   `FCS-C6032B: 2500 / 2000`
 *   `dettol-juniors-glycerine-soap 2500`
 *
 * ─── WHY THE INDEX MUST BE LINE-ANCHORED ─────────────────────────────────
 *
 * 29 of the 97 unpriced products have digits in their names — "777 MEN Super
 * Love Perfume Set", "Barakkat Rouge 540", "Asantee Papaya & Honey Soap 125g".
 * A parser that scans a line for any number reads `777` as the line index and
 * `540` as a price. So the index is only accepted at the very start of a line,
 * and only when followed by a separator.
 *
 * Nothing is guessed. A line that cannot be matched with confidence is
 * returned as an issue for a human to look at, never silently dropped and
 * never approximated to the nearest product.
 */
export function parseWhatsAppPriceReply(
  text: string,
  products: PricingProduct[],
): ParseResult {
  const matched: ParsedPrice[] = []
  const issues: ParseIssue[] = []
  const seen = new Set<string>()

  const bySku = new Map<string, PricingProduct>()
  const bySlug = new Map<string, PricingProduct>()
  for (const product of products) {
    if (product.sku) bySku.set(product.sku.trim().toUpperCase(), product)
    bySlug.set(product.slug.toLowerCase(), product)
  }

  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    // Skip the message furniture the father will quote back: headers, rules,
    // the reply example, and the photo link.
    if (/^[-=_*]{3,}$/.test(line)) continue
    if (/^(price request|ibiciro|batch|urutonde|photos?|amafoto|reply|subiza)/i.test(line)) continue
    if (/^https?:\/\//i.test(line)) continue

    let product: PricingProduct | undefined
    let matchedBy: ParsedPrice['matchedBy'] = 'index'
    let remainder = ''

    // 1. Line-anchored index: "1." / "1)" / "1 -" / "1:"
    const indexMatch = /^(\d{1,3})\s*[.)\]:—–-]\s*(.*)$/.exec(line)
    if (indexMatch) {
      const position = Number(indexMatch[1])
      product = products[position - 1]
      remainder = indexMatch[2]
      matchedBy = 'index'
      if (!product) {
        issues.push({ line, code: 'NO_MATCH', message: `No product at position ${position} in this batch.` })
        continue
      }
    } else {
      // 2. SKU or slug key: "FCS-C6032B: 2500" / "dettol-juniors 2500"
      const keyMatch = /^([A-Za-z0-9][A-Za-z0-9-]{2,80})\s*[:=\s]\s*(.+)$/.exec(line)
      if (!keyMatch) {
        issues.push({ line, code: 'NO_MATCH', message: 'Could not find a product number or ID on this line.' })
        continue
      }
      const key = keyMatch[1]
      remainder = keyMatch[2]
      const skuHit = bySku.get(key.toUpperCase())
      const slugHit = bySlug.get(key.toLowerCase())
      product = skuHit || slugHit
      matchedBy = skuHit ? 'sku' : 'slug'
      if (!product) {
        issues.push({ line, code: 'UNKNOWN_ID', message: `"${key}" does not match any product in this batch.` })
        continue
      }
    }

    // Blank placeholders mean "not answered yet", not zero.
    if (/^[_\s/–—-]*$/.test(remainder)) continue

    const parts = remainder.split(/[/|]/).map((part) => part.trim()).filter(Boolean)
    if (parts.length === 0) {
      issues.push({ line, code: 'BAD_NUMBER', message: 'No price found on this line.' })
      continue
    }

    const retail = toAmount(parts[0])
    if (retail === null) {
      issues.push({ line, code: 'BAD_NUMBER', message: `"${parts[0]}" is not a number.` })
      continue
    }
    if (retail < MIN_PRICE_RWF || retail > MAX_PRICE_RWF) {
      issues.push({ line, code: 'OUT_OF_RANGE', message: `${retail} RWF is outside the accepted range.` })
      continue
    }

    let wholesale: number | null = null
    if (parts.length > 1) {
      // A second blank ("2500 / _____") means retail only, which is valid.
      if (!/^[_\s–—-]*$/.test(parts[1])) {
        wholesale = toAmount(parts[1])
        if (wholesale === null) {
          issues.push({ line, code: 'BAD_NUMBER', message: `"${parts[1]}" is not a number.` })
          continue
        }
        if (wholesale < MIN_PRICE_RWF || wholesale > MAX_PRICE_RWF) {
          issues.push({ line, code: 'OUT_OF_RANGE', message: `${wholesale} RWF is outside the accepted range.` })
          continue
        }
        // The admin product schema already enforces this. Catching it here
        // means the owner sees a clear message instead of a 400 from the API.
        if (wholesale > retail) {
          issues.push({
            line,
            code: 'WHOLESALE_ABOVE_RETAIL',
            message: `Wholesale ${wholesale} is higher than retail ${retail}. Likely a typo.`,
          })
          continue
        }
      }
    }

    if (seen.has(product.slug)) {
      issues.push({ line, code: 'DUPLICATE', message: `${product.name} was already priced earlier in this reply.` })
      continue
    }
    seen.add(product.slug)

    matched.push({
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      retail,
      wholesale,
      matchedBy,
      sourceLine: line,
    })
  }

  return { matched, issues }
}

/** The full click-to-chat URL, so callers never hand-roll wa.me encoding. */
export function buildPriceRequestUrl(message: string, phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '')
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(message)}`
}

/** True when the generated link is short enough for WhatsApp to keep intact. */
export function fitsWhatsAppUrl(message: string, phone?: string | null): boolean {
  return buildPriceRequestUrl(message, phone).length <= MAX_URL_CHARS
}
