'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, Loader2, Mic, MicOff, Search, TrendingUp, X } from 'lucide-react'
import { formatRWF } from '@/lib/format'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { thumbnailImageUrl } from '@/lib/cloudinary-images'
import { getAlternativeSuggestions } from '@/lib/search-vocabulary'
import { CATEGORY_CHIPS, TRENDING_SEARCHES } from '@/lib/search-trending'
import { useVoiceSearch } from '@/hooks/use-voice-search'
import { useStore } from '@/store/useStore'

/**
 * Full-screen search overlay (mobile) / dropdown panel (desktop).
 *
 * WHAT THIS DOES *NOT* DO, AND WHY
 *
 * No colour swatch row. The brief's Section C asks for seven colour circles.
 * The Product model has no colour column, no tags column, and shadeHex is
 * NULL on all 106 live products, so every swatch would return zero results.
 * Owner decision 2026-08-13: skip colour. Documented in SEARCH_FACETS.md.
 *
 * No Makeup category chip. All 6 makeup rows are `isDeleted: true` seed data.
 * The chip would open an empty shelf, and /api/categories already hides the
 * category, so the overlay agrees with the rest of the site.
 *
 * No "scan/QR" entry point. There is no barcode scanner anywhere in this
 * codebase and building one is not in scope for a search overlay.
 *
 * FOCUS TRAP. The overlay is modal on mobile, so Tab must not escape into the
 * page behind it. Escape closes. Focus returns to whatever opened it.
 */

interface ProductSuggestion {
  id: string
  name: string
  slug: string
  price: number
  image?: string | null
  imageUrl?: string | null
  imageAlt?: string
  imageAltRw?: string | null
  brand?: string | null
  brandName?: string | null
  categoryName?: string | null
}

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
  /**
   * Ref to the control that opened the overlay. A ref rather than an element,
   * because reading `.current` during the parent's render is a React
   * violation — the parent would have to touch the ref while rendering.
   */
  returnFocusTo?: React.RefObject<HTMLElement | null>
  /**
   * Begin listening as soon as the overlay opens. Set by the mobile search
   * bar's microphone, so voice is one tap from any page instead of two.
   * Ignored when the browser cannot do speech recognition.
   */
  autoStartVoice?: boolean
}

const RECENT_SEARCHES_KEY = 'fcs_recent_searches'
const MAX_RECENT = 8
const DEBOUNCE_MS = 200

const FOCUSABLE =
  'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

