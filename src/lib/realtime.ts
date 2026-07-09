/**
 * Realtime broadcast helpers — the bridge between admin actions and the
 * storefront real-time updates.
 *
 * Each helper does TWO things atomically:
 *   1. Invalidates the relevant Next.js cache tags (so future server-rendered
 *      pages fetch fresh data instead of stale cached data)
 *   2. Emits a real-time event via the event bus (so already-connected
 *      storefront browsers update instantly without a page refresh)
 *
 * Usage in admin API routes:
 *   import { broadcastProductEvent } from "@/lib/realtime"
 *
 *   // After creating a product:
 *   await broadcastProductEvent("created", product, { source: adminUser.name })
 *
 * Next.js cache tags used:
 *   "products"          — all product listings
 *   "products:featured" — featured products section
 *   "products:detail"   — individual product pages
 *   "orders"            — order lists
 *   "banners"           — homepage banner carousel
 *   "coupons"           — coupon validation
 *   "delivery"          — delivery fee calculations
 *   "blog"              — blog post listings
 *   "categories"        — category navigation
 *   "brands"            — brand carousel
 */

import { revalidateTag } from "next/cache"
import { emitRealtimeEvent } from "@/lib/event-bus"

// ─── Broadcast options ───────────────────────────────────────────────────────

interface BroadcastOptions {
  /** Who triggered the change (admin name, or "system") */
  source?: string
}

// ─── Product Events ──────────────────────────────────────────────────────────

export async function broadcastProductEvent(
  action: "created" | "updated" | "deleted" | "stockLow" | "outOfStock" | "priceChange" | "featured" | "onSale",
  product: { id: string; name: string; slug: string; price?: number; stock?: number; isActive?: boolean; featured?: boolean; oldPrice?: number; threshold?: number; [key: string]: unknown },
  options?: BroadcastOptions
): Promise<void> {
  // Bust Next.js cache
  revalidateTag("products", "max")
  revalidateTag("products:featured", "max")
  revalidateTag("products:bestsellers", "max")
  revalidateTag("products:new-arrivals", "max")
  revalidateTag(`product:${product.slug}`, "max")
  revalidateTag(`product:${product.id}`, "max")

  // Emit real-time event
  emitRealtimeEvent(`product:${action}`, product, options)
}

// ─── Order Events ────────────────────────────────────────────────────────────

export async function broadcastOrderEvent(
  action: "new" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled",
  order: { id: string; orderNumber: string; userId?: string | null; customerPhone: string; status: string; total: number; customerName?: string; [key: string]: unknown },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("orders", "max")
  revalidateTag(`order:${order.id}`, "max")

  emitRealtimeEvent(`order:${action}`, order, options)

  // If the order belongs to a registered user, emit a user-specific event
  // so their browser can update without polling
  if (order.userId) {
    emitRealtimeEvent(`user:${order.userId}:order:${action}`, order, options)
  }
}

// ─── Payment Events ──────────────────────────────────────────────────────────

export async function broadcastPaymentEvent(
  action: "confirmed" | "failed" | "refunded",
  payment: { id: string; orderId: string; orderNumber: string; amount: number; method: string; status: string; userId?: string | null },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("payments", "max")
  revalidateTag(`order:${payment.orderId}`, "max")

  emitRealtimeEvent(`payment:${action}`, payment, options)

  if (payment.userId) {
    emitRealtimeEvent(`user:${payment.userId}:payment:${action}`, payment, options)
  }
}

// ─── Banner Events ───────────────────────────────────────────────────────────

export async function broadcastBannerEvent(
  action: "created" | "updated" | "deleted",
  banner: { id: string; title: string; placement: string; isActive: boolean },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("banners", "max")
  revalidateTag("banners:homepage", "max")

  emitRealtimeEvent(`banner:${action}`, banner, options)
}

// ─── Promotion / Coupon Events ───────────────────────────────────────────────

export async function broadcastCouponEvent(
  action: "created" | "updated" | "deactivated" | "deleted",
  coupon: { id: string; code: string; type: string; value: number; isActive: boolean },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("coupons", "max")

  emitRealtimeEvent(`coupon:${action}`, coupon, options)
}

export async function broadcastPromotionEvent(
  action: "started" | "ended",
  promotion: { id: string; name: string; type: string; products?: string[] },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("promotions", "max")
  revalidateTag("promotions:active", "max")

  emitRealtimeEvent(`promotion:${action}`, promotion, options)
}

// ─── Content Events (Blog, FAQ) ──────────────────────────────────────────────

export async function broadcastBlogEvent(
  action: "published" | "unpublished" | "updated",
  post: { id: string; title: string; slug: string; status: string },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("blog", "max")
  revalidateTag(`blog:${post.slug}`, "max")

  emitRealtimeEvent(`blog:${action}`, post, options)
}

// ─── Category & Brand Events ─────────────────────────────────────────────────

export async function broadcastCategoryEvent(
  action: "created" | "updated" | "deactivated",
  category: { id: string; name: string; slug: string; isActive: boolean },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("categories", "max")

  emitRealtimeEvent(`category:${action}`, category, options)
}

export async function broadcastBrandEvent(
  action: "created" | "updated" | "featured",
  brand: { id: string; name: string; slug: string },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("brands", "max")

  emitRealtimeEvent(`brand:${action}`, brand, options)
}

// ─── Delivery Events ─────────────────────────────────────────────────────────

export async function broadcastDeliveryEvent(
  action: "feeUpdated" | "assigned" | "updated",
  data: { orderId?: string; orderNumber?: string; userId?: string | null; zoneCode?: string; riderName?: string; riderPhone?: string; baseFee?: number; freeThreshold?: number; estimatedDays?: number; isSameDay?: boolean; isActive?: boolean; [key: string]: unknown },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("delivery", "max")
  revalidateTag("delivery:zones", "max")

  emitRealtimeEvent(`delivery:${action}`, data, options)

  if (data.userId) {
    emitRealtimeEvent(`user:${data.userId}:delivery:${action}`, data, options)
  }
}

// ─── Notification Events ─────────────────────────────────────────────────────

export async function broadcastNotificationEvent(
  action: "new" | "read",
  notification: { id: string; userId: string; type: string; title: string },
  options?: BroadcastOptions
): Promise<void> {
  emitRealtimeEvent(`user:${notification.userId}:notification:${action}`, notification, options)
}

// ─── Announcement Bar Event ──────────────────────────────────────────────────

export async function broadcastAnnouncementEvent(
  announcement: { text: string; textRw?: string; bgColor: string; textColor: string; isActive: boolean; link?: string },
  options?: BroadcastOptions
): Promise<void> {
  revalidateTag("announcement", "max")

  emitRealtimeEvent("announcement:updated", announcement, options)
}

// ─── Loyalty Points Event ────────────────────────────────────────────────────

export async function broadcastLoyaltyEvent(
  action: "earned" | "redeemed" | "adjusted",
  data: { userId: string; points: number; balance: number; reason?: string },
  options?: BroadcastOptions
): Promise<void> {
  emitRealtimeEvent(`user:${data.userId}:loyalty:${action}`, data, options)
}

// ─── Customer Account Events ─────────────────────────────────────────────────

export async function broadcastCustomerEvent(
  action: "blocked" | "unblocked",
  data: { userId: string; userName: string; reason?: string },
  options?: BroadcastOptions
): Promise<void> {
  // Emit a user-specific event so the customer's browser can react
  // (log them out immediately if blocked)
  emitRealtimeEvent(`user:${data.userId}:account:${action}`, data, options)
}
