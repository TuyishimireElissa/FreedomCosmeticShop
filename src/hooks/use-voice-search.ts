'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Voice search on the native Web Speech API. No package added.
 *
 * IOS IS THE WHOLE PROBLEM, AND IT IS BIGGER THAN THE BRIEF SAID
 *
 * The brief notes "iOS Safari does NOT support it". True, but understated:
 * on iOS *every* browser — Chrome, Firefox, Edge — is Safari's WebKit
 * underneath, because Apple forbids other engines. So the microphone must be
 * hidden for all iOS users, not just Safari users.
 *
 * Detection is therefore capability-based (`'webkitSpeechRecognition' in
 * window`), never user-agent sniffing. If the constructor is absent,
 * `supported` is false and the caller renders no microphone at all. A button
 * that silently does nothing is worse than no button.
 *
 * WHY `supported` STARTS AS false AND IS SET IN AN EFFECT
 *
 * The server has no `window`. Returning `true` during SSR and `false` after
 * hydration would flip the button out of existence on first paint and trip a
 * hydration mismatch. Starting false and upgrading in an effect means the
 * server and the first client render agree.
 *
 * PERMISSION IS NOT SUPPORT. A browser can implement the API and still have
 * the user deny the microphone. `not-allowed` and `service-not-allowed` are
 * reported as a distinct `denied` state so the UI can say "microphone
 * blocked" rather than "voice search unavailable".
 */

/** Minimal shape of the vendor-prefixed SpeechRecognition we actually use. */
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export type VoiceSearchStatus = 'idle' | 'listening' | 'denied' | 'error'

/** Silence before we treat the phrase as finished. The brief specifies 2s. */
export const VOICE_SILENCE_MS = 2000

/**
 * BCP-47 tag for the recogniser.
 *
 * There is no `rw-RW` speech model in any shipping browser — Kinyarwanda is
 * not in Chrome's supported language list. Requesting it makes the recogniser
 * either throw `language-not-supported` or silently fall back, which produces
 * garbage transcripts.
 *
 * `en-US` is used for both languages instead. It is the honest choice: the
 * catalogue is overwhelmingly English product names (Nivea, Vaseline, Veet
 * Gold, "Vitamin C"), and the search layer already transliterates Kinyarwanda
 * to English terms. A Kinyarwanda speaker saying "seramu" gets a transcript
 * near "serum", which the vocabulary then resolves. Documented so nobody
 * later "fixes" this to rw-RW and breaks it.
 */
export function recognitionLanguage(_language: string) {
  return 'en-US'
}

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export interface UseVoiceSearchOptions {
  /** Called with the final transcript once the speaker stops. */
  onResult: (transcript: string) => void
  /** UI language; only used to pick the recogniser locale. */
  language?: string
}

export function useVoiceSearch({ onResult, language = 'en' }: UseVoiceSearchOptions) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<VoiceSearchStatus>('idle')
  const [transcript, setTranscript] = useState('')

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const silenceTimerRef = useRef<number | null>(null)
  const finalTranscriptRef = useRef('')
  // Held in a ref so restarting recognition never rebinds a stale callback.
  // Assigned in an effect rather than during render: writing to a ref while
  // rendering is a React violation (react-hooks/refs) and misbehaves under
  // StrictMode double-invocation.
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    setSupported(getRecognitionConstructor() !== null)
  }, [])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearSilenceTimer()
    try {
      recognitionRef.current?.stop()
    } catch {
      // stop() throws if recognition was never started. Not an error.
    }
    setStatus('idle')
  }, [clearSilenceTimer])

  // Release the microphone if the component unmounts mid-listen, otherwise
  // the browser keeps the recording indicator lit.
  useEffect(() => () => {
    clearSilenceTimer()
    try {
      recognitionRef.current?.abort()
    } catch {
      /* nothing was running */
    }
  }, [clearSilenceTimer])

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor()
    if (!Recognition) {
      setSupported(false)
      return
    }

    // Starting twice throws InvalidStateError.
    try {
      recognitionRef.current?.abort()
    } catch {
      /* nothing was running */
    }

    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.lang = recognitionLanguage(language)
    recognition.continuous = false
    // Interim results are what make the field feel live, and they are also
    // what reset the silence timer — without them a slow speaker gets cut off.
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    finalTranscriptRef.current = ''
    setTranscript('')

    recognition.onstart = () => setStatus('listening')

    recognition.onresult = (event) => {
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result?.[0]?.transcript ?? ''
        if (result?.isFinal) finalTranscriptRef.current += text
        else interim += text
      }
      const combined = `${finalTranscriptRef.current}${interim}`.trim()
      setTranscript(combined)

      // Auto-submit after the brief's 2 seconds of silence, restarted on
      // every fragment so a pause mid-sentence does not submit early.
      clearSilenceTimer()
      if (combined) {
        silenceTimerRef.current = window.setTimeout(() => {
          stop()
          onResultRef.current(combined)
        }, VOICE_SILENCE_MS)
      }
    }

    recognition.onerror = (event) => {
      clearSilenceTimer()
      const code = event?.error
      // A user who says nothing is not an error worth shouting about.
      if (code === 'aborted' || code === 'no-speech') {
        setStatus('idle')
        return
      }
      setStatus(code === 'not-allowed' || code === 'service-not-allowed' ? 'denied' : 'error')
    }

    recognition.onend = () => {
      clearSilenceTimer()
      // Only fall back to idle from an active listen; never overwrite a
      // denied/error state that onerror just set.
      setStatus((current) => (current === 'listening' ? 'idle' : current))
    }

    try {
      recognition.start()
      setStatus('listening')
    } catch {
      setStatus('error')
    }
  }, [clearSilenceTimer, language, stop])

  const toggle = useCallback(() => {
    if (status === 'listening') stop()
    else start()
  }, [start, status, stop])

  return { supported, status, transcript, start, stop, toggle, listening: status === 'listening' }
}
