export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getInvoicePaymentSummary } from '@/lib/wholesale-invoice'

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (user.wholesaleStatus !== 'APPROVED' || (user.userType !== 'WHOLESALE' && user.userType !== 'BOTH')) {
      return NextResponse.json({ error: 'Wholesale account not approved' }, { status: 403 })
    }

    const invoices = await db.wholesaleInvoice.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: 'desc' },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            payments: { select: { status: true, amount: true, method: true, completedAt: true } },
          },
        },
      },
    })

    return NextResponse.json({
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.order.orderNumber,
        orderStatus: invoice.order.status,
        businessName: invoice.businessName,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        discount: invoice.discount,
        totalAmount: invoice.totalAmount,
        paymentTerms: invoice.paymentTerms,
        dueDate: invoice.dueDate,
        issuedAt: invoice.issuedAt,
        notes: invoice.notes,
        ...getInvoicePaymentSummary(invoice.order.payments, invoice.totalAmount, invoice.dueDate),
      })),
    })
  } catch (error) {
    console.error('Invoices fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}
