'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { formatRWF } from '@/lib/utils'
import { useState } from 'react'
import toast from 'react-hot-toast'

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

export default function ProductCard({ 
  product 
}: { 
  product: Product 
}) {
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
          quantity: 1 
        }),
      })
      if (res.ok) {
        toast.success('Added to cart! RWF ' + product.price)
      } else {
        toast.error('Please login to add to cart')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 group">
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
        <Link href={`/products/${product.slug}`}>
          <Image
            src={product.images[0] || 'https://via.placeholder.com/400x400?text=Product'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
              -{discount}%
            </span>
          )}
          {product.isNewArrival && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
              New
            </span>
          )}
          {product.isBestSeller && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#B76E79] text-white">
              🔥 Best Seller
            </span>
          )}
          {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white">
              Only {product.stockQuantity} left!
            </span>
          )}
          {product.stockQuantity === 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white">
              Out of Stock
            </span>
          )}
        </div>

        {/* Authentic Badge */}
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-green-600 shadow-sm">
            ✅ Genuine
          </span>
        </div>

        {/* Wishlist */}
        <button
          onClick={() => setIsWishlisted(!isWishlisted)}
          className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart
            size={16}
            className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}
          />
        </button>
      </div>

      <div className="p-3">
        {product.brand && (
          <p className="text-xs text-gray-400 mb-1">
            {product.brand.name}
          </p>
        )}
        <Link href={`/products/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-[#B76E79] transition-colors leading-tight mb-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex">
            {[1,2,3,4,5].map(star => (
              <Star
                key={star}
                size={12}
                className={star <= Math.round(product.avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">
            ({product.reviewCount})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-bold text-[#B76E79] text-base">
            {formatRWF(product.price)}
          </span>
          {product.comparePrice && (
            <span className="text-xs text-gray-400 line-through">
              {formatRWF(product.comparePrice)}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          disabled={addingToCart || product.stockQuantity === 0}
          className="w-full flex items-center justify-center gap-2 bg-[#B76E79] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#a55d68] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          <ShoppingCart size={16} />
          {addingToCart ? 'Adding...' : product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
