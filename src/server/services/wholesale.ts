/**
 * Wholesale Service — business logic for dual-pricing (retail + wholesale).
 *
 * Section 2: Backend Wholesale API
 *
 * Functions:
 *   - getWholesaleTiers(productId) → price tiers for a product
 *   - calculateWholesalePrice(productId, quantity, userId) → unit price + total + savings
 *   - checkCreditLimit(userId, orderAmount) → allowed/denied + available
 *   - updateCreditBalance(userId, amount, type, orderId) → DEBIT/CREDIT
 *   - generateWholesaleInvoice(orderId) → invoice data for PDF
 *   - getDefaultTiers(retailPrice) → standard 5-tier pricing structure
 *
 * All prices in RWF (integer). No Decimal type (SQLite).
 */

import { db } from "@/lib/db"
import { enqueueSms } from "@/server/services/sms-queue"
import { features } from "@/lib/env"

// ─── Constants ───────────────────────────────────────────────────────────────

export const WHOLESALE_MIN_ORDER = 50_000 // RWF minimum wholesale order
export const DEFAULT_TIERS = [
  { minQty: 1, maxQty: 5, discount: 0 },    // Retail price (0% off)
  { minQty: 6, maxQty: 11, discount: 12 },   // 12% off
  { minQty: 12, maxQty: 23, discount: 18 },  // 18% off
  { minQty: 24, maxQty: 47, discount: 24 },  // 24% off
  { minQty: 48, maxQty: null, discount: 29 },// 29% off
]

export interface PriceTier {
  minQty: number
  maxQty: number | null
  pricePerUnit: number
  discountPercent: number
  label: string
}

export interface WholesalePriceResult {
  retailPrice: number
  wholesalePrice: number
  currentPrice: number
  priceType: "RETAIL" | "WHOLESALE"
  savings: number
  savingsPercent: number
  tiers: PriceTier[]
}

// ─── getDefaultTiers ─────────────────────────────────────────────────────────

/**
 * Generate default price tiers from a retail price using the standard
 * discount structure (0%, 12%, 18%, 24%, 29%).
 */
export function getDefaultTiers(retailPrice: number): PriceTier[] {
  return DEFAULT_TIERS.map((t) => {
    const discount = t.discount
    const pricePerUnit = Math.round(retailPrice * (1 - discount / 100))
    return {
      minQty: t.minQty,
      maxQty: t.maxQty,
      pricePerUnit,
      discountPercent: discount,
      label: t.minQty === 1 ? "Retail" : `Buy ${t.minQty}+`,
    }
  })
}

// ─── getWholesaleTiers ───────────────────────────────────────────────────────

/**
 * Get the price tiers for a product. Falls back to default tiers
 * if no ProductPricing record exists.
 */
export async function getWholesaleTiers(productId: string): Promise<PriceTier[]> {
  const pricing = await db.productPricing.findUnique({
    where: { productId },
    include: { tiers: { orderBy: { minQuantity: "asc" } } },
  })

  if (pricing && pricing.tiers.length > 0) {
    return pricing.tiers.map((t) => ({
      minQty: t.minQuantity,
      maxQty: t.maxQuantity,
      pricePerUnit: t.pricePerUnit,
      discountPercent: t.discountPercent,
      label: t.tierName,
    }))
  }

  // Fall back to default tiers based on product retail price
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { price: true },
  })

  if (!product) return []
  return getDefaultTiers(product.price)
}

// ─── calculateWholesalePrice ─────────────────────────────────────────────────

/**
 * Calculate the wholesale price for a product at a given quantity.
 *
 * 1. Check if user is approved wholesale
 * 2. Get product wholesale tiers (or default)
 * 3. Find correct tier for quantity
 * 4. Apply user-specific extra discount if any
 * 5. Return: unit price, total, savings
 */
