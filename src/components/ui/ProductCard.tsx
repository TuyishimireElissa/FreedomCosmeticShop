'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatRWF } from '@/lib/utils'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number
  images: string[]
  avgRating: number
  reviewCount: number
  isBestSeller?: boolean
  isNewArrival?: boolean
  isFeatured?: boolean
  stockQuantity: number
  brand?: { name: string }
}

export default function ProductCard({ product }: { product: Product }) {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : 0

  const handleAddToCart = async () => {
    setAddingToCart(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      })
      if (res.ok) {
        toast.success(`Added to cart! ${formatRWF(product.price)}`)
      } else {
        toast.error('Please login to add to cart')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setAddingToCart(false)
    }
  }

  const outOfStock = product.stockQuantity === 0

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_4px_18px_rgba(26,26,26,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-rose-100 hover:shadow-[0_14px_32px_rgba(183,110,121,0.14)]">
      <div className="relative aspect-square overflow-hidden bg-[#f8f9fa]">
        <Link href={`/products/${product.slug}`} className="block h-full" aria-label={`View ${product.name}`}>
          <Image
            src={product.images[0] || 'https://via.placeholder.com/400x400?text=Product'}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${outOfStock ? 'opacity-60 grayscale-[20%]' : ''}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </Link>

        <div className="absolute left-2 top-2 flex max-w-[70%] flex-col items-start gap-1 sm:left-3 sm:top-3">
          {discount > 0 && <span className="badge bg-red-500 text-white shadow-sm">-{discount}%</span>}
          {product.isNewArrival && <span className="badge bg-emerald-600 text-white shadow-sm">New</span>}
          {product.isBestSeller && <span className="badge bg-[#B76E79] text-white shadow-sm">🔥 Best Seller</span>}
          {product.stockQuantity > 0 && product.stockQuantity <= 5 && <span className="badge bg-amber-500 text-white shadow-sm">Only {product.stockQuantity} left</span>}
        </div>

        <span className="absolute right-2 top-2 hidden items-center rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-emerald-700 shadow-sm backdrop-blur sm:inline-flex">✓ Genuine</span>

        {outOfStock && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/25">
            <span className="rounded-full bg-[#1a1a1a]/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">Out of stock</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsWishlisted((wishlisted) => !wishlisted)}
          className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-white text-gray-500 shadow-md transition-all hover:scale-105 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79] sm:bottom-3 sm:right-3 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.brand && <p className="mb-1 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 sm:text-xs">{product.brand.name}</p>}
        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#1a1a1a] transition-colors hover:text-[#B76E79] sm:text-[15px]">{product.name}</h3>
        </Link>

        <div className="mt-2 flex items-center gap-1.5" aria-label={`${product.avgRating} out of 5 stars, ${product.reviewCount} reviews`}>
          <div className="flex" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-3 w-3 ${star <= Math.round(product.avgRating) ? 'fill-[#FFD700] text-[#FFD700]' : 'fill-gray-200 text-gray-200'}`} />)}
          </div>
          <span className="text-[11px] text-gray-400">({product.reviewCount})</span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base font-extrabold text-[#B76E79] sm:text-lg">{formatRWF(product.price)}</span>
          {product.comparePrice && product.comparePrice > product.price && <span className="text-[11px] text-gray-400 line-through sm:text-xs">{formatRWF(product.comparePrice)}</span>}
        </div>

        <div className="flex-1" />
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={addingToCart || outOfStock}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#a55d68] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 sm:text-sm"
        >
          <ShoppingCart className="h-4 w-4" />
          {addingToCart ? 'Adding...' : outOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </article>
  )
}
