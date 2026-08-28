'use client'

/**
 * Sticky search field under the header, phones only.
 *
 * Before this the only way to search on a phone was a 44px magnifier icon in
 * the header, which gives no hint of what the site sells and puts voice search
 * two taps away. A visible field with a real placeholder is the single
 * strongest signal that this is a shop you can search.
 *
 * It is a BUTTON, not an <input>. Tapping it opens the existing SearchOverlay,
 * which owns the suggestions, recent searches, trending terms, category chips
 * and voice input. Rendering a second real input here would mean two
 * competing text fields, two pieces of query state, and a keyboard that opens
 * behind the overlay on Android. The control is styled to read as a field and
 * announced to assistive technology as what it is: a button that opens the
 * search dialog.
 *
 * The microphone is a separate button so voice is one tap from any page
 * instead of two. It only appears when the browser actually supports speech
 * recognition — the same capability check the overlay uses, never a user-agent
 * sniff. When unsupported it is not rendered at all rather than shown broken.
 */

import { useRouter } from 'next/navigation'
import { Mic, Search } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'
import { useScrollDirection } from '@/hooks/use-scroll-direction'
import { useVoiceSearch } from '@/hooks/use-voice-search'

interface MobileSearchBarProps {
  /** Opens the shared SearchOverlay. */
  onOpen: () => void
  /** Opens it with the microphone already listening. */
  onOpenVoice: () => void
}

export default function MobileSearchBar({ onOpen, onOpenVoice }: MobileSearchBarProps) {
  const t = useT()
  const router = useRouter()
  const { hidden } = useScrollDirection()
  // Capability probe only. `onResult` never fires from here because this
  // instance is never started; the overlay owns the actual recognition
  // session. Routing to /products keeps the callback honest if that ever
  // changes rather than leaving a silent no-op.
  const voice = useVoiceSearch({
    onResult: (transcript) => {
      const term = transcript.trim()
      if (term) router.push(`/products?search=${encodeURIComponent(term)}`)
    },
  })

  return (
    <div
      className={`sticky z-40 border-b border-fcs-border bg-white px-4 py-2 transition-transform duration-200 ease-fcs-snap motion-reduce:transition-none motion-reduce:translate-y-0 md:hidden ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
      // 56px: sits directly beneath the sticky header rather than under the
      // viewport top, so the two never overlap.
      style={{ top: '3.5rem' }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-12 flex-1 items-center gap-2 rounded-fcs-lg border border-fcs-border bg-fcs-surface px-3 text-left shadow-fcs-2 transition-colors hover:border-fcs-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-text motion-reduce:transition-none"
          aria-haspopup="dialog"
          aria-label={t('search.open_full_search')}
        >
          <Search className="h-5 w-5 shrink-0 text-fcs-brand-text" aria-hidden="true" />
          {/* Muted, not 50% black. A 50% tint of --fcs-text on --fcs-surface
            * computes to 3.30:1, which fails AA for the smallest text on the
            * page. --fcs-text-muted is 4.56:1 on the same background. */}
          <span className="truncate text-sm text-fcs-text-muted">
            {t('search.overlay_placeholder')}
          </span>
        </button>

        {voice.supported && (
          <button
            type="button"
            onClick={onOpenVoice}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-fcs-lg border border-fcs-border bg-fcs-surface text-fcs-brand-text transition-colors hover:border-fcs-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-text motion-reduce:transition-none"
            aria-haspopup="dialog"
            aria-label={t('search.voice_start')}
          >
            <Mic className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
