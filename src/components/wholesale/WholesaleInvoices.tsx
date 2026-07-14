"use client"

/**
 * WholesaleInvoices — invoice list + professional invoice detail view.
 *
 * Section 6: Wholesale Shopping Experience
 *
 * Shows:
 *   - List of all wholesale invoices (number, date, amount, status)
 *   - Click an invoice → professional invoice view (from/to/items/totals/terms)
 *   - Download-friendly layout (print via browser)
 */

import { useState, useEffect, useCallback } from "react"
import { formatRWF } from "@/lib/format"
import { BUSINESS } from "@/lib/business-config"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { useT } from '@/lib/i18n/LanguageContext'

interface InvoiceListItem {
  id: string
  invoiceNumber: string
  orderNumber: string
  orderStatus: string
  businessName: string
  totalAmount: number
  paymentTerms: string | null
  dueDate: string | null
  isPaid: boolean
  paidAt: string | null
  issuedAt: string
  notes: string | null
}

interface InvoiceDetail {
  id: string
  invoiceNumber: string
  businessName: string
  businessAddress: string
  tinNumber: string | null
  subtotal: number
  tax: number
  discount: number
  totalAmount: number
  paymentTerms: string | null
  dueDate: string | null
  isPaid: boolean
  paidAt: string | null
  issuedAt: string
  notes: string | null
  order: {
    orderNumber: string
    status: string
    items: Array<{ name: string; quantity: number; price: number }>
  }
}

export function WholesaleInvoices({ onBack }: { onBack: () => void }) {
  const t = useT()
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [selected, setSelected] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/wholesale/invoices")
      if (!res.ok) return
      const data = await res.json()
      setInvoices(data.invoices || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/wholesale/invoices?id=${id}`)
      if (!res.ok) return
      const data = await res.json()
      setSelected(data.invoice)
    } catch {
      // ignore
    }
  }

  if (selected) {
    return <InvoiceDetail invoice={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <button onClick={onBack} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FileText className="h-5 w-5 text-primary" /> {t('wholesale.invoices')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('wholesale.invoice_count', { count: invoices.length })}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="grid place-items-center py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">{t('wholesale.no_invoices')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('wholesale.invoices_generated')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => openInvoice(inv.id)}
              className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left hover:bg-secondary/20"
            >
              <div>
                <p className="font-mono text-sm font-bold">{inv.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(inv.issuedAt).toLocaleDateString("en-RW", { day: "numeric", month: "short", year: "numeric" })}
                  {inv.dueDate && !inv.isPaid && (
                    <span className="ml-2 text-amber-600">· {t('wholesale.due')}: {new Date(inv.dueDate).toLocaleDateString("en-RW", { day: "numeric", month: "short" })}</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatRWF(inv.totalAmount)}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${inv.isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                  {inv.isPaid ? <><CheckCircle2 className="h-3 w-3" /> {t('wholesale.paid')}</> : <><Clock className="h-3 w-3" /> {t('wholesale.due')}</>}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Professional Invoice Detail View
// ============================================================================

function InvoiceDetail({ invoice, onBack }: { invoice: InvoiceDetail; onBack: () => void }) {
  const t = useT()
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('wholesale.back_invoices')}
        </button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-3.5 w-3.5" /> {t('wholesale.print_pdf')}
        </Button>
      </div>

      <div className="rounded-2xl border bg-white p-8 print:border-0 print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{BUSINESS.tradingName}</h1>
            <p className="text-xs text-muted-foreground">{t('wholesale.invoice')}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(invoice.issuedAt).toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* From / To */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('wholesale.from')}</p>
            <p className="mt-1 font-medium">{BUSINESS.legalName.includes('TODO') ? BUSINESS.tradingName : BUSINESS.legalName}</p>
            <p className="text-xs text-muted-foreground">{BUSINESS.address.full}</p>
            {!BUSINESS.tinNumber.includes('TODO') && <p className="text-xs text-muted-foreground">TIN: {BUSINESS.tinNumber}</p>}
            <p className="text-xs text-muted-foreground">Tel: {BUSINESS.phoneDisplay}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('wholesale.to')}</p>
            <p className="mt-1 font-medium">{invoice.businessName}</p>
            <p className="text-xs text-muted-foreground">{invoice.businessAddress}</p>
            {invoice.tinNumber && <p className="text-xs text-muted-foreground">TIN: {invoice.tinNumber}</p>}
          </div>
        </div>

        {/* Items */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 text-left font-medium">{t('wholesale.item')}</th>
                <th className="py-2 pr-3 text-center font-medium">{t('cart.quantity')}</th>
                <th className="py-2 pr-3 text-right font-medium">{t('product.unit_price')}</th>
                <th className="py-2 text-right font-medium">{t('cart.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.order.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 pr-3">{item.name}</td>
                  <td className="py-2 pr-3 text-center">{item.quantity}</td>
                  <td className="py-2 pr-3 text-right">{formatRWF(item.price)}</td>
                  <td className="py-2 text-right font-medium">{formatRWF(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('cart.subtotal')}</span>
            <span className="font-medium">{formatRWF(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>{t('wholesale.discount')}</span>
              <span>−{formatRWF(invoice.discount)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT ({BUSINESS.invoice.vatRate}%)</span>
              <span className="font-medium">{formatRWF(invoice.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>{t('cart.total').toUpperCase()}</span>
            <span>{formatRWF(invoice.totalAmount)}</span>
          </div>
        </div>

        {/* Payment terms */}
        <div className="mt-6 rounded-lg bg-secondary/20 p-4 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('wholesale.payment_terms')}</span>
            <span className="font-medium">{invoice.paymentTerms || t('wholesale.due_on_receipt')}</span>
          </div>
          {invoice.dueDate && (
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">{t('wholesale.due_date')}</span>
              <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">{t('orders.status_label')}</span>
            <span className={`font-medium ${invoice.isPaid ? "text-emerald-600" : "text-amber-600"}`}>
              {invoice.isPaid ? `✅ ${t('wholesale.paid')}` : `⏳ ${t('wholesale.due')}`}
            </span>
          </div>
          <div className="mt-2 border-t pt-2 text-[10px] text-muted-foreground">
            {t('wholesale.pay_momo_reference', { phone: BUSINESS.invoice.momoPaymentNumber, reference: invoice.invoiceNumber })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
          <p>{t('wholesale.thank_business')} 🇷🇼</p>
          <p className="mt-1">{t('wholesale.questions')} {BUSINESS.phoneDisplay} · {BUSINESS.emailInvoices}</p>
        </div>
      </div>
    </div>
  )
}
