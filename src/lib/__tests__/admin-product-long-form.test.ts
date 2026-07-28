import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseProductBrief } from '@/lib/product-brief'

const read = (path: string) => readFileSync(path, 'utf8')
const form = read('src/components/admin/AdminProductManager.tsx')
const schema = read('src/lib/admin-product-schema.ts')

const rangeBrief = `**Kojie•San Skin Lightening Soap – Classic**

Short Description
An authentic kojic acid soap formulated to brighten the appearance of skin.

Full Description
A detailed but valid product description.

Volume / Weight
**65 g (2.29 oz)**

SKU
**KJS-SLS-065**

How to Use
Step 1
Wet the soap.
Step 2
Rinse thoroughly.

Warnings
- For external use only.
- Patch test before use.

Skin Type
✅ Normal
✅ Combination
✅ Oily
✅ Dry

Category
**Skincare → Cleansers → Brightening Soap**

Brand
**Kojie•San**

Retail Price (Rwanda)
**Retail Price: RWF 5,500–8,500**

Suggested Wholesale Price
Approximately 75–85% of retail.
**Wholesale: RWF 4,200–6,200**`

describe('admin long-form product creation', () => {
  it('imports safe text fields and never guesses a price range', () => {
    const parsed = parseProductBrief(rangeBrief)
    expect(parsed.name).toBe('Kojie•San Skin Lightening Soap – Classic')
    expect(parsed.shortDescription).toContain('authentic kojic acid soap')
    expect(parsed.description).toContain('detailed but valid')
    expect(parsed.volume).toBe('65 g (2.29 oz)')
    expect(parsed.sku).toBe('KJS-SLS-065')
    expect(parsed.skinType).toEqual(['NORMAL', 'COMBINATION', 'OILY', 'DRY'])
    expect(parsed.price).toBe('')
    expect(parsed.wholesalePrice).toBe('')
    expect(parsed.priceNeedsExactValue).toBe(true)
    expect(parsed.wholesaleNeedsExactValue).toBe(true)
  })

  it('imports exact whole-number prices', () => {
    const parsed = parseProductBrief(`${rangeBrief.split('Retail Price (Rwanda)')[0]}Retail Price (Rwanda)\n7000\n\nSuggested Wholesale Price\n5200`)
    expect(parsed.price).toBe('7000')
    expect(parsed.wholesalePrice).toBe('5200')
  })

  it('shows counters, multiline fields, price guidance, and specific validation', () => {
    expect(form).toContain('Paste a product brief from ChatGPT or Gemini')
    expect(form).toContain('Apply brief to form')
    expect(form).toContain('{form.shortDescription.length} / 300')
    expect(form).toContain('{form.description.length.toLocaleString()} / 5,000')
    expect(form).toContain('Do not enter RWF, commas, percentages, or a range')
    expect(form).toContain("!isWholeNumber(form.price)")
  })

  it('aligns create and update API limits with the visible form', () => {
    expect(schema).toContain('shortDescription: z.string().trim().max(300)')
    expect(schema).toContain('description: z.string().trim().max(5000)')
    expect(schema).toContain('usageInstructions: z.string().trim().max(3000)')
    expect(schema).toContain('warnings: z.string().trim().max(3000)')
    expect(schema).toContain('ingredients: z.array(z.string().trim().min(1).max(200)).max(100)')
  })
})
