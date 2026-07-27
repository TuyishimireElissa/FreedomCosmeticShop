/**
 * Shared types for the storefront UI.
 * These mirror the Prisma models but with the JSON `images` field
 * deserialized to a string array for easier consumption in components.
 */

export interface Brand {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  country: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  icon: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { products: number }
}

export interface ProductImage {
  id: string
  url: string
  publicId: string
  altText: string
  altTextRw?: string | null
  imageType: string
  sortOrder: number
  isPrimary: boolean
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string | null
  price: number
  wholesalePrice?: number | null
  compareAt: number | null
  costPrice: number | null
  stock: number
  lowStockThreshold: number
  sku: string | null
  barcode: string | null
  images: string[]
  productImages?: ProductImage[]
  videoUrl: string | null
  // Cosmetics-specific (deserialized from JSON)
  skinType: string[] | null
  shades: string[] | null
  ingredients: string[] | null
  size: string | null
  usageInstructions: string | null
  warnings: string | null
  // Extended public cosmetic details. Cost, supplier, batch, manufacturing,
  // and expiry metadata intentionally do not belong in the storefront type.
  realSku?: string | null
  volume?: string | null
  volumeMl?: number | null
  weightGrams?: number | null
  ingredientsRw?: string | null
  howToUse?: string | null
  howToUseRw?: string | null
  warningsRw?: string | null
  allergens?: string[]
  hairType?: 'NATURAL' | 'RELAXED' | 'WAVY' | 'CURLY' | 'COILY' | 'ALL_HAIR' | null
  shade?: string | null
  shadeHex?: string | null
  undertone?: string | null
  fragranceNotes?: { top?: string[]; middle?: string[]; base?: string[] } | null
  expectedResults?: string | null
  expectedResultsRw?: string | null
  resultsTimeframe?: string | null
  periodAfterOpening?: number | null
  isAuthentic?: boolean
  authenticityInfo?: string | null
  countryOfOrigin?: string | null
  importedBy?: string | null
  rating: number
  reviewsCount: number
  featured: boolean
  isNew: boolean
  isActive: boolean
  // Honest server-computed catalogue signals.
  totalSales?: number
  isBestSeller?: boolean
  isNewArrival?: boolean
  isFeatured?: boolean
  isLowStock?: boolean
  isOutOfStock?: boolean
  // Section 1: Wholesale fields
  minWholesaleQty?: number
  wholesaleActive?: boolean
  createdAt: string
  updatedAt: string
  categoryId: string
  brandId: string | null
  category?: Category
  brand?: Brand | null
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string | null
  name: string
  price: number
  quantity: number
  image: string | null
  shade: string | null
  createdAt: string
}

export interface Payment {
  id: string
  orderId: string
  method: string // MTN_MOMO | AIRTEL_MONEY | CARD | COD
  providerTransactionId: string | null
  amount: number
  status: string // PENDING | PAID | FAILED | REFUNDED
  phoneNumber: string | null
  cardLast4: string | null
  cardBrand: string | null
  initiatedAt: string
  completedAt: string | null
}

export interface Delivery {
  id: string
  orderId: string
  status: string // PENDING | ASSIGNED | PICKED_UP | IN_TRANSIT | DELIVERED | FAILED
  driverName: string | null
  driverPhone: string | null
  trackingCode: string | null
  estimatedArrival: string | null
  actualArrival: string | null
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  address: string
  city: string
  district: string | null
  sector: string | null
  province: string
  notes: string | null
  paymentMethod: string // kept for backward compat with current UI
  paymentStatus: string
  status: string
  subtotal: number
  discountAmount: number
  deliveryFee: number
  total: number
  loyaltyPointsEarned: number
  items: OrderItem[]
  payments?: Payment[]
  delivery?: Delivery | null
  createdAt: string
  updatedAt: string
}
