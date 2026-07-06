"use client"

/**
 * SpecialOffers — promotional banner section between product sections.
 *
 * Features:
 *   - Eye-catching gradient background
 *   - Coupon code display with copy-to-clipboard
 *   - CTA button
 *   - Decorative shapes
 *   - Mobile-optimized layout
 */

import { useState } from "react"
import { useStore } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import { Tag, Copy, Check, ArrowRight, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SpecialOffersProps {
  /** Coupon code to display (e.g., "WEEKEND15") */
  code?: string
  /** Description of the offer */
  description?: string
  /** Discount percentage or amount */
  discount?: string
}

export function SpecialOffers({
  code = "WELCOME10",
  description = "10% off your first order. Pay with MTN MoMo or cash on delivery.",
  discount = "10% OFF",
}: SpecialOffersProps) {
  const { goCatalog } = useStore()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast({
        title: "Code copied!",
        description: `${code} is ready to paste at checkout.`,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Copy failed",
        description: `Write down the code: ${code}`,
        variant: "destructive",
      })
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 px-6 py-10 text-primary-foreground shadow-lg sm:px-12 sm:py-14">
        {/* Decorative shapes */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-primary-foreground/10" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-primary-foreground/5" />

        <div className="relative z-10 grid items-center gap-6 sm:grid-cols-2">
          {/* Left: Offer text */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Special offer
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {discount}
            </h2>
            <p className="mt-2 text-primary-foreground/85">{description}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => goCatalog(null)}
              >
                Shop now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Coupon code */}
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-primary-foreground/40 bg-primary-foreground/10 px-4 py-2 font-mono text-sm font-bold backdrop-blur transition-colors hover:bg-primary-foreground/20"
                aria-label={`Copy coupon code ${code}`}
              >
                <Tag className="h-4 w-4" />
                {code}
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                  <Copy className="h-4 w-4 opacity-70" />
                )}
              </button>
            </div>
          </div>

          {/* Right: Trust badges */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">📱</p>
              <p className="mt-1 text-sm font-semibold">MTN MoMo</p>
              <p className="text-xs text-primary-foreground/70">Pay instantly</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">💵</p>
              <p className="mt-1 text-sm font-semibold">Cash on Delivery</p>
              <p className="text-xs text-primary-foreground/70">Pay when you get it</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">🚚</p>
              <p className="mt-1 text-sm font-semibold">Fast Delivery</p>
              <p className="text-xs text-primary-foreground/70">1-5 days nationwide</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">✨</p>
              <p className="mt-1 text-sm font-semibold">100% Authentic</p>
              <p className="text-xs text-primary-foreground/70">Genuine products</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
