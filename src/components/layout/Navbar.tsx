'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import {
  Search, ShoppingCart, Heart, Menu,
  X, User, ChevronDown,
  Phone
} from 'lucide-react'
import { useCart } from '@/hooks/useCart'

const categories = [
  { name: 'Skincare', slug: 'skincare', icon: '🧴' },
  { name: 'Makeup', slug: 'makeup', icon: '💄' },
  { name: 'Hair Care', slug: 'hair-care', icon: '💇' },
  { name: 'Fragrance', slug: 'fragrance', icon: '🌸' },
  { name: 'Body Care', slug: 'body-care', icon: '🧼' },
  { name: "Men's", slug: 'mens-grooming', icon: '🧔' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: session } = useSession()
  const { cartCount } = useCart()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="bg-[#fff8e7] py-1.5 px-4 border-b border-yellow-100">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 text-xs text-gray-600 overflow-x-auto scrollbar-hide">
          <span className="flex items-center gap-1 whitespace-nowrap"><span>💛</span> MTN MoMo</span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span>🔴</span> Airtel Money</span>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <span className="flex items-center gap-1 whitespace-nowrap hidden sm:flex"><span>💳</span> Visa/Card</span>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <span className="flex items-center gap-1 whitespace-nowrap hidden sm:flex"><span>💵</span> Cash on Delivery</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-[#B76E79] rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <div className="hidden sm:block">
            <p className="font-bold text-base text-[#1a1a1a] leading-none">FreedomCosmetic</p>
            <p className="text-xs text-[#B76E79] leading-none">Rwanda's Beauty Freedom 🇷🇼</p>
          </div>
        </Link>

        <div className="hidden md:flex flex-1 max-w-xl mx-4 relative">
          <input
            type="text"
            placeholder="Search skincare, makeup, haircare..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-12 py-2.5 border-2 border-gray-200 rounded-full text-sm focus:border-[#B76E79] focus:outline-none transition-colors"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#B76E79] rounded-full flex items-center justify-center text-white hover:bg-[#a55d68]">
            <Search size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => setSearchOpen(!searchOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-full">
            <Search size={20} />
          </button>
          <a href="https://wa.me/250780000000" target="_blank" rel="noreferrer" className="hidden lg:flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 px-2 py-1 rounded-full hover:bg-green-50 transition-colors">
            <Phone size={14} />
            <span>Help</span>
          </a>
          <Link href="/account/wishlist" className="p-2 hover:bg-gray-100 rounded-full relative hidden sm:flex">
            <Heart size={20} />
          </Link>
          <Link href="/cart" className="p-2 hover:bg-gray-100 rounded-full relative">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#B76E79] text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
          {session ? (
            <div className="relative group">
              <button className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded-full">
                <User size={20} />
                <ChevronDown size={14} className="hidden sm:block" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg p-1 hidden group-hover:block z-50">
                <Link href="/account" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg">My Account</Link>
                <Link href="/account/orders" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg">My Orders</Link>
                {(session.user as any)?.role === 'ADMIN' && (
                  <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg text-[#B76E79]">Admin Panel</Link>
                )}
                <hr className="my-1" />
                <button onClick={() => signOut()} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-lg w-full text-left text-red-600">Sign Out</button>
              </div>
            </div>
          ) : (
            <Link href="/login" className="hidden sm:flex items-center gap-1 bg-[#B76E79] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#a55d68] transition-colors">Login</Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-full">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div className="hidden md:block border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
            <Link href="/products" className="py-3 text-sm font-medium text-gray-600 hover:text-[#B76E79] whitespace-nowrap border-b-2 border-transparent hover:border-[#B76E79] transition-all">All Products</Link>
            {categories.map(cat => (
              <Link key={cat.slug} href={`/products?category=${cat.slug}`} className="py-3 text-sm font-medium text-gray-600 hover:text-[#B76E79] whitespace-nowrap border-b-2 border-transparent hover:border-[#B76E79] transition-all flex items-center gap-1">
                <span>{cat.icon}</span>{cat.name}
              </Link>
            ))}
            <Link href="/wholesale" className="py-3 text-sm font-medium text-[#B76E79] hover:text-[#a55d68] whitespace-nowrap border-b-2 border-transparent hover:border-[#B76E79] transition-all ml-auto">🏪 Wholesale</Link>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="md:hidden px-4 py-3 border-t border-gray-100">
          <div className="relative">
            <input type="text" placeholder="Search products..." className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-full text-sm focus:border-[#B76E79] focus:outline-none" autoFocus />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white pb-4 max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2 mt-2">Categories</p>
            {categories.map(cat => (
              <Link key={cat.slug} href={`/products?category=${cat.slug}`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-3 border-b border-gray-50 text-gray-700 hover:text-[#B76E79]">
                <span className="text-xl">{cat.icon}</span><span className="font-medium">{cat.name}</span>
              </Link>
            ))}
            <Link href="/products" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-3 border-b border-gray-50 text-gray-700 hover:text-[#B76E79]"><span className="text-xl">🛍️</span><span className="font-medium">All Products</span></Link>
            <Link href="/wholesale" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-3 border-b border-gray-50 text-[#B76E79]"><span className="text-xl">🏪</span><span className="font-medium">Wholesale - Up to 30% Off</span></Link>
            <div className="mt-4 space-y-2">
              {!session ? (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="block w-full text-center bg-[#B76E79] text-white py-3 rounded-full font-medium">Login</Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="block w-full text-center border-2 border-[#B76E79] text-[#B76E79] py-3 rounded-full font-medium">Register</Link>
                </>
              ) : (
                <button onClick={() => signOut()} className="block w-full text-center border-2 border-red-200 text-red-600 py-3 rounded-full font-medium">Sign Out</button>
              )}
              <a href="https://wa.me/250780000000" target="_blank" className="block w-full text-center bg-green-600 text-white py-3 rounded-full font-medium">💬 WhatsApp Help</a>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
              <p>📍 Kigali, Rwanda • 📞 +250780000000</p>
              <p className="mt-1">💛 MTN MoMo • 🔴 Airtel • 💳 Card • 💵 COD</p>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
