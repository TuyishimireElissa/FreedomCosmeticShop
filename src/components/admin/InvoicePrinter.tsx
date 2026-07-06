"use client"

/**
 * InvoicePrinter — printable invoice/receipt for an order.
 *
 * Features:
 *   - Opens a printable invoice in a new window
 *   - Includes: business info, order number, customer info, items, totals, payment
 *   - Optimized for thermal/A4 printing
 *   - "Print" button triggers window.print()
 *
 * Usage:
 *   <InvoicePrinter order={order} />
 */

import { Button } from "@/components/ui/button"
import { formatRWF, PAYMENT_METHODS, PaymentMethodKey } from "@/lib/format"
import { Printer } from "lucide-react"
import type { Order } from "@/lib/types"

interface InvoicePrinterProps {
  order: Order
}

export function InvoicePrinter({ order }: InvoicePrinterProps) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=600,height=800")
    if (!printWindow) {
      alert("Please allow pop-ups to print invoices.")
      return
    }

    const items = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px 4px; border-bottom: 1px solid #eee;">
            ${item.name}${item.shade ? ` <em>(${item.shade})</em>` : ""}
          </td>
          <td style="padding: 8px 4px; text-align: center; border-bottom: 1px solid #eee;">
            ${item.quantity}
          </td>
          <td style="padding: 8px 4px; text-align: right; border-bottom: 1px solid #eee;">
            ${formatRWF(item.price)}
          </td>
          <td style="padding: 8px 4px; text-align: right; border-bottom: 1px solid #eee;">
            ${formatRWF(item.price * item.quantity)}
          </td>
        </tr>
      `
      )
      .join("")

    const paymentMethod = order.paymentMethod as PaymentMethodKey
    const paymentLabel = PAYMENT_METHODS[paymentMethod]?.label || order.paymentMethod

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice — ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      border-bottom: 2px solid #b76e79;
      padding-bottom: 16px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #b76e79;
    }
    .logo small {
      display: block;
      font-size: 12px;
      color: #666;
      font-weight: normal;
    }
    .invoice-meta {
      text-align: right;
      font-size: 13px;
    }
    .invoice-meta h2 {
      font-size: 18px;
      color: #b76e79;
    }
    .section {
      margin-bottom: 20px;
    }
    .section h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #999;
      margin-bottom: 6px;
    }
    .section p {
      font-size: 13px;
      line-height: 1.5;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #999;
      padding: 8px 4px;
      border-bottom: 2px solid #b76e79;
    }
    .items-table td {
      font-size: 13px;
    }
    .totals {
      margin-left: auto;
      width: 250px;
      font-size: 13px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .totals .total {
      font-size: 16px;
      font-weight: bold;
      border-top: 2px solid #b76e79;
      padding-top: 8px;
      margin-top: 4px;
    }
    .payment-box {
      background: #f9f9f9;
      border-left: 3px solid #b76e79;
      padding: 12px;
      margin-top: 16px;
      font-size: 13px;
    }
    .footer {
      margin-top: 32px;
      text-align: center;
      font-size: 11px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 12px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }
    @media print {
      body { padding: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">
        Ubumwe Beauty
        <small>Beauty that unites us</small>
      </div>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p><strong>${order.orderNumber}</strong></p>
      <p>${new Date(order.createdAt).toLocaleDateString("en-RW", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}</p>
      <p>
        <span class="status-badge" style="background: ${order.status === "DELIVERED" ? "#d1fae5" : "#fef3c7"}; color: ${order.status === "DELIVERED" ? "#065f46" : "#92400e"};">
          ${order.status}
        </span>
      </p>
    </div>
  </div>

  <div style="display: flex; gap: 32px; margin-bottom: 20px;">
    <div class="section" style="flex: 1;">
      <h3>Bill To</h3>
      <p><strong>${order.customerName}</strong></p>
      <p>${order.customerPhone}</p>
      ${order.customerEmail ? `<p>${order.customerEmail}</p>` : ""}
    </div>
    <div class="section" style="flex: 1;">
      <h3>Deliver To</h3>
      <p>${order.address}</p>
      <p>${order.city}${order.district ? `, ${order.district}` : ""}</p>
      <p>${order.province}</p>
      ${order.notes ? `<p><em>Notes: ${order.notes}</em></p>` : ""}
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span>Subtotal:</span>
      <span>${formatRWF(order.subtotal)}</span>
    </div>
    ${order.discountAmount > 0 ? `
    <div class="row" style="color: #059669;">
      <span>Discount:</span>
      <span>-${formatRWF(order.discountAmount)}</span>
    </div>
    ` : ""}
    <div class="row">
      <span>Delivery fee:</span>
      <span>${formatRWF(order.deliveryFee)}</span>
    </div>
    <div class="row total">
      <span>TOTAL:</span>
      <span>${formatRWF(order.total)}</span>
    </div>
  </div>

  <div class="payment-box">
    <strong>Payment:</strong> ${paymentLabel} —
    <span style="color: ${order.paymentStatus === "PAID" ? "#059669" : "#d97706"};">
      ${order.paymentStatus}
    </span>
  </div>

  <div class="footer">
    <p>Thank you for shopping with Ubumwe Beauty! 🌸</p>
    <p>KN 4 Ave, Kigali Heights, Kigali, Rwanda · +250 788 123 456 · hello@ubumwe.beauty</p>
    <p>For support, call us or send a WhatsApp message.</p>
  </div>

  <div class="no-print" style="text-align: center; margin-top: 24px;">
    <button onclick="window.print()" style="background: #b76e79; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; cursor: pointer;">
      🖨️ Print Invoice
    </button>
  </div>

  <script>
    // Auto-print on load
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <Button variant="outline" size="sm" onClick={handlePrint}>
      <Printer className="mr-1.5 h-4 w-4" /> Print invoice
    </Button>
  )
}
