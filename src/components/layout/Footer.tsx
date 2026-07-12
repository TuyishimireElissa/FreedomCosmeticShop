'use client'

import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Truck,
  Youtube,
} from 'lucide-react'
import { useStore } from '@/store/useStore'

const shopLinks = [
  { label: 'All Products', slug: null },
  { label: 'Skincare', slug: 'skincare' },
  { label: 'Makeup', slug: 'makeup' },
  { label: 'Hair Care', slug: 'haircare' },
  { label: 'Fragrance', slug: 'fragrance' },
  { label: 'Body Care', slug: 'body-care' },
]

const trustBadges = [
  { icon: ShieldCheck, title: '100% Authentic', subtitle: 'Genuine products' },
  { icon: Truck, title: 'Fast Delivery', subtitle: 'All 30 districts' },
  { icon: Phone, title: 'MTN MoMo', subtitle: 'Simple local payment' },
  { icon: MessageCircle, title: 'Local Support', subtitle: 'Here when you need us' },
]

export default function Footer() {
  const { goHome, goCatalog, goTrackOrder, goAdmin, setView } = useStore()

  return (
    <footer className="bg-[#1a1a1a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <section>
            <button type="button" onClick={goHome} className="flex items-center gap-3 text-left" aria-label="Go to homepage">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#c98892] to-[#9e5964] text-lg font-black shadow-lg shadow-black/20">F</span>
              <span>
                <span className="block text-lg font-extrabold leading-none">FreedomCosmetic</span>
                <span className="mt-1 block text-xs font-medium text-[#d999a3]">Rwanda&apos;s Beauty Freedom 🇷🇼</span>
              </span>
            </button>
            <p className="mt-5 max-w-sm text-sm leading-6 text-gray-400">
              Rwanda&apos;s trusted online beauty store for authentic skincare, makeup and haircare, with fast delivery across all 30 districts.
            </p>
            <div className="mt-5 flex gap-2.5">
              {[
                { icon: Instagram, label: 'Instagram' },
                { icon: Facebook, label: 'Facebook' },
                { icon: Youtube, label: 'YouTube' },
              ].map(({ icon: Icon, label }) => (
                <a key={label} href="#" onClick={(event) => event.preventDefault()} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-gray-300 transition-all hover:-translate-y-0.5 hover:bg-[#B76E79] hover:text-white">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Shop</h2>
            <ul className="mt-5 space-y-3">
              {shopLinks.map((item) => (
                <li key={item.label}>
                  <button type="button" onClick={() => goCatalog(item.slug)} className="text-sm text-gray-400 transition-colors hover:text-[#e6a6b0]">
                    {item.label}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => setView('wholesale')} className="text-sm font-semibold text-[#e6a6b0] transition-colors hover:text-white">
                  Wholesale beauty
                </button>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Help</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li><button type="button" onClick={() => goTrackOrder()} className="text-gray-400 transition-colors hover:text-white">Track your order</button></li>
              <li><span className="text-gray-400">Delivery: 1–3 days in Kigali</span></li>
              <li><span className="text-gray-400">Provinces: 3–5 days</span></li>
              <li><span className="text-gray-400">Returns within 7 days</span></li>
              <li><button type="button" onClick={goAdmin} className="text-gray-400 transition-colors hover:text-white">Admin Dashboard</button></li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Contact Us</h2>
            <div className="mt-5 space-y-4">
              <a href="tel:+250780000000" className="flex items-center gap-3 text-sm text-gray-400 transition-colors hover:text-white"><Phone className="h-4 w-4 shrink-0 text-[#d999a3]" />+250 780 000 000</a>
              <a href="mailto:hello@freedomcosmeticshop.rw" className="flex items-start gap-3 break-all text-sm text-gray-400 transition-colors hover:text-white"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#d999a3]" />hello@freedomcosmeticshop.rw</a>
              <p className="flex items-center gap-3 text-sm text-gray-400"><MapPin className="h-4 w-4 shrink-0 text-[#d999a3]" />Kigali, Rwanda 🇷🇼</p>
              <a href="https://wa.me/250780000000?text=Hello%20FreedomCosmeticShop!" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#20bd5a]"><MessageCircle className="h-4 w-4" />WhatsApp Chat</a>
            </div>
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">We accept</p>
              <div className="flex flex-wrap gap-2">
                {['💛 MTN MoMo', '🔴 Airtel', '💳 Visa', '💵 COD'].map((payment) => <span key={payment} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">{payment}</span>)}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {trustBadges.map(({ icon: Icon, title, subtitle }) => (
            <div key={title} className="flex flex-col items-center px-2 py-3 text-center sm:flex-row sm:items-start sm:justify-center sm:gap-3 sm:text-left">
              <Icon className="mb-2 h-6 w-6 shrink-0 text-[#d999a3] sm:mb-0" />
              <span><span className="block text-xs font-bold sm:text-sm">{title}</span><span className="mt-0.5 block text-[10px] text-gray-500 sm:text-xs">{subtitle}</span></span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-black/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-gray-500 sm:px-6 md:flex-row md:text-left lg:px-8">
          <p>© {new Date().getFullYear()} FreedomCosmeticShop. All rights reserved.</p>
          <p>Made with ❤️ in Rwanda 🇷🇼</p>
        </div>
      </div>
    </footer>
  )
}
