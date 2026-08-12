'use client'

/**
 * Reveal an element the first time it scrolls into view.
 *
 * Adds `.is-revealed` to the ref'd node, which pairs with the `.fcs-reveal`
 * class in globals.css to fade and lift it into place.
 *
 * Deliberately small and dependency-free:
 *
 *  - Observes once, then disconnects. Re-animating on every scroll past is
 *    distracting and costs work on a cheap phone.
 *  - `rootMargin: '0px 0px -10%'` so a card fires slightly before its top edge
 *    lands, which reads as "already there" rather than "popped in late".
 *  - Bails out entirely when the user prefers reduced motion, or when
 *    IntersectionObserver is missing, marking the node revealed immediately.
 *    The hidden state is itself behind a `no-preference` media query, so those
 *    users never see a blank element either way — belt and braces, because a
 *    permanently invisible homepage is a far worse failure than a missing
 *    animation.
 */

import { useEffect, useRef } from 'react'

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-revealed')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10%', threshold: 0.05 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return ref
}

export default useReveal
