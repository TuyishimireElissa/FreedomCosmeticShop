"use client"

import { useCallback, useEffect, useState } from 'react'
import { formatRWF } from '@/lib/format'
import { BUSINESS, OWNER_TODO } from '@/lib/business-config'
import { WHOLESALE_CONFIG } from '@/lib/wholesale-config'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, FileText, MessageCircle, Printer } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

type InvoicePaymentStatus = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'OVERDUE'

interface PaymentFields {
  isPaid: boolean
  paidAt: string | null
  paidAmount: number
  balanceDue: number
  paymentMethod: string | null
  paymentStatus: InvoicePaymentStatus
  isOverdue: boolean
  daysOverdue: number
}

interface InvoiceListItem extends PaymentFields {
  id: string
  invoiceNumber: string
  totalAmount: number
  dueDate: string | null
  issuedAt: string
}

interface InvoiceDetailData extends InvoiceListItem {
  businessName: string
  businessAddress: string
  tinNumber: string | null
  subtotal: number
  tax: number
  discount: number
  paymentTerms: string | null
  notes: string | null
  order: {
    orderNumber: string
    status: string
    items: Array<{ name: string; quantity: number; price: number }>
  }
}

function configured(value: string) {
  return value !== OWNER_TODO && !value.includes('TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH')
}

function statusClass(status: InvoicePaymentStatus) {
  if (status === 'PAID') return 'text-emerald-700'
  if (status === 'FAILED' || status === 'OVERDUE') return 'text-red-700'
  if (status === 'REFUNDED') return 'text-sky-700'
  return 'text-amber-700'
}

export function WholesaleInvoices({ onBack }: { onBack: () => void }) {
  const t = useT()
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [selected, setSelected] = useState<InvoiceDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/wholesale/invoices')
      if (response.ok) setInvoices((await response.json()).invoices || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openInvoice = async (id: string) => {
    const response = await fetch(`/api/wholesale/invoices?id=${encodeURIComponent(id)}`)
    if (response.ok) setSelected((await response.json()).invoice)
  }

  if (selected) return <InvoiceDetail invoice={selected} onBack={() => setSelected(null)} />

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <button onClick={onBack} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></button>
        <div><h1 className="flex items-center gap-2 text-xl font-bold"><FileText className="h-5 w-5 text-primary" />{t('wholesale.invoices')}</h1><p className="text-xs text-muted-foreground">{t('wholesale.invoice_count', { count: invoices.length })}</p></div>
      </div>

      {loading ? <div className="space-y-2">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-16 w-full rounded-xl" />)}</div> : invoices.length === 0 ? (
        <div className="grid place-items-center py-16 text-center"><FileText className="h-10 w-10 text-muted-foreground/40" /><h2 className="mt-3 font-semibold">{t('wholesale.no_invoices')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('wholesale.invoices_generated')}</p></div>
      ) : (
        <div className="space-y-2">{invoices.map((invoice) => (
          <button key={invoice.id} onClick={() => openInvoice(invoice.id)} className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left hover:bg-secondary/20">
            <div><p className="font-mono text-sm font-bold">{invoice.invoiceNumber}</p><p className="text-xs text-muted-foreground">{new Date(invoice.issuedAt).toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
            <div className="text-right"><p className="font-bold">{formatRWF(invoice.totalAmount)}</p><p className={`text-[10px] font-semibold ${statusClass(invoice.paymentStatus)}`}>{t(`wholesale.invoice_status_${invoice.paymentStatus.toLowerCase()}`)}</p></div>
          </button>
        ))}</div>
      )}
    </div>
  )
}

