"use client"

/**
 * Footer for Ubumwe Beauty.
 *
 * Sticky-footer pattern: this component itself doesn't need mt-auto
 * because the page wrapper applies it. But it has padding so that
 * content doesn't feel cramped at the bottom.
 *
 * Sections:
 *  - Brand blurb
 *  - Quick links (categories, admin)
 *  - Contact info (Kigali address, phone, email)
 *  - Payment methods (MoMo / COD / Cards badges)
 *  - Bottom row: copyright + tagline
 */

import { useStore } from "@/store/useStore"
import { Sparkles, Phone, Mail, MapPin, Instagram, Facebook, MessageCircle } from "lucide-react"

export function Footer() {
  const { goCatalog, goHome, goAdmin } = useStore()

  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <button
              onClick={goHome}
              className="flex items-center gap-2"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-base font-semibold">
                Ubumwe <span className="text-primary">Beauty</span>
              </span>
            </button>
            <p className="text-sm text-muted-foreground">
              Rwanda&apos;s home for skincare, makeup &amp; haircare. Authentic
              products, fair prices, fast delivery across all provinces.
            </p>
            <div className="flex gap-2 pt-1">
              <a
                href="#"
                className="grid h-8 w-8 place-items-center rounded-full bg-background text-foreground/70 hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
                onClick={(e) => e.preventDefault()}
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="grid h-8 w-8 place-items-center rounded-full bg-background text-foreground/70 hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
                onClick={(e) => e.preventDefault()}
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="grid h-8 w-8 place-items-center rounded-full bg-background text-foreground/70 hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="WhatsApp"
                onClick={(e) => e.preventDefault()}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
              Shop
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => goCatalog("skincare")}
                  className="text-muted-foreground hover:text-primary"
                >
                  Skincare
                </button>
              </li>
              <li>
                <button
                  onClick={() => goCatalog("makeup")}
                  className="text-muted-foreground hover:text-primary"
                >
                  Makeup
                </button>
              </li>
              <li>
                <button
                  onClick={() => goCatalog("haircare")}
                  className="text-muted-foreground hover:text-primary"
                >
                  Haircare
                </button>
              </li>
              <li>
                <button
                  onClick={() => goCatalog(null)}
                  className="text-muted-foreground hover:text-primary"
                >
                  All products
                </button>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
              Help
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-muted-foreground">Delivery: 1-3 days Kigali, 3-5 days provinces</span>
              </li>
              <li>
                <span className="text-muted-foreground">Returns within 7 days</span>
              </li>
              <li>
                <button
                  onClick={goAdmin}
                  className="text-muted-foreground hover:text-primary"
                >
                  Admin Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
              Contact
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>KN 4 Ave, Kigali Heights, Kigali, Rwanda</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+250788123456" className="hover:text-primary">
                  +250 788 123 456
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:hello@ubumwe.beauty" className="hover:text-primary">
                  hello@ubumwe.beauty
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-8 flex flex-col items-start gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              We accept:
            </span>
            <span className="rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
              MTN MoMo
            </span>
            <span className="rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
              Airtel Money
            </span>
            <span className="rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
              Visa
            </span>
            <span className="rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
              Mastercard
            </span>
            <span className="rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
              Cash on Delivery
            </span>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 border-t pt-6 text-center text-xs text-muted-foreground sm:flex sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Ubumwe Beauty. Made with love in Kigali, Rwanda.</p>
          <p className="mt-2 sm:mt-0">Ubumwe — beauty that unites us.</p>
        </div>
      </div>
    </footer>
  )
}
