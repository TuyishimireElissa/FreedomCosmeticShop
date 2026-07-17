export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getInvoicePaymentSummary } from '@/lib/wholesale-invoice'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (user.wholesaleStatus !== 'APPROVED' || (user.userType !== 'WHOLESALE' && user.userType !== 'BOTH')) {
      return NextResponse.json({ error: 'Wholesale account not approved' }, { status: 403 })
    }

    const invoiceId = new URL(request.url).searchParams.get('id')
    if (invoiceId) {
      const invoice = await db.wholesaleInvoice.findFirst({
        where: { id: invoiceId, userId: user.id },
        include: { order: { include: { items: true, payments: { select: { status: true, amount: true, method: true, completedAt: true } } } } },
      })
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

      const summary = getInvoicePaymentSummary(invoice.order.payments, invoice.totalAmount, invoice.dueDate)
      const { payments: _payments, ...order } = invoice.order
      return NextResponse.json({ invoice: { ...invoice, ...summary, order } })
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
      invoices: invoices.map((invoice) => {
        const summary = getInvoicePaymentSummary(invoice.order.payments, invoice.totalAmount, invoice.dueDate)
        const { payments: _payments, ...order } = invoice.order
        return { ...invoice, ...summary, order }
      }),
    })
  } catch (error) {
    console.error('Invoices fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}
