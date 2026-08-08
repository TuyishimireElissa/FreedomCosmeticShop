import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Several catalogue items ship in multiple sizes at different prices — the
 * Veet Gold Turmeric Oil exists as 200 ml / 300 ml / 500 ml at 7,000 / 8,000 /
 * 10,000 RWF. They are NOT duplicates.
 *
 * When the size rendered at 11px in the metadata row, three legitimate sizes
 * looked like three prices for one product, which reads as overcharging. The
 * size must stay adjacent to the price and legible.
 */
const card = readFileSync(join(process.cwd(), 'src/components/storefront/ProductCard.tsx'), 'utf8')

describe('product size visibility', () => {
  it('renders the size next to the price, not in the metadata row', () => {
    // Both must live inside the same flex pricing row, so the shopper reads
    // "RWF 7,000  200 ml" as one unit. Asserting containment rather than a
    // character distance keeps the test stable when comments change.
    const row = card.slice(card.indexOf('flex flex-wrap items-baseline gap-2'))
    const block = row.slice(0, row.indexOf('</div>'))
    expect(block).toContain('formatRWF(displayPrice)')
    expect(block).toContain('{size}')
  })

  it('keeps the size legible rather than 11px metadata', () => {
    expect(card).not.toContain('min-h-[1rem] text-[11px] text-fcs-text-muted">{size')
    expect(card).toMatch(/text-\[13px\][^>]*>\{size\}/)
  })

  it('uses the accessible muted token, not the 2.54:1 grey', () => {
    expect(card).not.toContain('text-gray-400">{size}')
    expect(card).toContain('text-fcs-text-muted')
  })
})
