import {
  ingredientsArrayIsEmpty,
  isEmptyString,
  isEmptySuitableFor,
  isEmptyWeight,
} from '@/lib/product-import'

/**
 * Pure completeness model for the 23 product content fields (Phase 4).
 * No server imports: the API route fetches rows and this module decides,
 * so every counting rule is unit-testable and shared by dashboard + CSV.
 *
 * Definition decisions (documented so the numbers are auditable):
 * - `brand` / `category` count as present when the relation id exists.
 * - `suitableFor` counts as present when the JSONB column has content OR
 *   the legacy `skinType` array has items OR `hairType` is set — the three
 *   channels the display layer already merges.
 * - `ingredients` counts as present when the legacy JSON array has items.
 * - `weight` maps to `weightGrams` (Phase 1 decision) and counts as
 *   present only above zero.
 */

export interface ContentFieldDef {
  key: string
  column: string
  kind: 'string' | 'jsonArray' | 'textArray' | 'json' | 'decimal' | 'relation'
  /** For 'json' fields: legacy columns that also satisfy presence. */
  fallbackColumns?: string[]
}

export const CONTENT_FIELD_DEFS: ContentFieldDef[] = [
  { key: 'name', column: 'name', kind: 'string' },
  { key: 'nameRw', column: 'nameRw', kind: 'string' },
  { key: 'brand', column: 'brandId', kind: 'relation' },
  { key: 'category', column: 'categoryId', kind: 'relation' },
  { key: 'shortDescription', column: 'shortDescription', kind: 'string' },
  { key: 'shortDescriptionRw', column: 'shortDescriptionRw', kind: 'string' },
  { key: 'description', column: 'description', kind: 'string' },
  { key: 'descriptionRw', column: 'descriptionRw', kind: 'string' },
  { key: 'ingredients', column: 'ingredients', kind: 'jsonArray' },
  { key: 'ingredientsRw', column: 'ingredientsRw', kind: 'string' },
  { key: 'howToUse', column: 'howToUse', kind: 'string' },
  { key: 'howToUseRw', column: 'howToUseRw', kind: 'string' },
  { key: 'expectedResults', column: 'expectedResults', kind: 'string' },
  { key: 'expectedResultsRw', column: 'expectedResultsRw', kind: 'string' },
  { key: 'warnings', column: 'warnings', kind: 'string' },
  { key: 'warningsRw', column: 'warningsRw', kind: 'string' },
  { key: 'suitableFor', column: 'suitableFor', kind: 'json', fallbackColumns: ['skinType', 'hairType'] },
  { key: 'uniqueSellingPoints', column: 'uniqueSellingPoints', kind: 'textArray' },
  { key: 'seoKeywords', column: 'seoKeywords', kind: 'string' },
  { key: 'seoKeywordsRw', column: 'seoKeywordsRw', kind: 'string' },
  { key: 'whatsappShareText', column: 'whatsappShareText', kind: 'string' },
  { key: 'sku', column: 'sku', kind: 'string' },
  { key: 'weight', column: 'weightGrams', kind: 'decimal' },
]

/** Kinyarwanda-specific fields, for the "missing translations" priority. */
export const RW_CONTENT_FIELDS: readonly string[] = [
  'nameRw', 'shortDescriptionRw', 'descriptionRw', 'ingredientsRw',
  'howToUseRw', 'expectedResultsRw', 'warningsRw', 'seoKeywordsRw',
]

/** Critical fields: a product missing any of these cannot sell or be indexed. */
export const CRITICAL_FIELDS = ['name', 'description', 'price'] as const

export function isFieldPresent(def: ContentFieldDef, row: Record<string, unknown>): boolean {
  const value = row[def.column]
  switch (def.kind) {
    case 'string':
    case 'relation':
      return !isEmptyString(value)
    case 'jsonArray':
      return !ingredientsArrayIsEmpty(value)
    case 'textArray':
      return Array.isArray(value) && value.length > 0
    case 'json': {
      if (!isEmptySuitableFor(value)) return true
      return (def.fallbackColumns ?? []).some((column) => {
        const fallback = row[column]
        if (column === 'skinType') return !ingredientsArrayIsEmpty(fallback)
        return !isEmptyString(fallback)
      })
    }
    case 'decimal':
      return !isEmptyWeight(value)
  }
}

export interface ContentStatusResult {
  /** Field keys present (max 23). */
  present: string[]
  /** Field keys missing. */
  missing: string[]
  presentCount: number
  missingCount: number
  isComplete: boolean
  /** Critical fields missing (name, description, price). */
  criticalMissing: string[]
  /** Kinyarwanda fields missing. */
  rwMissing: string[]
}

export function computeContentStatus(row: Record<string, unknown>): ContentStatusResult {
  const present: string[] = []
  const missing: string[] = []
  for (const def of CONTENT_FIELD_DEFS) {
    if (isFieldPresent(def, row)) present.push(def.key)
    else missing.push(def.key)
  }
  const criticalMissing = CRITICAL_FIELDS.filter((key) => {
    if (key === 'price') return !(typeof row.price === 'number' && Number.isFinite(row.price))
    return missing.includes(key)
  })
  const rwMissing = missing.filter((key) => RW_CONTENT_FIELDS.includes(key))
  return {
    present,
    missing,
    presentCount: present.length,
    missingCount: missing.length,
    isComplete: missing.length === 0,
    criticalMissing,
    rwMissing,
  }
}

export interface FieldCompletionRow {
  field: string
  complete: number
  missing: number
  pct: number
}

/** Per-field completion table across a set of raw product rows. */
export function computeFieldTable(rows: Array<Record<string, unknown>>): FieldCompletionRow[] {
  const total = rows.length
  return CONTENT_FIELD_DEFS.map((def) => {
    const complete = rows.filter((row) => isFieldPresent(def, row)).length
    const missing = total - complete
    return {
      field: def.key,
      complete,
      missing,
      pct: total === 0 ? 0 : Math.round((complete / total) * 1000) / 10,
    }
  })
}

/** First URL of the legacy images JSON string, or null. */
export function firstLegacyImage(imagesValue: unknown): string | null {
  if (isEmptyString(imagesValue)) return null
  try {
    const parsed = JSON.parse(String(imagesValue))
    if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0]) return parsed[0]
  } catch {
    return null
  }
  return null
}

/** CSV cell escaping: wrap in quotes, double inner quotes. */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}
