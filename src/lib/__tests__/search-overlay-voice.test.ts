/**
 * Phase 2: search overlay and voice input.
 *
 * WHAT WAS ACTUALLY MISSING
 *
 * The brief's Sections D (recent searches), E (trending), F (instant results)
 * and G (empty state) already existed in SearchWithSuggestions.tsx. What did
 * not exist: voice input, category quick-chips, a full-screen mobile overlay,
 * and a focus trap. Those are what this phase adds.
 *
 * THREE THINGS FROM THE BRIEF ARE DELIBERATELY ABSENT.
 *
 * 1. Colour swatches (Section C). No colour column, no tags column, shadeHex
 *    NULL on all 106 live products. Seven swatches returning zero results
 *    each. Owner decision 2026-08-13.
 * 2. A Makeup category chip. All 6 makeup rows are isDeleted seed data — 0
 *    live. /api/categories already hides it.
 * 3. A QR/scan button. No barcode scanner exists in this codebase.
 *
 * EVERY TRENDING TERM WAS RUN AGAINST LIVE PRODUCTION. A chip that leads to
 * "no products found" teaches the shopper that search is broken.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CATEGORY_CHIPS, TRENDING_SEARCHES } from '@/lib/search-trending'
import { VOICE_SILENCE_MS, recognitionLanguage } from '@/hooks/use-voice-search'
import { expandSearchQuery } from '@/lib/search-vocabulary'

const read = (path: string) => {
  const raw = readFileSync(path, 'utf8')
  expect(raw.length, `${path} is empty`).toBeGreaterThan(200)
  return raw
}
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const overlay = code('src/components/storefront/SearchOverlay.tsx')
const hook = code('src/hooks/use-voice-search.ts')
const navbar = code('src/components/layout/Navbar.tsx')
const trending = code('src/lib/search-trending.ts')
const enSource = read('src/lib/i18n/translations/en.ts')
const rwSource = read('src/lib/i18n/translations/rw.ts')

describe('voice search degrades instead of pretending', () => {
  it('detects capability, never the user agent', () => {
    // On iOS EVERY browser is WebKit — Chrome and Firefox included — so
    // sniffing for "Safari" would leave iOS Chrome with a dead button.
    // Assert the PROPERTY ACCESS, not the quoted string: the quoted form
    // appears only in the doc comment, which `code()` strips. My first
    // version of this test failed for that reason.
    expect(hook).toContain('w.webkitSpeechRecognition')
    expect(hook).toContain('w.SpeechRecognition')
    expect(hook).not.toMatch(/navigator\.userAgent/i)
    expect(hook).not.toMatch(/\/iPhone|iPad|Safari\//)
  })

  it('starts unsupported so the server and first client render agree', () => {
    // Returning true during SSR would flip the button out of existence on
    // hydration and trip a mismatch.
    expect(hook).toContain('useState(false)')
    expect(hook).toMatch(/useEffect\(\(\) => \{\s*setSupported\(/)
  })

  it('reports a blocked microphone separately from an unsupported browser', () => {
    // "Allow the mic" and "your browser cannot do this" need different advice.
    expect(hook).toContain("'not-allowed'")
    expect(hook).toContain("'service-not-allowed'")
    expect(hook).toContain("'denied'")
  })

  it('treats silence and abort as normal, not as errors', () => {
    expect(hook).toContain("code === 'aborted' || code === 'no-speech'")
  })

  it('auto-submits after the brief’s two seconds of silence', () => {
    expect(VOICE_SILENCE_MS).toBe(2000)
    expect(hook).toContain('VOICE_SILENCE_MS')
  })

  it('restarts the silence timer on every fragment', () => {
    // Otherwise a speaker who pauses mid-sentence is cut off.
    expect(hook).toContain('clearSilenceTimer()')
    expect(hook).toContain('interimResults = true')
  })

  it('releases the microphone when the component unmounts', () => {
    // A live recogniser keeps the browser recording indicator lit.
    expect(hook).toMatch(/useEffect\(\(\) => \(\) => \{[\s\S]{0,240}?abort\(\)/)
  })

  it('never asks for a Kinyarwanda speech model, because none exists', () => {
    // No shipping browser has rw-RW. Requesting it throws
    // language-not-supported or silently returns garbage.
    expect(recognitionLanguage('rw')).toBe('en-US')
    expect(recognitionLanguage('en')).toBe('en-US')
    expect(hook).not.toContain("'rw-RW'")
  })

  it('relies on transliteration to bridge the language gap', () => {
    // A Kinyarwanda speaker saying "seramu" transcribes near "serum", and the
    // existing vocabulary resolves it. That is why en-US is acceptable.
    expect(expandSearchQuery('seramu')).toContain('serum')
  })

  it('does not write to a ref during render', () => {
    // react-hooks/refs flagged this and it is a real bug under StrictMode.
    // The assignment must sit INSIDE an effect. A bare /^\s*...$/m regex was
    // wrong: it also matched the correctly-indented line within the effect.
    expect(hook).toMatch(/useEffect\(\(\) => \{\s*onResultRef\.current = onResult/)
    const withoutEffect = hook.replace(/useEffect\(\(\) => \{\s*onResultRef\.current = onResult[\s\S]*?\}, \[onResult\]\)/, '')
    expect(withoutEffect.length, 'effect anchor did not match').toBeLessThan(hook.length)
    expect(withoutEffect).not.toContain('onResultRef.current = onResult')
  })
})

describe('the overlay only offers things that exist', () => {
  it('renders no colour swatches', () => {
    // The brief asks for seven. There is no colour data of any kind.
    for (const colour of ['Umutuku', 'Zahabu', 'swatch', 'shadeHex']) {
      expect(overlay, `overlay references ${colour}`).not.toContain(colour)
    }
  })

  it('offers no Makeup chip, because there is no live makeup stock', () => {
    const slugs = CATEGORY_CHIPS.map((chip) => chip.slug)
    expect(slugs).not.toContain('makeup')
  })

  it('never uses the brief’s invented word for makeup', () => {
    // "Imikara" is not Kinyarwanda for makeup. The established term already
    // in rw.ts is "Ibikoresho byo kwisiga".
    expect(trending).not.toContain('Imikara')
    expect(overlay).not.toContain('Imikara')
  })

  it('offers no QR or barcode entry point', () => {
    // No scanner exists anywhere in this codebase.
    expect(overlay).not.toMatch(/\bQrCode\b|\bScanLine\b|\bbarcode\b/i)
  })

  it('uses only category slugs the catalogue actually serves', () => {
    // Verified live 2026-08-26: soap 33, fragrance 34, whitening 9,
    // baby-kids 7, haircare 7, body-oil 2, skincare 3.
    const known = new Set(['', 'soap', 'fragrance', 'whitening', 'baby-kids', 'haircare', 'body-oil', 'skincare'])
    for (const chip of CATEGORY_CHIPS) {
      expect(known.has(chip.slug), `unknown slug ${chip.slug}`).toBe(true)
    }
  })

  it('lists no trending term that returns nothing', () => {
    // "sunscreen" was dropped: its 3 hits are whitening soaps, not sunscreen.
    // The vocabulary expands it to "sun protection" and matches descriptions
    // containing "sun". Promoting it would advertise stock that is not there.
    const queries = TRENDING_SEARCHES.map((term) => term.query.toLowerCase())
    expect(queries).not.toContain('sunscreen')
    expect(queries).not.toContain('cream yo kurinda izuba')
    // The reasoning lives in the file's doc comment, which `code()` strips,
    // so read the raw source for this one.
    expect(read('src/lib/search-trending.ts')).toContain('sunscreen')
  })

  it('keeps trending short enough for one row at 360px', () => {
    expect(TRENDING_SEARCHES.length).toBeLessThanOrEqual(5)
    expect(TRENDING_SEARCHES.length).toBeGreaterThan(0)
  })

  it('gives every chip both languages', () => {
    for (const term of TRENDING_SEARCHES) {
      expect(term.rw.trim().length, `${term.query} missing rw`).toBeGreaterThan(0)
      expect(term.en.trim().length, `${term.query} missing en`).toBeGreaterThan(0)
      expect(term.query.trim().length).toBeGreaterThan(0)
    }
    for (const chip of CATEGORY_CHIPS) {
      expect(chip.rw.trim().length, `${chip.en} missing rw`).toBeGreaterThan(0)
      expect(chip.en.trim().length).toBeGreaterThan(0)
    }
  })

  it('marks the Kinyarwanda as reviewed', () => {
    expect(trending).toContain('verified-rw')
  })
})

describe('the overlay is usable by keyboard and screen reader', () => {
  it('is a modal dialog', () => {
    expect(overlay).toContain('role="dialog"')
    expect(overlay).toContain('aria-modal="true"')
  })

  it('traps Tab inside the panel', () => {
    // Without this, Tab walks into the page behind the overlay.
    expect(overlay).toContain("event.key !== 'Tab'")
    expect(overlay).toContain('event.shiftKey')
    expect(overlay).toContain('FOCUSABLE')
  })

  it('closes on Escape', () => {
    expect(overlay).toMatch(/event\.key === 'Escape'[\s\S]{0,120}?onClose\(\)/)
  })

  it('returns focus to whatever opened it', () => {
    expect(overlay).toContain('returnFocusTo?.current?.focus()')
    expect(navbar).toContain('returnFocusTo={searchTriggerRef}')
  })

  it('does not read a ref during the parent’s render', () => {
    expect(navbar).not.toContain('returnFocusTo={searchTriggerRef.current}')
  })

  it('announces listening to a screen reader', () => {
    expect(overlay).toContain('aria-live="polite"')
    expect(overlay).toContain("t('search.voice_listening')")
  })

  it('marks the trigger as opening a dialog', () => {
    expect(navbar).toContain('aria-haspopup="dialog"')
    expect(navbar).toContain('aria-expanded={searchOpen}')
  })

  it('labels the microphone by state', () => {
    expect(overlay).toContain("t('search.voice_stop')")
    expect(overlay).toContain("t('search.voice_start')")
    expect(overlay).toContain('aria-pressed={voice.listening}')
  })

  it('locks the page behind the overlay and restores it', () => {
    expect(overlay).toContain("document.body.style.overflow = 'hidden'")
    expect(overlay).toContain('document.body.style.overflow = previousOverflow')
  })
})

describe('the overlay respects the house rules', () => {
  it('honours prefers-reduced-motion on the listening pulse', () => {
    // The ping animation is the only motion in here.
    const pulses = overlay.match(/animate-ping|animate-pulse|animate-spin/g) || []
    expect(pulses.length).toBeGreaterThan(0)
    const reduced = overlay.match(/motion-reduce:animate-none/g) || []
    expect(reduced.length, 'some animation is not gated').toBeGreaterThanOrEqual(pulses.length)
  })

  it('uses fcs tokens rather than raw hex', () => {
    const hex = overlay.match(/#[0-9a-fA-F]{6}\b/g) || []
    expect(hex, `raw hex in overlay: ${hex.join(', ')}`).toEqual([])
    expect(overlay).toContain('fcs-')
  })

  it('never uses the banned low-contrast rose', () => {
    expect(overlay).not.toContain('#C77B85')
  })

  it('adds no web font', () => {
    expect(overlay).not.toMatch(/fonts\.googleapis|@font-face|next\/font/)
  })

  it('meets the 44px tap target on every control', () => {
    // h-10 = 40px is allowed only on chips, which sit in a 12px-padded row.
    for (const size of ['h-12 w-12', 'min-h-14', 'min-h-12']) {
      expect(overlay, `missing ${size}`).toContain(size)
    }
  })

  it('sizes its thumbnails instead of shipping originals', () => {
    // The fix from edbf62b must not be undone by a new surface.
    expect(overlay).toContain('thumbnailImageUrl(')
    expect(overlay).toContain('loading="lazy"')
  })

  it('debounces typing at the brief’s 200ms', () => {
    expect(overlay).toContain('DEBOUNCE_MS = 200')
  })

  it('aborts an in-flight request when the query changes', () => {
    expect(overlay).toContain('abortRef.current?.abort()')
    expect(overlay).toContain('AbortController')
  })

  it('survives sessionStorage being unavailable', () => {
    // Private mode throws on read and write.
    const writes = overlay.match(/sessionStorage\.(setItem|removeItem|getItem)/g) || []
    expect(writes.length).toBeGreaterThan(0)
    const guards = overlay.match(/catch\s*\{/g) || []
    expect(guards.length).toBeGreaterThanOrEqual(3)
  })
})

describe('translations exist in both shipped languages', () => {
  const keys = [
    'voice_start', 'voice_stop', 'voice_listening', 'voice_denied', 'voice_error',
    'trending', 'overlay_placeholder', 'see_all_count', 'did_you_mean', 'no_products_found',
  ]

  it.each(keys)('en has search.%s', (key) => {
    expect(enSource).toContain(`${key}:`)
  })

  it.each(keys)('rw has search.%s', (key) => {
    expect(rwSource).toContain(`${key}:`)
  })

  it('marks the new Kinyarwanda as reviewed', () => {
    const start = rwSource.indexOf('voice_start:')
    const end = rwSource.indexOf('no_products_found:')
    expect(start, 'voice_start missing').toBeGreaterThan(-1)
    expect(end, 'no_products_found missing').toBeGreaterThan(start)
    const block = rwSource.slice(start, end)
    expect(block.length, 'slice is empty').toBeGreaterThan(200)
    const lines = block.split('\n').filter((line) => line.includes(':'))
    for (const line of lines) {
      expect(line, `unverified rw: ${line.trim().slice(0, 50)}`).toContain('verified-rw')
    }
  })

  it('never says igare, which means bicycle', () => {
    expect(overlay).not.toMatch(/\bigare\b/i)
    expect(trending).not.toMatch(/\bigare\b/i)
  })
})
