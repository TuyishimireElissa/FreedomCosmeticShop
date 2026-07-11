import Link from 'next/link'
import {
  Instagram, Facebook, Youtube,
  Mail, Phone, MapPin,
  MessageCircle
} from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-white">
      
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#B76E79] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  F
                </span>
              </div>
              <div>
                <p className="font-bold text-lg leading-none">
                  FreedomCosmetic
                </p>
                <p className="text-xs text-[#B76E79] leading-none">
                  Rwanda's Beauty Freedom
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Rwanda's #1 online beauty store. 
              100% authentic products. 
              Fast delivery across all 30 districts.
              Pay with MTN MoMo.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {[
                { icon: Instagram, href: '#', label: 'Instagram' },
                { icon: Facebook, href: '#', label: 'Facebook' },
                { icon: Youtube, href: '#', label: 'YouTube' },
              ].map(({ icon: Icon, href, label }) => (
                <a key={label} href={href}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#B76E79] transition-colors">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-bold text-base mb-4">
              Shop
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'All Products', href: '/products' },
                { label: 'Skincare', href: '/products?category=skincare' },
                { label: 'Makeup', href: '/products?category=makeup' },
                { label: 'Hair Care', href: '/products?category=hair-care' },
                { label: 'Fragrance', href: '/products?category=fragrance' },
                { label: 'Body Care', href: '/products?category=body-care' },
                { label: 'Wholesale (30% Off)', href: '/wholesale' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href}
                    className="text-gray-400 text-sm hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-bold text-base mb-4">
              Help
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Contact Us', href: '/contact' },
                { label: 'Track Order', href: '/account/orders' },
                { label: 'FAQ', href: '/faq' },
                { label: 'Returns Policy', href: '/returns' },
                { label: 'Shipping: Kigali 1000 RWF', href: '/shipping' },
                { label: 'North/South 3000 RWF', href: '/shipping' },
                { label: 'East 3500 RWF, West 4000 RWF', href: '/shipping' },
                { label: 'Free >50,000 RWF', href: '/shipping' },
              ].map(item => (
                <li key={item.label}>
                  <Link href={item.href}
                    className="text-gray-400 text-sm hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-base mb-4">
              Contact Us
            </h3>
            <div className="space-y-3">
              <a href="tel:+250780000000"
                className="flex items-center gap-3 text-gray-400 text-sm hover:text-white">
                <Phone size={16} className="text-[#B76E79]" />
                +250 780 000 000
              </a>
              <a href="mailto:hello@freedomcosmeticshop.rw"
                className="flex items-center gap-3 text-gray-400 text-sm hover:text-white">
                <Mail size={16} className="text-[#B76E79]" />
                hello@freedomcosmeticshop.rw
              </a>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <MapPin size={16} className="text-[#B76E79]" />
                Kigali, Rwanda 🇷🇼
              </div>
              <a
                href="https://wa.me/250780000000?text=Hello FreedomCosmeticShop!"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-green-700 transition-colors mt-2 w-fit">
                <MessageCircle size={16} />
                WhatsApp Chat
              </a>
            </div>

            {/* Payment Icons */}
            <div className="mt-6">
              <p className="text-xs text-gray-500 mb-2">
                We Accept:
              </p>
              <div className="flex flex-wrap gap-2">
                {['💛 MTN MoMo', '🔴 Airtel', '💳 Visa', '💵 COD'].map(p => (
                  <span key={p}
                    className="bg-white/10 text-xs px-2 py-1 rounded text-gray-300">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { icon: '✅', title: '100% Authentic', sub: 'Genuine products' },
              { icon: '🚚', title: 'Fast Delivery', sub: '1-3 days Kigali, 3-5 provinces' },
              { icon: '💛', title: 'MTN MoMo', sub: 'Primary - Easy payment' },
              { icon: '🔄', title: 'Easy Returns', sub: '30-day policy' },
            ].map(badge => (
              <div key={badge.title} className="flex flex-col items-center">
                <span className="text-2xl mb-1">{badge.icon}</span>
                <p className="text-sm font-medium">{badge.title}</p>
                <p className="text-xs text-gray-400">{badge.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <p>
              © 2024 FreedomCosmeticShop. All rights reserved. RWF only. 30 districts.
            </p>
            <p className="flex items-center gap-1">
              Made with ❤️ in Rwanda 🇷🇼 | Cloudinary dohoc0tmp | Supabase hsdqahltrqjeaskhheis
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