export async function calculateWholesalePrice(
  productId: string,
  quantity: number,
  userId?: string
): Promise<WholesalePriceResult> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { price: true, wholesaleActive: true },
  })

  if (!product) {
    throw new Error("Product not found")
  }

  const retailPrice = product.price
  const tiers = await getWholesaleTiers(productId)

  // Check if user is approved wholesale
  let isWholesale = false
  let extraDiscount = 0
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        userType: true,
        wholesaleStatus: true,
        wholesaleDiscount: true,
      },
    })
    if (
      user &&
      (user.userType === "WHOLESALE" || user.userType === "BOTH") &&
      user.wholesaleStatus === "APPROVED"
    ) {
      isWholesale = true
      extraDiscount = user.wholesaleDiscount || 0
    }
  }

  if (!isWholesale || !product.wholesaleActive) {
    // Retail user or wholesale not active → return retail price
    return {
      retailPrice,
      wholesalePrice: retailPrice,
      currentPrice: retailPrice,
      priceType: "RETAIL",
      savings: 0,
      savingsPercent: 0,
      tiers,
    }
  }

  // Find the correct tier for the requested quantity
  let applicableTier = tiers[0] // Default to first tier (retail)
  for (const tier of tiers) {
    if (quantity >= tier.minQty) {
      if (tier.maxQty === null || quantity <= tier.maxQty) {
        applicableTier = tier
        break
      }
    }
  }

  // Apply user-specific extra discount on top of tier discount
  let unitPrice = applicableTier.pricePerUnit
  if (extraDiscount > 0) {
    unitPrice = Math.round(unitPrice * (1 - extraDiscount / 100))
  }

  const total = unitPrice * quantity
  const retailTotal = retailPrice * quantity
  const savings = retailTotal - total
  const savingsPercent = retailPrice > 0 ? Math.round((savings / retailTotal) * 100) : 0

  return {
    retailPrice,
    wholesalePrice: applicableTier.pricePerUnit,
    currentPrice: unitPrice,
    priceType: "WHOLESALE",
    savings,
    savingsPercent,
    tiers,
  }
}

// ─── checkCreditLimit ────────────────────────────────────────────────────────

/**
 * Check if a wholesale user has enough credit for an order.
 *
 * Returns: { allowed, available, limit, used }
 */
export async function checkCreditLimit(
  userId: string,
  orderAmount: number
): Promise<{
  allowed: boolean
  available: number
  limit: number
  used: number
  message?: string
}> {
  const credit = await db.wholesaleCredit.findUnique({
    where: { userId },
  })

  if (!credit) {
    return {
      allowed: false,
      available: 0,
      limit: 0,
      used: 0,
      message: "No credit account found. Please contact admin.",
    }
  }

  const available = credit.availableCredit
  const allowed = orderAmount <= available

  return {
    allowed,
    available,
    limit: credit.creditLimit,
    used: credit.usedCredit,
    message: allowed
      ? undefined
      : `Insufficient credit. Available: ${available} RWF, Order: ${orderAmount} RWF`,
  }
}

// ─── updateCreditBalance ─────────────────────────────────────────────────────

/**
 * Update a user's credit balance.
 *
 * type: "DEBIT" (order placed on credit) | "CREDIT" (payment received) | "ADJUSTMENT"
 * amount: positive integer in RWF
 */
export async function updateCreditBalance(
  userId: string,
  amount: number,
  type: "DEBIT" | "CREDIT" | "ADJUSTMENT",
  description: string,
  orderId?: string
): Promise<void> {
  const credit = await db.wholesaleCredit.findUnique({ where: { userId } })
  if (!credit) {
    throw new Error("No credit account found for user")
  }

  let newUsed: number
  if (type === "DEBIT") {
    newUsed = credit.usedCredit + amount
  } else if (type === "CREDIT") {
    newUsed = Math.max(0, credit.usedCredit - amount)
  } else {
    // ADJUSTMENT — amount can be positive (increase used) or negative (decrease used)
    newUsed = Math.max(0, credit.usedCredit + amount)
  }

  const newAvailable = Math.max(0, credit.creditLimit - newUsed)

  await db.$transaction([
    db.wholesaleCredit.update({
      where: { userId },
      data: {
        usedCredit: newUsed,
        availableCredit: newAvailable,
      },
    }),
    db.creditHistory.create({
      data: {
        creditId: credit.id,
        type,
        amount,
        description,
        orderId: orderId || null,
      },
    }),
  ])
}

// ─── generateWholesaleInvoice ────────────────────────────────────────────────

/**
 * Generate a professional wholesale invoice for an order.
 * Creates the invoice record + returns the data for PDF rendering.
 */
