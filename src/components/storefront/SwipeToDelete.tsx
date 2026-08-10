'use client'

/**
 * Swipe-to-reveal delete for cart rows.
 *
 * The row already has a visible trash IconButton; this is an additional
 * gesture, never the only way to remove an item. A swipe-only affordance
 * would be unreachable by keyboard, screen reader and desktop users.
 *
 * Behaviour chosen deliberately:
 *  - reveals a delete affordance and requires a second, explicit tap. A single
 *    swipe that deletes immediately is destructive without confirmation, and
 *    the cart is the last place to lose an item silently.
 *  - vertical-dominance check, so a finger travelling further down than across
 *    scrolls the page instead of opening the row.
 *  - Pointer Events, so touch, pen and mouse-drag share one path.
 *  - snaps shut on Escape and when another row opens is left to the caller;
 *    here Escape and a re-tap both close it.
 *  - honours prefers-reduced-motion by dropping the slide transition.
 */

import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

interface SwipeToDeleteProps {
  children: React.ReactNode
  onDelete: () => void
  /** Accessible label for the revealed delete control, e.g. "Remove: Serum". */
  deleteLabel: string
  className?: string
}

const REVEAL_PX = 88
const THRESHOLD = 45

export default function SwipeToDelete({ children, onDelete, deleteLabel, className = '' }: SwipeToDeleteProps) {
  const [open, setOpen] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)

  return (
    <div className={`relative overflow-hidden rounded-fcs-md ${className}`}>
      {/* Sits behind the row and is only reachable once revealed. */}
      <button
        type="button"
        aria-label={deleteLabel}
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={() => { setOpen(false); onDelete() }}
        className="absolute inset-y-0 right-0 grid w-[88px] place-items-center bg-fcs-urgent text-white"
      >
        <Trash2 className="h-5 w-5" aria-hidden="true" />
      </button>

      <div
        style={{ transform: open ? `translateX(-${REVEAL_PX}px)` : 'translateX(0)' }}
        className="relative transition-transform duration-200 ease-fcs-snap motion-reduce:transition-none"
        onPointerDown={(event) => { start.current = { x: event.clientX, y: event.clientY } }}
        onPointerUp={(event) => {
          const origin = start.current
          start.current = null
          if (!origin) return
          const dx = event.clientX - origin.x
          const dy = event.clientY - origin.y
          // Vertical drag is a page scroll, not a row gesture.
          if (Math.abs(dy) > Math.abs(dx)) return
          if (Math.abs(dx) < THRESHOLD) return
          setOpen(dx < 0)
        }}
        onPointerCancel={() => { start.current = null }}
        onKeyDown={(event) => { if (event.key === 'Escape' && open) setOpen(false) }}
      >
        {children}
      </div>
    </div>
  )
}