export default function SearchOverlay({ open, onClose, returnFocusTo, autoStartVoice = false }: SearchOverlayProps) {
  const { t, language } = useLanguage()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [products, setProducts] = useState<ProductSuggestion[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [recent, setRecent] = useState<string[]>([])

  /**
   * Signed-in shoppers get history that survives closing the tab.
   *
   * Anonymous recents live in sessionStorage, so they vanish the moment the
   * tab closes — a shopper on a shared phone in an internet café keeps nothing
   * either way, which is the right default. For an authenticated shopper the
   * same list is mirrored to their own row in UserSearchHistory, so it follows
   * them to another device.
   *
   * sessionStorage is still written in both cases: it makes the list appear
   * instantly on reopen while the fetch is in flight, and it is the only store
   * a signed-out shopper has.
   */
  const user = useStore((state) => state.user)
  const signedIn = Boolean(user)

  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const saveRecent = useCallback((term: string) => {
    const value = term.trim()
    if (!value) return
    setRecent((current) => {
      const next = [value, ...current.filter((item) => item.toLocaleLowerCase('rw-RW') !== value.toLocaleLowerCase('rw-RW'))].slice(0, MAX_RECENT)
      try { sessionStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
    // Fire and forget: a failed history write must never delay the search the
    // shopper just asked for. Signed-out shoppers never reach the server.
    if (signedIn) {
      void fetch('/api/user/search-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value.slice(0, 100) }),
      }).catch(() => { /* history is best-effort */ })
    }
  }, [signedIn])

  const submit = useCallback((term: string, categoryOverride?: string) => {
    const value = term.trim()
    const activeCategory = categoryOverride ?? category
    if (!value && !activeCategory) return
    if (value) saveRecent(value)
    const params = new URLSearchParams()
    if (value) params.set('search', value)
    if (activeCategory) params.set('category', activeCategory)
    onClose()
    router.push(`/products?${params.toString()}`)
  }, [category, onClose, router, saveRecent])

  const voice = useVoiceSearch({
    language,
    onResult: (transcript) => {
      setQuery(transcript)
      submit(transcript)
    },
  })

  // Mirror the live transcript into the field so the shopper sees words appear.
  useEffect(() => {
    if (voice.listening && voice.transcript) setQuery(voice.transcript)
  }, [voice.listening, voice.transcript])

  useEffect(() => {
    if (!open) return
    // Paint the local list first so the panel is never briefly empty on a slow
    // connection, then let the server's copy replace it for signed-in users.
    try {
      const stored = JSON.parse(sessionStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
      setRecent(Array.isArray(stored) ? stored.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT) : [])
    } catch {
      setRecent([])
    }

    if (!signedIn) return
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch('/api/user/search-history', { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) return
        const body = await response.json()
        const items: string[] = Array.isArray(body?.data)
          ? body.data.map((row: { query?: string }) => row.query).filter((q: unknown): q is string => typeof q === 'string')
          : []
        // Only replace when the server actually has something. An empty
        // response on a first-ever search must not wipe what is on screen.
        if (items.length > 0) setRecent(items.slice(0, MAX_RECENT))
      } catch {
        // Keep the sessionStorage list already rendered.
      }
    })()
    return () => controller.abort()
  }, [open, signedIn])

  // Opened by the mobile bar's microphone: start listening immediately rather
  // than making the shopper find the mic again inside the overlay. Guarded on
  // `supported` so an unsupported browser just gets a normal open. `start` is
  // intentionally the only dependency alongside the trigger flags — depending
  // on the whole voice object would restart recognition on every transcript
  // fragment.
  useEffect(() => {
    if (!open || !autoStartVoice || !voice.supported) return
    voice.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoStartVoice, voice.supported])

  // Autofocus the field, and lock the page behind the overlay.
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  // Escape closes; Tab is trapped inside the panel.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter((element) => element.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  // Stop the microphone and restore focus on close.
  useEffect(() => {
    if (open) return
    voice.stop()
    setQuery('')
    setProducts([])
    setTotal(0)
    setSearched(false)
    returnFocusTo?.current?.focus()
    // voice.stop is stable; excluding it keeps this from firing on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Instant results, debounced.
  useEffect(() => {
    if (!open) return
    const value = query.trim()
    if (value.length < 2) {
      abortRef.current?.abort()
      setProducts([])
      setTotal(0)
      setSearched(false)
      setLoading(false)
      return
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const params = new URLSearchParams({ q: value, limit: '6' })
        if (category) params.set('category', category)
        const response = await fetch(`/api/products?${params.toString()}`, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('search failed')
        const payload = await response.json()
        setProducts(payload?.data?.products || [])
        setTotal(payload?.pagination?.total ?? payload?.data?.total ?? 0)
        setSearched(true)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setProducts([])
          setTotal(0)
          setSearched(true)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [category, open, query])

  const alternatives = useMemo(
    () => (searched && !loading && products.length === 0 && query.trim().length >= 2
      ? getAlternativeSuggestions(query, language === 'rw' ? 'rw' : 'en').slice(0, 3)
      : []),
    [language, loading, products.length, query, searched],
  )

  const clearRecent = () => {
    try { sessionStorage.removeItem(RECENT_SEARCHES_KEY) } catch { /* private mode */ }
    setRecent([])
    // Clear the server copy too, or it would reappear on the next open and
    // the button would look broken.
    if (signedIn) {
      void fetch('/api/user/search-history', { method: 'DELETE' }).catch(() => { /* best-effort */ })
    }
  }

  // 200ms open/close animation. The overlay stays mounted during the exit
  // transition so the fade/slide is visible; unmount happens when it ends.
  // prefers-reduced-motion: the CSS below drops the transition classes, and
  // the panel disappears on the next frame — the timer only unmounts.
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), 200)
    return () => window.clearTimeout(timer)
  }, [open])

  if (!mounted) return null

  const showIdle = query.trim().length < 2
  const label = (rw: string, en: string) => (language === 'rw' ? rw : en)

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-fcs-surface transition-opacity duration-200 motion-reduce:transition-none md:items-start md:justify-center md:bg-black/40 md:p-6 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={t('search.open_full_search')}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        className={`flex h-full w-full flex-col overflow-hidden bg-fcs-surface transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none md:mx-auto md:h-auto md:max-h-[80vh] md:max-w-3xl md:rounded-fcs-lg md:shadow-fcs-4 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0 md:translate-y-2'
        }`}
      >
        {/* Input row. One bordered field: magnifier prefix, clear-X and
            microphone suffixes, 48px on phones / 56px on desktop,
            rounded-fcs-lg + shadow-fcs-2 per the Phase 1 spec. */}
        <div className="flex items-center gap-2 border-b border-fcs-border bg-fcs-bg px-4 py-3">
          <div className="flex min-h-12 w-full flex-1 items-center gap-1 rounded-fcs-lg border border-fcs-border bg-fcs-surface px-2 shadow-fcs-2 transition-[box-shadow,border-color] duration-200 focus-within:border-fcs-brand-text focus-within:ring-2 focus-within:ring-fcs-brand-text motion-reduce:transition-none md:min-h-14">
            <Search className="pointer-events-none ml-1.5 h-5 w-5 shrink-0 text-fcs-brand-text" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(query) } }}
              placeholder={t('search.overlay_placeholder')}
              aria-label={t('search.overlay_placeholder')}
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-base text-fcs-text outline-none placeholder:text-fcs-text-muted [&::-webkit-search-cancel-button]:hidden"
            />

            {/* Clear text. Only when there is something to clear; refocuses
                the field so the shopper can keep typing. */}
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                aria-label={t('common.clear')}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fcs-text-muted transition-colors hover:bg-fcs-surface-muted hover:text-fcs-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-text motion-reduce:transition-none"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}

            {/* Microphone suffix. Hidden entirely when the browser cannot do
                it — on iOS every browser is WebKit, so this covers all iOS. */}
            {voice.supported && (
              <button
                type="button"
                onClick={voice.toggle}
                aria-label={voice.listening ? t('search.voice_stop') : t('search.voice_start')}
                aria-pressed={voice.listening}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-text motion-reduce:transition-none ${
                  voice.listening
                    ? 'bg-fcs-urgent text-white'
                    : 'text-fcs-brand-text hover:bg-fcs-surface-muted'
                }`}
              >
                {voice.status === 'denied' ? <MicOff className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('search.close_search')}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-fcs-text-muted transition-colors hover:bg-fcs-surface-muted"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Voice status. aria-live so a screen reader announces listening. */}
        <div aria-live="polite" className="sr-only">
          {voice.listening ? t('search.voice_listening') : ''}
        </div>
        {voice.listening && (
          <div className="flex items-center gap-2 border-b border-fcs-border bg-fcs-surface-muted px-4 py-2">
            <span className="relative flex h-3 w-3" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fcs-urgent opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-fcs-urgent" />
            </span>
            <p className="text-sm font-semibold text-fcs-text">{t('search.voice_listening')}</p>
            <p className="text-xs text-fcs-text-muted">{t('search.voice_listening_hint')}</p>
          </div>
        )}
        {(voice.status === 'denied' || voice.status === 'error') && (
          <p role="status" className="border-b border-fcs-border bg-fcs-surface-muted px-4 py-2 text-sm text-fcs-text">
            {voice.status === 'denied' ? t('search.voice_denied') : t('search.voice_error')}
          </p>
        )}

        {/* Category chips */}
        <div className="scrollbar-hide flex gap-2 overflow-x-auto border-b border-fcs-border bg-fcs-bg px-4 py-3">
          {CATEGORY_CHIPS.map((chip) => {
            const active = category === chip.slug
            return (
              <button
                key={chip.slug || 'all'}
                type="button"
                onClick={() => setCategory(chip.slug)}
                aria-pressed={active}
                className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
                  active ? 'bg-fcs-brand-strong text-white' : 'bg-fcs-surface-muted text-fcs-text hover:bg-fcs-border-subtle'
                }`}
              >
                {label(chip.rw, chip.en)}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {showIdle && (
            <div className="space-y-6">
              {recent.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">
                      <Clock className="h-3 w-3" aria-hidden="true" />{t('search.recent')}
                    </h2>
                    <button type="button" onClick={clearRecent} className="min-h-9 px-2 text-xs font-semibold text-fcs-brand-text">
                      {t('common.clear')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.slice(0, 5).map((term) => (
                      <button key={term} type="button" onClick={() => submit(term)} className="min-h-10 rounded-full bg-fcs-surface-muted px-4 text-sm font-medium text-fcs-text">
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-fcs-text-muted">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />{t('search.trending')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_SEARCHES.map((term) => (
                    <button
                      key={term.query}
                      type="button"
                      onClick={() => submit(term.query)}
                      className="min-h-10 rounded-full border border-fcs-border-subtle bg-fcs-bg px-4 text-sm font-medium text-fcs-brand-text transition-colors hover:bg-fcs-surface-muted"
                    >
                      {label(term.rw, term.en)}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {!showIdle && loading && (
            <div className="space-y-3" aria-hidden="true">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="h-16 w-12 animate-pulse rounded-fcs-md bg-fcs-surface-secondary motion-reduce:animate-none" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-fcs-surface-secondary motion-reduce:animate-none" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-fcs-surface-secondary motion-reduce:animate-none" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!showIdle && loading && (
            <p className="mt-3 flex items-center gap-2 text-sm text-fcs-text-muted">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t('search.searching')}
            </p>
          )}

          {!showIdle && !loading && products.length > 0 && (
            <div className="space-y-1">
              {products.map((product) => {
                const image = product.imageUrl || product.image || ''
                const alt = language === 'rw' && product.imageAltRw ? product.imageAltRw : product.imageAlt || product.name
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => { saveRecent(query); onClose(); router.push(`/products/${product.slug}`) }}
                    className="flex min-h-16 w-full items-center gap-3 rounded-fcs-md p-2 text-left transition-colors hover:bg-fcs-surface-muted"
                  >
                    <span className="h-16 w-12 shrink-0 overflow-hidden rounded-fcs-sm bg-fcs-surface-secondary">
                      {image && (
                        <img
                          src={thumbnailImageUrl(image, 48, { height: 64 })}
                          alt={alt}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-sm text-fcs-text">{product.name}</span>
                      {(product.brandName || product.brand || product.categoryName) && (
                        <span className="block truncate text-xs text-fcs-text-muted">
                          {product.brandName || product.brand}
                          {product.categoryName ? `${product.brandName || product.brand ? ' · ' : ''}${product.categoryName}` : ''}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-fcs-text">{formatRWF(product.price)}</span>
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => submit(query)}
                className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-fcs-md border-t border-fcs-border text-sm font-bold text-fcs-brand-text"
              >
                {t('search.see_all_count', { count: String(total) })}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {!showIdle && !loading && searched && products.length === 0 && (
            <div className="py-6 text-center">
              <p className="font-display text-lg text-fcs-text">{t('search.no_products_found')}</p>
              {alternatives.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {alternatives.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => { setQuery(term); }}
                      className="min-h-10 rounded-full bg-fcs-surface-muted px-4 text-sm font-medium text-fcs-brand-text"
                    >
                      {t('search.did_you_mean', { term })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