function InvoiceDetail({ invoice, onBack }: { invoice: InvoiceDetailData; onBack: () => void }) {
  const t = useT()
  const sellerAddressConfigured = configured(BUSINESS.address.street) && configured(BUSINESS.address.sector) && configured(BUSINESS.address.district)
  const sellerTaxIdentityConfigured = configured(BUSINESS.legalName) && configured(BUSINESS.tinNumber)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t('wholesale.back_invoices')}</button>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-3.5 w-3.5" />{t('wholesale.print_pdf')}</Button>
      </div>

      <article className="rounded-2xl border bg-white p-8 print:border-0 print:p-0">
        <header className="flex items-start justify-between border-b pb-4">
          <div><h1 className="text-2xl font-bold text-primary">{BUSINESS.tradingName}</h1><p className="text-xs text-muted-foreground">{t('wholesale.order_invoice')}</p></div>
          <div className="text-right"><p className="font-mono text-sm font-bold">{invoice.invoiceNumber}</p><p className="text-xs text-muted-foreground">{new Date(invoice.issuedAt).toLocaleDateString('en-RW', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
        </header>

        <section className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('wholesale.from')}</p>
            <p className="mt-1 font-medium">{configured(BUSINESS.legalName) ? BUSINESS.legalName : BUSINESS.tradingName}</p>
            {sellerAddressConfigured && <p className="text-xs text-muted-foreground">{BUSINESS.address.full}</p>}
            {configured(BUSINESS.tinNumber) && <p className="text-xs text-muted-foreground">{t('wholesale.tin_label')}: {BUSINESS.tinNumber}</p>}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('wholesale.to')}</p>
            <p className="mt-1 font-medium">{invoice.businessName}</p>
            <p className="text-xs text-muted-foreground">{invoice.businessAddress}</p>
            {invoice.tinNumber && <p className="text-xs text-muted-foreground">{t('wholesale.tin_label')}: {invoice.tinNumber}</p>}
          </div>
        </section>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2 pr-3 text-left font-medium">{t('wholesale.item')}</th><th className="py-2 pr-3 text-center font-medium">{t('cart.quantity')}</th><th className="py-2 pr-3 text-right font-medium">{t('product.unit_price')}</th><th className="py-2 text-right font-medium">{t('cart.total')}</th></tr></thead>
            <tbody className="divide-y">{invoice.order.items.map((item, index) => <tr key={index}><td className="py-2 pr-3">{item.name}</td><td className="py-2 pr-3 text-center">{item.quantity}</td><td className="py-2 pr-3 text-right">{formatRWF(item.price)}</td><td className="py-2 text-right font-medium">{formatRWF(item.price * item.quantity)}</td></tr>)}</tbody>
          </table>
        </div>

        <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{t('cart.subtotal')}</span><span>{formatRWF(invoice.subtotal)}</span></div>
          {invoice.discount > 0 && <div className="flex justify-between text-emerald-700"><span>{t('wholesale.discount')}</span><span>−{formatRWF(invoice.discount)}</span></div>}
          {invoice.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t('wholesale.tax')}</span><span>{formatRWF(invoice.tax)}</span></div>}
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>{t('cart.total').toUpperCase()}</span><span>{formatRWF(invoice.totalAmount)}</span></div>
        </div>

        <section className="mt-6 rounded-lg bg-secondary/20 p-4 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.status_label')}</span><span className={`font-semibold ${statusClass(invoice.paymentStatus)}`}>{t(`wholesale.invoice_status_${invoice.paymentStatus.toLowerCase()}`)}</span></div>
          {invoice.paymentMethod && <div className="mt-1 flex justify-between"><span className="text-muted-foreground">{t('wholesale.invoice_payment_method')}</span><span>{invoice.paymentMethod}</span></div>}
          <div className="mt-1 flex justify-between"><span className="text-muted-foreground">{t('wholesale.invoice_paid_amount')}</span><span>{formatRWF(invoice.paidAmount)}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-muted-foreground">{t('wholesale.invoice_balance')}</span><span>{formatRWF(invoice.balanceDue)}</span></div>
          {invoice.dueDate && <div className="mt-1 flex justify-between"><span className="text-muted-foreground">{t('wholesale.due_date')}</span><span>{new Date(invoice.dueDate).toLocaleDateString('en-RW', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>}
          {invoice.isOverdue && <p className="mt-2 text-right font-semibold text-red-700">{t('wholesale.invoice_days_overdue', { count: invoice.daysOverdue })}</p>}
        </section>

        <footer className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
          {!sellerTaxIdentityConfigured && <p>{t('wholesale.invoice_not_tax_notice')}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-2 print:hidden">{WHOLESALE_CONFIG.contacts.map((contact) => <a key={contact.whatsappE164} href={`https://wa.me/${contact.whatsappE164}`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline"><MessageCircle className="mr-1.5 h-4 w-4" />{t('wholesale.honest_whatsapp_contact', { phone: contact.displayPhone })}</Button></a>)}</div>
        </footer>
      </article>
    </div>
  )
}
