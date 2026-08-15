import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTROLLED_SEARCH_VOCABULARY, matchControlledTerm } from '@/lib/search-vocabulary'

/**
 * Phase 3 — report popular searches without ever storing what was typed.
 *
 * `recordSearch` keeps only an HMAC of the query, because search text can
 * contain a name, a phone number or an address. That makes the log
 * unreadable by design and "what do people search for?" unanswerable.
 *
 * A controlled vocabulary answers it safely: when a query contains a word
 * already published in our own catalogue vocabulary, that WORD is recorded —
 * an exact value from a fixed list, never customer text.
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const analytics = read('src/server/services/search-analytics.ts')
const popular = read('src/app/api/search/popular/route.ts')

describe('the vocabulary matches real catalogue words', () => {
  it('covers both languages the shop is sold in', () => {
    for (const term of ['isabune', 'amavuta', 'uruhu', 'umusatsi']) {
      expect(CONTROLLED_SEARCH_VOCABULARY).toContain(term)
    }
    for (const term of ['soap', 'lotion', 'perfume', 'sunscreen']) {
      expect(CONTROLLED_SEARCH_VOCABULARY).toContain(term)
    }
  })

  it('has no duplicates', () => {
    const unique = new Set<string>(CONTROLLED_SEARCH_VOCABULARY)
    expect(unique.size).toBe(CONTROLLED_SEARCH_VOCABULARY.length)
  })

  it('is entirely lowercase, so matching cannot depend on how it was typed', () => {
    for (const term of CONTROLLED_SEARCH_VOCABULARY) {
      expect(term, `${term} must be lowercase`).toBe(term.toLowerCase())
    }
  })
})

describe('matching a query to a known term', () => {
  it('matches a plain term in either language', () => {
    expect(matchControlledTerm('soap')).toBe('soap')
    expect(matchControlledTerm('isabune')).toBe('isabune')
  })

  it('is case-insensitive', () => {
    expect(matchControlledTerm('SOAP')).toBe('soap')
    expect(matchControlledTerm('Vitamin C')).toBe('vitamin c')
  })

  it('finds the term inside a longer phrase', () => {
    expect(matchControlledTerm('best soap for face')).toBe('soap')
  })

  it('prefers the longest match, not the broadest', () => {
    // "coconut oil" must not be filed under the far broader "oil".
    expect(matchControlledTerm('coconut oil')).toBe('coconut oil')
    expect(matchControlledTerm('shea butter lotion')).toBe('shea butter')
    expect(matchControlledTerm('vitamin c serum')).toBe('vitamin c')
  })

  it('respects word boundaries', () => {
    // Without boundaries "soap" fires on "soapstone", and worse, a short term
    // could match inside a word a customer typed.
    expect(matchControlledTerm('soapstone')).toBeNull()
  })

  it('records nothing for a query that is not catalogue vocabulary', () => {
    expect(matchControlledTerm('xyzfake')).toBeNull()
    expect(matchControlledTerm('')).toBeNull()
    expect(matchControlledTerm('   ')).toBeNull()
  })

  it('records nothing for text that looks like personal data', () => {
    // The whole point: an unrecognised query contributes to no count at all.
    expect(matchControlledTerm('Mukamana 0788123456')).toBeNull()
    expect(matchControlledTerm('kigali nyarugenge')).toBeNull()
  })
})

describe('the privacy model is unchanged', () => {
  it('still hashes the query and never writes it verbatim', () => {
    expect(analytics).toContain("hashSearchValue(normalizedQuery, 'query')")
    expect(analytics).not.toMatch(/query:\s*normalizedQuery\b/)
  })

  it('still hashes the session id', () => {
    expect(analytics).toContain("hashSearchValue(session, 'session')")
  })

  it('stores only a matched vocabulary term, never the raw query', () => {
    expect(analytics).toContain('matchControlledTerm(normalizedQuery)')
    expect(analytics).toContain('term: controlledTerm')
    // The raw text must never reach the JSON column.
    expect(analytics).not.toMatch(/term:\s*normalizedQuery/)
    expect(analytics).not.toMatch(/term:\s*input\.query/)
  })

  it('leaves filters untouched when nothing matched', () => {
    expect(analytics).toContain(': input.filters')
  })

  it('needs no schema change', () => {
    // The term rides in the existing Json? column. This database has no
    // migration table, so avoiding a column change is deliberate.
    const schema = read('prisma/schema.prisma')
    const model = schema.slice(schema.indexOf('model SearchLog {'))
    const body = model.slice(0, model.indexOf('}'))
    expect(body).toContain('filters     Json?')
    expect(body).not.toContain('controlledTerm')
  })
})

describe('the endpoint reports real counts', () => {
  it('no longer returns a hard-coded empty array', () => {
    expect(popular).not.toMatch(/data:\s*\[\],\s*\n\s*methodology:\s*\{\s*rawQueriesStored:\s*false,\s*controlledVocabularyConfigured:\s*false/)
    expect(popular).toContain('controlledVocabularyConfigured: true')
  })

  it('groups by the stored term', () => {
    expect(popular).toContain(`"filters"->>'term'`)
    expect(popular).toContain('GROUP BY')
  })

  it('reports how many of each term found nothing', () => {
    // A popular search that returns zero is the most useful row in the table:
    // it names a product the shop could stock.
    expect(popular).toContain('FILTER (WHERE "hasResults" = false)')
    expect(popular).toContain('zeroResultSearches')
  })

  it('only ever emits a term still in the vocabulary', () => {
    expect(popular).toContain('known.has(row.term)')
    expect(popular).toContain('CONTROLLED_SEARCH_VOCABULARY')
  })

  it('caps how much it returns', () => {
    expect(popular).toContain('MAX_TERMS')
    expect(popular).toContain('LIMIT')
  })

  it('degrades to an empty list rather than breaking the page', () => {
    expect(popular).toContain('catch')
    expect(popular).toContain('success: true')
  })
})
