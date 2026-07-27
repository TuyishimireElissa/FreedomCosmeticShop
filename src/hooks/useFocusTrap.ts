'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function isAvailable(element: HTMLElement) {
  return !element.hidden
    && element.getAttribute('aria-hidden') !== 'true'
    && !element.closest('[inert]')
    && element.getClientRects().length > 0
}

/**
 * Focus containment for custom modal surfaces.
 * Radix Dialog, AlertDialog, Sheet, and Drawer already manage focus and must
 * keep using their built-in behavior rather than stacking a second trap.
 */
export function useFocusTrap<T extends HTMLElement>(
  isActive = true,
  onEscape?: () => void,
) {
  const containerRef = useRef<T>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!isActive || !container) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    const getFocusable = () => Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(isAvailable)

    const initialFocus = getFocusable()[0] || container
    if (!container.hasAttribute('tabindex') && initialFocus === container) {
      container.setAttribute('tabindex', '-1')
    }
    initialFocus.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onEscape?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isActive, onEscape])

  return containerRef
}