export async function generateWholesaleInvoice(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      user: {
        select: {
          id: true,
          businessName: true,
          businessAddress: true,
          businessDistrict: true,
          tinNumber: true,
          businessPhone: true,
        },
      },
    },
  })

  if (!order) {
    throw new Error("Order not found")
  }

  // Check if invoice already exists
  const existing = await db.wholesaleInvoice.findUnique({
    where: { orderId },
  })
  if (existing) {
    return existing
  }

  // Generate invoice number: INV-WHL-YYYY-NNN
  const year = new Date().getFullYear()
  const countThisYear = await db.wholesaleInvoice.count({
    where: { invoiceNumber: { startsWith: `INV-WHL-${year}-` } },
  })
  const seq = String(countThisYear + 1).padStart(3, "0")
  const invoiceNumber = `INV-WHL-${year}-${seq}`

  // Calculate due date (30 days from now by default)
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)

  const businessName = order.user?.businessName || order.customerName
  const businessAddress =
    order.user?.businessAddress ||
    `${order.address}, ${order.district || order.city}, ${order.province}`
  const tinNumber = order.user?.tinNumber || null

  const invoice = await db.wholesaleInvoice.create({
    data: {
      invoiceNumber,
      orderId: order.id,
      userId: order.userId,
      businessName,
      businessAddress,
      tinNumber,
      subtotal: order.subtotal,
      tax: 0, // VAT not included for now (can be added later)
      discount: order.discountAmount,
      totalAmount: order.total,
      paymentTerms: "30 days",
      dueDate: order.isCredit ? order.creditDueDate : dueDate,
      isPaid: !order.isCredit, // Non-credit orders are considered paid
      paidAt: order.isCredit ? null : new Date(),
    },
  })

  // If credit order, update the credit balance
  if (order.isCredit && order.userId) {
    await updateCreditBalance(
      order.userId,
      order.total,
      "DEBIT",
      `Invoice ${invoiceNumber} for order ${order.orderNumber}`,
      order.id
    )
  }

  return invoice
}

// ─── sendWholesaleSms ────────────────────────────────────────────────────────

/**
 * Send wholesale-related SMS notifications.
 */
export async function sendWholesaleSms(
  phone: string,
  template: "application_received" | "application_approved" | "application_rejected" | "order_confirmed" | "payment_due" | "payment_overdue" | "payment_received",
  variables: Record<string, string | number>
): Promise<void> {
  if (!features.sms) return

  const messages: Record<string, string> = {
    application_received: `FreedomCosmeticShop: Wholesale application #${variables.id} received! We review in 24-48 hours. Questions? +250780000000`,
    application_approved: `Congratulations ${variables.name}! Your wholesale account at FreedomCosmeticShop is APPROVED! 🎉 Shop now and save up to 30% on all orders!`,
    application_rejected: `FreedomCosmeticShop: Your wholesale application was not approved. Reason: ${variables.reason}. Questions: +250780000000`,
    order_confirmed: `Wholesale Order #${variables.orderNumber} confirmed! Amount: ${variables.amount} RWF. Invoice: ${variables.invoice}. Due: ${variables.dueDate}. FreedomCosmeticShop 📦`,
    payment_due: `Reminder: Invoice ${variables.invoice} of ${variables.amount} RWF due on ${variables.dueDate}. Pay MTN MoMo: ${variables.momoNumber}. Ref: ${variables.invoice}. FreedomCosmeticShop 💳`,
    payment_overdue: `URGENT: Invoice ${variables.invoice} of ${variables.amount} RWF is OVERDUE. Pay now to avoid suspension. Call: +250780000000. FreedomCosmeticShop ⚠️`,
    payment_received: `Payment of ${variables.amount} RWF received for ${variables.invoice}. Balance: ${variables.remaining} RWF. Thank you! FreedomCosmeticShop ✅`,
  }

  const message = messages[template]
  if (message) {
    enqueueSms(phone, message, { priority: 1, template: "PROMOTIONAL" })
  }
}

// ─── getWholesaleDashboard ───────────────────────────────────────────────────

/**
 * Get wholesale dashboard data for a customer.
 */
export async function getWholesaleDashboard(userId: string) {
  const [credit, recentOrders, invoices] = await Promise.all([
    db.wholesaleCredit.findUnique({ where: { userId } }),
    db.order.findMany({
      where: { userId, orderType: "WHOLESALE" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
        isCredit: true,
      },
    }),
    db.wholesaleInvoice.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        isPaid: true,
        dueDate: true,
        issuedAt: true,
      },
    }),
  ])

  // Calculate total saved (retail vs wholesale)
  const wholesaleOrders = await db.order.findMany({
    where: { userId, orderType: "WHOLESALE", status: { not: "CANCELLED" } },
    select: { subtotal: true, discountAmount: true, total: true, createdAt: true },
  })

  const totalSaved = wholesaleOrders.reduce((sum, o) => sum + o.discountAmount, 0)
  const thisMonthOrders = wholesaleOrders.filter((o) => {
    const d = new Date(o.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthSaved = thisMonthOrders.reduce((sum, o) => sum + o.discountAmount, 0)

  return {
    credit: credit
      ? {
          limit: credit.creditLimit,
          used: credit.usedCredit,
          available: credit.availableCredit,
          paymentTermDays: credit.paymentTermDays,
        }
      : null,
    totalSaved,
    thisMonthSaved,
    recentOrders,
    recentInvoices: invoices,
  }
}
