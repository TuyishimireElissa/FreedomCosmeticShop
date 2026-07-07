"use client"

/**
 * PaymentBar — payment methods bar below the header.
 *
 * Shows: MTN MoMo, Airtel, Card, COD with "We accept all Rwanda payments" text.
 * Background: Light gold (#FFF8E7)
 *
 * This sits BELOW the header (between header and page content).
 */

export function PaymentBar() {
  return (
    <div
      className="flex items-center justify-center gap-4 border-b px-4 py-1.5 text-xs sm:text-sm"
      style={{ backgroundColor: "#FFF8E7" }}
    >
      <span className="flex items-center gap-1 font-medium">
        💛 MTN MoMo
      </span>
      <span className="hidden text-muted-foreground sm:inline">·</span>
      <span className="flex items-center gap-1 font-medium">
        🔴 Airtel
      </span>
      <span className="hidden text-muted-foreground sm:inline">·</span>
      <span className="flex items-center gap-1 font-medium">
        💳 Card
      </span>
      <span className="hidden text-muted-foreground sm:inline">·</span>
      <span className="flex items-center gap-1 font-medium">
        💵 COD
      </span>
      <span className="hidden text-muted-foreground sm:ml-2 sm:inline">
        We accept all Rwanda payments
      </span>
    </div>
  )
}
