/**
 * Shared types for the storefront UI.
 * These mirror the Prisma models but with the JSON `images` field
 * deserialized to a string array for easier consumption in components.
 */

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  createdAt: string
  updatedAt: string
  _count?: { products: number }
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  compareAt: number | null
  images: string[]
  rating: number
  reviews: number
  stock: number
  sku: string | null
  brand: string | null
  featured: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  categoryId: string
  category?: Category
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string | null
  name: string
  price: number
  quantity: number
  image: string | null
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  address: string
  city: string
  province: string
  notes: string | null
  paymentMethod: string
  paymentStatus: string
  status: string
  subtotal: number
  deliveryFee: number
  total: number
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}
