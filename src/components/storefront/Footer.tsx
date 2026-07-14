"use client"

/**
 * Footer for FreedomCosmeticShop.
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
import { useT } from "@/lib/i18n/LanguageContext"
import { Sparkles, Phone, Mail, MapPin, Instagram, Facebook, MessageCircle, ShieldCheck, Truck, Smartphone, Lock } from "lucide-react"

export function Footer() {
  const t = useT()
  const { goCatalog, goHome, goAdmin } = useStore()

  return (
    <footer className="bg-secondary/40 border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <button onClick={goHome} className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground grid h-8 w-8 place-items-center rounded-full">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-base font-semibold">
                FreedomCosmeticShop
              </span>
            </button>
            <p className="text-muted-foreground text-sm">
              Rwanda&apos;s home for skincare, makeup &amp; haircare. Authentic products, fair
              prices, fast delivery across all provinces.
            </p>
            <div className="flex gap-2 pt-1">
              <a
                href="#"
                className="bg-background text-foreground/70 hover:bg-primary hover:text-primary-foreground grid h-8 w-8 place-items-center rounded-full transition-colors"
                aria-label="Instagram"
                onClick={(e) => e.preventDefault()}
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="bg-background text-foreground/70 hover:bg-primary hover:text-primary-foreground grid h-8 w-8 place-items-center rounded-full transition-colors"
                aria-label="Facebook"
                onClick={(e) => e.preventDefault()}
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="bg-background text-foreground/70 hover:bg-primary hover:text-primary-foreground grid h-8 w-8 place-items-center rounded-full transition-colors"
                aria-label="WhatsApp"
                onClick={(e) => e.preventDefault()}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div className="space-y-3">
            <h3 className="text-foreground/70 text-sm font-semibold tracking-wider uppercase">
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
                  {t('categories.all')}
                </button>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div className="space-y-3">
            <h3 className="text-foreground/70 text-sm font-semibold tracking-wider uppercase">
              Help
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-muted-foreground">
                  {t('footer.delivery_kigali')}; {t('footer.delivery_provinces')}
                </span>
              </li>
              <li>
                <button
                  onClick={() => useStore.getState().goTrackOrder()}
                  className="text-muted-foreground hover:text-primary"
                >
                  {t('footer.track_order')}
                </button>
              </li>
              <li>
                <span className="text-muted-foreground">{t('footer.returns_days', { days: 7 })}</span>
              </li>
              <li>
                <button onClick={goAdmin} className="text-muted-foreground hover:text-primary">
                  Admin Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-foreground/70 text-sm font-semibold tracking-wider uppercase">
              {t('footer.contact')}
            </h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <span>KN 4 Ave, Kigali Heights, Kigali, Rwanda</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="text-primary h-4 w-4 shrink-0" />
                <a href="tel:+250788123456" className="hover:text-primary">
                  +250 788 123 456
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="text-primary h-4 w-4 shrink-0" />
                <a href="mailto:hello@freedomcosmeticshop.rw" className="hover:text-primary">
                  hello@freedomcosmeticshop.rw
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust badges row — NEW */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <p className="text-xs font-semibold">100% Genuine</p>
            <p className="text-[10px] text-muted-foreground">{t('footer.genuine_products')}</p>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Truck className="h-6 w-6 text-primary" />
            <p className="text-xs font-semibold">{t('footer.fast_delivery')}</p>
            <p className="text-[10px] text-muted-foreground">{t('footer.all_districts')}</p>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Smartphone className="h-6 w-6 text-primary" />
            <p className="text-xs font-semibold">MTN MoMo</p>
            <p className="text-[10px] text-muted-foreground">{t('footer.mobile_money_accepted')}</p>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Lock className="h-6 w-6 text-primary" />
            <p className="text-xs font-semibold">{t('footer.safe_pay')}</p>
            <p className="text-[10px] text-muted-foreground">{t('footer.secured_by', { provider: 'PayPack' })}</p>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-8 flex flex-col items-start gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {t('footer.we_accept')}:
            </span>
            <span className="bg-background text-foreground rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm">
              {t('checkout.mtn_momo')}
            </span>
            <span className="bg-background text-foreground rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm">
              {t('checkout.airtel_money')}
            </span>
            <span className="bg-background text-foreground rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm">
              Visa
            </span>
            <span className="bg-background text-foreground rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm">
              Mastercard
            </span>
            <span className="bg-background text-foreground rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm">
              {t('checkout.cod')}
            </span>
          </div>
        </div>

        {/* Bottom */}
        <div className="text-muted-foreground mt-6 border-t pt-6 text-center text-xs sm:flex sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} FreedomCosmeticShop. {t('footer.all_rights_reserved')} {t('footer.made_in_rwanda')}</p>
          <p className="mt-2 sm:mt-0">FreedomCosmeticShop — {t('footer.description')}</p>
        </div>
      </div>
    </footer>
  )
}
