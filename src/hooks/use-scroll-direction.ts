'use client'

/**
 * Which way the page is scrolling, for chrome that hides on the way down and
 * comes back on the way up.
 *
 * Separate from `useScrolled`, which answers a different question ("are we
 * past 8px?") and is used by the header to swap its shadow. Combining them
 * would give one hook two unrelated return values and force every consumer to
 * re-render on both signals.
 *
 * Design decisions that are easy to get wrong:
 *
 *  - `passive: true`, so the listener can never block scrolling. On a 3G
 *    Android phone a blocking scroll handler is felt immediately.
 *  - rAF-throttled: a fast flick fires dozens of scroll events per frame, and
 *    without this each one would queue a state update.
 *  - Hysteresis, not a raw comparison. Comparing `y > lastY` flips direction
 *    on the 1px jitter that a finger resting on the glass produces, so the bar
 *    would strobe. Direction only changes after DIRECTION_DELTA px of travel
 *    the same way.
 *  - Nothing hides near the top of the page. Above REVEAL_ABOVE the bar is
 *    always shown, so a short page or a small overscroll can never leave the
 *    search field hidden with no way to bring it back.
 *  - Reduced motion is respected by the consumer, not here: this hook reports
 *    a fact about the page. Hiding the bar is a movement, so a user who asked
 *    for no motion should simply always see it.
 */

import { useEffect, useState } from 'react'

/** Travel required before a direction flip is believed. */
export const DIRECTION_DELTA = 8
/** Below this offset the chrome is always visible. Matches the brief's 100px. */
export const REVEAL_ABOVE = 100

export type ScrollDirection = 'up' | 'down'

export interface ScrollDirectionState {
  direction: ScrollDirection
  /** True when the page is far enough down that hiding is allowed. */
  past: boolean
  /** Convenience: what the consumer almost always wants. */
  hidden: boolean
}

export function useScrollDirection(threshold = REVEAL_ABOVE): ScrollDirectionState {
  const [state, setState] = useState<ScrollDirectionState>({
    direction: 'up',
    past: false,
    hidden: false,
  })

  useEffect(() => {
    // Read synchronously so a page restored mid-scroll (back navigation, or a
    // reload at offset) starts in the right state instead of flashing.
    let lastY = window.scrollY
    let lastDirection: ScrollDirection = 'up'
    let frame = 0

    const read = () => {
      frame = 0
      const y = Math.max(0, window.scrollY)
      const travelled = y - lastY

      if (Math.abs(travelled) >= DIRECTION_DELTA) {
        lastDirection = travelled > 0 ? 'down' : 'up'
        lastY = y
      }

      const past = y > threshold
      setState((previous) => {
        const next: ScrollDirectionState = {
          direction: lastDirection,
          past,
          hidden: past && lastDirection === 'down',
        }
        // Bail out when nothing changed, so a long scroll in one direction
        // does not re-render the consumer on every frame.
        if (
          previous.direction === next.direction
          && previous.past === next.past
          && previous.hidden === next.hidden
        ) {
          return previous
        }
        return next
      })
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [threshold])

  return state
}
