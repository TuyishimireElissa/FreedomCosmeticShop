"use client"

/**
 * WhatsAppButton — floating WhatsApp contact button.
 *
 * Features:
 *   - Fixed position (bottom-right)
 *   - Pulse animation to attract attention
 *   - Tooltip on hover
 *   - Opens WhatsApp with pre-filled message
 *   - Hidden on auth pages (login/register) for cleaner UX
 *   - Accessible (ARIA label)
 */

import { useEffect, useState } from "react"
import { MessageCircle, X } from "lucide-react"

interface WhatsAppButtonProps {
  /** Phone number in international format (no +) */
  phone?: string
  /** Pre-filled message */
  message?: string
}

export function WhatsAppButton({
  phone = "250788123456",
  message = "Hello Ubumwe Beauty! I have a question about your products.",
}: WhatsAppButtonProps) {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Show after 3 seconds (don't distract on initial load)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Note: This component is only rendered when view !== "login" and view !== "register"
  // (controlled by page.tsx), so no need to check pathname here.

  const handleClick = () => {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {/* Tooltip / expand card */}
      {expanded && (
        <div className="mb-2 max-w-xs rounded-2xl border bg-card p-4 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Chat with us</p>
                <p className="text-xs text-muted-foreground">Usually replies in minutes</p>
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Close chat tooltip"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-sm text-foreground/80">
            Have a question about products, delivery, or payments? Send us a WhatsApp message!
          </p>
          <button
            onClick={handleClick}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            <MessageCircle className="h-4 w-4" />
            Start chat
          </button>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-emerald-600"
        aria-label="Contact us on WhatsApp"
      >
        {/* Pulse animation */}
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-30" />

        {/* Icon */}
        {expanded ? (
          <X className="relative h-6 w-6" />
        ) : (
          <svg
            className="relative h-7 w-7"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        )}

        {/* Notification dot */}
        {!expanded && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            1
          </span>
        )}
      </button>
    </div>
  )
}
