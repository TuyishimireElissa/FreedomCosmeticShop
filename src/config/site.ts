/**
 * Site-wide configuration for FreedomCosmeticShop.
 *
 * This is the single source of truth for brand info, contact details,
 * navigation structure, and social links. Import from here instead of
 * hard-coding strings across the app.
 *
 * Usage:
 *   import { siteConfig } from "@/config/site"
 *   console.log(siteConfig.name) // "FreedomCosmeticShop"
 */

export const siteConfig = {
  name: "FreedomCosmeticShop",
  shortName: "Freedom Cosmetic",
  tagline: "Rwanda's Beauty Freedom 🇷🇼",
  description:
    "Shop authentic skincare, makeup & haircare products in Rwanda. Pay with MTN MoMo or cash on delivery. Fast delivery in Kigali and across all provinces.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Contact information
  contact: {
    phone: "+250788123456",
    phoneDisplay: "+250 788 123 456",
    whatsapp: "+250788123456",
    email: "hello@freedomcosmeticshop.rw",
    address: {
      street: "KN 4 Ave, Kigali Heights",
      city: "Kigali",
      province: "Kigali City",
      country: "Rwanda",
    },
  },

  // Social media
  social: {
    instagram: "https://instagram.com/freedomcosmeticshop",
    facebook: "https://facebook.com/freedomcosmeticshop",
    twitter: "https://twitter.com/freedomcosmeticrw",
    tiktok: "https://tiktok.com/@freedomcosmeticshop",
  },

  // Primary navigation
  nav: [
    { label: "Skincare", href: "catalog", params: { category: "skincare" } },
    { label: "Makeup", href: "catalog", params: { category: "makeup" } },
    { label: "Haircare", href: "catalog", params: { category: "haircare" } },
    { label: "All products", href: "catalog", params: {} },
  ] as const,

  // Footer link sections
  footerLinks: {
    shop: [
      { label: "Skincare", slug: "skincare" },
      { label: "Makeup", slug: "makeup" },
      { label: "Haircare", slug: "haircare" },
      { label: "All products", slug: null },
    ],
    help: [
      { label: "Delivery info", href: "#" },
      { label: "Returns policy", href: "#" },
      { label: "Track order", href: "#" },
      { label: "Contact us", href: "#" },
    ],
    about: [
      { label: "Our story", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Privacy policy", href: "#" },
    ],
  },

  // Locale / market
  locale: {
    default: "en",
    supported: ["en"] as const, // Add "fr", "rw" when enabling i18n
    currency: "RWF",
    currencySymbol: "RWF",
    country: "Rwanda",
    timezone: "Africa/Kigali",
  },

  // Business hours (used for delivery estimates & support)
  businessHours: {
    weekdays: "9:00 - 18:00",
    saturday: "10:00 - 16:00",
    sunday: "Closed",
  },
} as const

export type SiteConfig = typeof siteConfig
