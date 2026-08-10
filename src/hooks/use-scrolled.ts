'use client'

/**
 * True once the page has scrolled past `threshold` pixels.
 *
 * Used by the header to go from flat to elevated. Kept as a hook rather than
 * inline state because the same signal is wanted by more than one chrome
 * element, and because it needs care that is easy to get wrong inline:
 *
 *  - `passive: true` so scrolling is never blocked on the listener
 *  - rAF-throttled, so a fast scroll schedules one state update per frame
 *    instead of one per event
 *  - reads once on mount, so a page restored mid-scroll (back navigation,
 *    or a reload at offset) renders in the correct state instead of
 *    flashing flat
 */

import { useEffect, useState } from 'react'

export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let frame = 0
    const read = () => {
      frame = 0
      setScrolled(window.scrollY > threshold)
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

  return scrolled
}
