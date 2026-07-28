const BRIEF_HEADINGS = [
  'Short Description', 'Full Description', 'Volume / Weight', 'SKU', 'Shades', 'Key Ingredients',
  'How to Use', 'Warnings', 'Skin Type', 'Category', 'Country of Origin', 'Brand', 'Manufacturer',
  'Target Area', 'Benefits', 'Fragrance', 'Color', 'Texture', 'Retail Price (Rwanda)',
  'Suggested Wholesale Price', 'SEO Title', 'SEO Meta Description',
] as const

function cleanBriefText(value: string) {
  return value.replace(/\*\*/g, '').replace(/^\s*[-*]\s+/gm, '').replace(/✅/g, '').replace(/\r/g, '').trim()
}

export function parseProductBrief(value: string) {
  const cleaned = cleanBriefText(value)
  const lines = cleaned.split('\n').map((line) => line.trim())
  const headingMap = new Map(BRIEF_HEADINGS.map((heading) => [heading.toLowerCase(), heading]))
  const sections = new Map<string, string[]>()
  const preamble: string[] = []
  let active = ''
  for (const line of lines) {
    const heading = headingMap.get(line.replace(/:$/, '').toLowerCase())
    if (heading) {
      active = heading
      if (!sections.has(active)) sections.set(active, [])
      continue
    }
    if (!line) continue
    if (active) sections.get(active)!.push(line)
    else preamble.push(line)
  }
  const section = (name: string) => (sections.get(name) || []).join('\n').trim()
  const list = (name: string) => (sections.get(name) || []).map((line) => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
  const singlePrice = (name: string) => {
    const matches = section(name).replace(/,/g, '').match(/\d+/g) || []
    return matches.length === 1 ? matches[0] : ''
  }
  const extras = ['Country of Origin', 'Manufacturer', 'Target Area', 'Benefits', 'Fragrance', 'Color', 'Texture']
    .flatMap((name) => section(name) ? [`${name}:\n${section(name)}`] : [])
  const fullDescription = [section('Full Description'), ...extras].filter(Boolean).join('\n\n').slice(0, 5000)
  return {
    name: (preamble[0] || '').slice(0, 200),
    shortDescription: section('Short Description').replace(/\n+/g, ' ').slice(0, 300),
    description: fullDescription,
    volume: section('Volume / Weight').split('\n')[0]?.slice(0, 100) || '',
    sku: section('SKU').split('\n')[0]?.slice(0, 100) || '',
    usageInstructions: section('How to Use').slice(0, 3000),
    warnings: section('Warnings').slice(0, 3000),
    skinType: list('Skin Type').map((item) => item.toUpperCase()).filter((item) => ['ALL', 'OILY', 'DRY', 'COMBINATION', 'SENSITIVE', 'NORMAL'].includes(item)),
    price: singlePrice('Retail Price (Rwanda)'),
    wholesalePrice: singlePrice('Suggested Wholesale Price'),
    categoryText: section('Category'),
    brandText: section('Brand').split('\n')[0] || '',
    ingredients: list('Key Ingredients').filter((item) => item.length <= 200 && !/ingredient\s*benefit/i.test(item)),
    priceNeedsExactValue: Boolean(section('Retail Price (Rwanda)')) && !singlePrice('Retail Price (Rwanda)'),
    wholesaleNeedsExactValue: Boolean(section('Suggested Wholesale Price')) && !singlePrice('Suggested Wholesale Price'),
  }
}

export function isWholeNumber(value: string) {
  return /^\d+$/.test(value.trim())
}
