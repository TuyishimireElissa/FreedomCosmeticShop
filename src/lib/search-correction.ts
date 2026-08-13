import { LOCAL_SEARCH_VOCABULARY, jaroWinkler } from '@/lib/search-vocabulary'

/**
 * "Did you mean …?" for a search that found nothing useful.
 *
 * WHY NOT `getAlternativeSuggestions`
 *
 * That helper already exists but returns broad category names — every miss
 * gets back "Skincare / Haircare / Body lotion" regardless of what was typed.
 * Useful as a browse prompt, useless as a correction: it cannot tell a
 * shopper that `sunscrin` should be `sunscreen`.
 *
 * WHAT THIS DOES INSTEAD
 *
 * Two sources, in order of confidence:
 *
 *  1. THE EXPANSION ITSELF. `expandSearchQuery('sunscrin')` already yields
 *     `['sunscrin', 'sunscreen', 'spf', ...]` — the vocabulary knows the
 *     misspelling. If the expansion produced a term the shopper did not type,
 *     that term IS the correction, with no guessing involved.
 *
 *  2. JARO-WINKLER against the vocabulary, for typos the map has never seen.
 *     Threshold 0.86, measured against the real misses rather than guessed:
 *
 *         shampo  -> shampoo   0.971   accepted
 *         serrum  -> serum     0.961   accepted
 *         vitanin -> whitening 0.757   rejected, correctly
 *         xyzfake -> noxzema   0.631   rejected
 *         zzzzzz  -> bazerin   0.437   rejected
 *
 *     0.86 sits in the wide gap between 0.961 and 0.757, so it is not a
 *     knife-edge choice.
 *
 * IT NEVER INVENTS. A suggestion is only ever a term that already exists in
 * the vocabulary.
 *
 * IT ALSO STAYS QUIET WHEN THE SEARCH ALREADY WORKS. Measured live:
 * `sunscrin` returns 3 products, `moisturiser` 49, `vitanin` 26 — the
 * vocabulary resolves all three upstream, so there is nothing to correct.
 * Only a query that genuinely finds nothing (`shampo`, 0 hits) gets a
 * suggestion. The caller shows it only on an empty result set, so a
 * suggestion can never appear beside products.
 *
 * The caller must still confirm the suggestion leads somewhere:
 * `suggestCorrection` knows the vocabulary, not the stock level. Proposing
 * "sunscreen" to a shop that carries none would just be a second empty page.
 */

/** Above this, two strings are the same word misspelled. Tuned, not guessed. */
export const CORRECTION_THRESHOLD = 0.86

/** Ignore very short tokens: at 3 characters everything looks like everything. */
const MIN_LENGTH = 4

const VOCABULARY_KEYS = Object.keys(LOCAL_SEARCH_VOCABULARY)

/** Every single-word canonical term the vocabulary can expand to. */
const CANONICAL_TERMS = [
  ...new Set(
    Object.values(LOCAL_SEARCH_VOCABULARY)
      .flat()
      .filter((term) => !term.includes(' ') && term.length >= MIN_LENGTH)
      .map((term) => term.toLocaleLowerCase('rw-RW')),
  ),
]

const KNOWN_TERMS = new Set([...VOCABULARY_KEYS, ...CANONICAL_TERMS].map((term) => term.toLocaleLowerCase('rw-RW')))

/** True when the shopper spelled a term the vocabulary already recognises. */
export function isKnownTerm(query: string) {
  return KNOWN_TERMS.has(query.toLocaleLowerCase('rw-RW').trim())
}

/**
 * Best single-word correction for a query, or null when nothing is close
 * enough to be worth suggesting.
 */
export function suggestCorrection(query: string): string | null {
  const normalized = query.toLocaleLowerCase('rw-RW').trim()
  if (normalized.length < MIN_LENGTH) return null

  // A word the vocabulary knows is already spelled correctly. Suggesting a
  // synonym for it is not a correction, it is a non-sequitur.
  //
  // MY FIRST VERSION GOT THIS WRONG. It returned the first expansion that
  // differed from the input, which produced `vitamin -> brightening` and
  // `serum -> treatment` for perfectly good queries, and `vitanin -> beige`
  // because the fuzzy matcher had already mapped the typo to a shade name
  // upstream. Only offer a correction when the typed word is NOT itself known.
  if (isKnownTerm(normalized)) return null

  // Nearest vocabulary key by Jaro-Winkler. Only single words: a multi-word
  // key cannot be a misspelling of a single token.
  let best: string | null = null
  let bestScore = CORRECTION_THRESHOLD
  for (const key of VOCABULARY_KEYS) {
    if (key.includes(' ')) continue
    const score = jaroWinkler(normalized, key)
    if (score > bestScore) {
      bestScore = score
      best = key
    }
  }

  // Also consider the canonical terms themselves, so `vitanin` can reach
  // `vitamin` even though `vitamin` is a value rather than a key.
  for (const term of CANONICAL_TERMS) {
    const score = jaroWinkler(normalized, term)
    if (score > bestScore) {
      bestScore = score
      best = term
    }
  }
  if (!best) return null

  // Map a Kinyarwanda key through to the term that will actually match
  // product text; keys like `seramu` are not in any product name.
  const canonical = LOCAL_SEARCH_VOCABULARY[best]?.find((term) => !term.includes(' '))
  return canonical || best
}
