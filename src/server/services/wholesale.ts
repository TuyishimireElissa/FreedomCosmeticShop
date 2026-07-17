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
 *
 * All prices are integer RWF values. Wholesale discounts come only from
 * owner-configured ProductPricing and WholesaleTier records.
 */

import { db } from "@/lib/db"
import { enqueueSms } from "@/server/services/sms-queue"
import { features } from "@/lib/env"
import { BUSINESS } from "@/lib/business-config"
import { WHOLESALE_CONFIG } from "@/lib/wholesale-config"
import { getInvoicePaymentSummary } from "@/lib/wholesale-invoice"

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

// ─── getWholesaleTiers ───────────────────────────────────────────────────────

/**
 * Get owner-configured price tiers for a product.
 * No fallback discount is generated when a product has no saved tiers.
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

  return []
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
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        userType: true,
        wholesaleStatus: true,
      },
    })
    if (
      user &&
      (user.userType === "WHOLESALE" || user.userType === "BOTH") &&
      user.wholesaleStatus === "APPROVED"
    ) {
      isWholesale = true
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

  // No owner-configured tier means no wholesale discount.
  const applicableTier = tiers.find(
    (tier) => quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty)
  )
  if (!applicableTier) {
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

  const unitPrice = applicableTier.pricePerUnit
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
  if (!WHOLESALE_CONFIG.credit.enabled) {
    return {
      allowed: false,
      available: 0,
      limit: 0,
      used: 0,
      message: "Wholesale credit is not enabled.",
    }
  }

  const credit = await db.wholesaleCredit.findUnique({
    where: { userId },
  })

  if (!credit || !credit.isActive || credit.isSuspended) {
    return {
      allowed: false,
      available: 0,
      limit: 0,
      used: 0,
      message: "No active wholesale credit account is available.",
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
  if (!WHOLESALE_CONFIG.credit.enabled) {
    throw new Error("Wholesale credit is not enabled")
  }

  const credit = await db.wholesaleCredit.findUnique({ where: { userId } })
  if (!credit || !credit.isActive || credit.isSuspended) {
    throw new Error("No active wholesale credit account is available")
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
      payments: true,
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

  const businessName = order.user?.businessName || order.customerName
  const businessAddress =
    order.user?.businessAddress ||
    `${order.address}, ${order.district || order.city}, ${order.province}`
  const tinNumber = order.user?.tinNumber || null

  const paidPayment = order.payments.find((payment) => payment.status === "PAID")
  const paidAmount = paidPayment ? Math.min(order.total, paidPayment.amount) : 0
  const invoice = await db.wholesaleInvoice.create({
    data: {
      invoiceNumber,
      orderId: order.id,
      userId: order.userId,
      businessName,
      businessAddress,
      tinNumber,
      subtotal: order.subtotal,
      tax: 0,
      discount: order.discountAmount,
      totalAmount: order.total,
      paidAmount,
      balanceDue: Math.max(0, order.total - paidAmount),
      paymentTerms: null,
      dueDate: order.isCredit ? order.creditDueDate : null,
      isPaid: paidAmount >= order.total,
      paidAt: paidAmount >= order.total ? paidPayment?.completedAt || new Date() : null,
      paymentMethod: paidPayment?.method || order.payments[0]?.method || null,
      isOverdue: false,
      daysOverdue: 0,
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
    application_received: `${BUSINESS.tradingName}: Wholesale application #${variables.id} received. We will contact you after review.`,
    application_approved: `${BUSINESS.tradingName}: The wholesale application for ${variables.name} is approved. Product-specific wholesale prices appear when configured.`,
    application_rejected: `${BUSINESS.tradingName}: Your wholesale application was not approved. Reason: ${variables.reason}. Questions: ${BUSINESS.phone}`,
    order_confirmed: `${BUSINESS.tradingName}: Wholesale order #${variables.orderNumber} was received. Amount: ${variables.amount} RWF. Order invoice: ${variables.invoice}.`,
    payment_due: `Reminder: Invoice ${variables.invoice} of ${variables.amount} RWF due on ${variables.dueDate}. Pay MTN MoMo: ${variables.momoNumber}. Ref: ${variables.invoice}. ${BUSINESS.tradingName} 💳`,
    payment_overdue: `URGENT: Invoice ${variables.invoice} of ${variables.amount} RWF is OVERDUE. Pay now to avoid suspension. Call: ${BUSINESS.phone}. ${BUSINESS.tradingName} ⚠️`,
    payment_received: `Payment of ${variables.amount} RWF received for ${variables.invoice}. Balance: ${variables.remaining} RWF. Thank you! ${BUSINESS.tradingName} ✅`,
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
  const [recentOrders, invoices, orderCount, invoiceCount, reorderCount] = await Promise.all([
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
        dueDate: true,
        issuedAt: true,
        order: {
          select: {
            payments: { select: { status: true, amount: true, method: true, completedAt: true } },
          },
        },
      },
    }),
    db.order.count({ where: { userId, orderType: "WHOLESALE" } }),
    db.wholesaleInvoice.count({ where: { userId } }),
    db.wholesaleReorder.count({ where: { userId } }),
  ])

  return {
    credit: null,
    orderCount,
    invoiceCount,
    reorderCount,
    recentOrders,
    recentInvoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      dueDate: invoice.dueDate,
      issuedAt: invoice.issuedAt,
      ...getInvoicePaymentSummary(invoice.order.payments, invoice.totalAmount, invoice.dueDate),
    })),
  }
}
