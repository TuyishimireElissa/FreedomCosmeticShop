"use client"

import { useCallback, useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { formatRWF } from '@/lib/format'
import { WHOLESALE_CONFIG } from '@/lib/wholesale-config'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, FileText, MessageCircle, Package, RefreshCw, ShoppingBag, Truck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useT } from '@/lib/i18n/LanguageContext'
import IconButton from '@/components/a11y/IconButton'
import OrderStatusBadge from '@/components/a11y/OrderStatusBadge'

interface DashboardData {
  credit: null
  orderCount: number
  invoiceCount: number
  reorderCount: number
  recentOrders: Array<{
    id: string
    orderNumber: string
    total: number
    status: string
    createdAt: string
    isCredit: boolean
  }>
  recentInvoices: Array<{
    id: string
    invoiceNumber: string
    totalAmount: number
    paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'OVERDUE'
    balanceDue: number
    dueDate: string | null
    issuedAt: string
  }>
  user: { name: string; businessName: string; phone: string }
}

interface ReorderItem {
  productId: string
  slug: string
  name: string
  price: number
  image: string
  stock: number
  quantity: number
}

export function WholesaleDashboard({ onInvoices, onCatalog }: { onInvoices: () => void; onCatalog: () => void }) {
  const t = useT()
  const { toast } = useToast()
  const { goHome } = useStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/wholesale/dashboard')
      if (response.ok) setData(await response.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openWholesaleCatalog = () => {
    if (typeof window !== 'undefined') sessionStorage.setItem('wholesaleShoppingMode', '1')
    onCatalog()
  }

  const reorder = async (orderId: string) => {
    setReorderingOrderId(orderId)
    try {
      const response = await fetch('/api/wholesale/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || t('wholesale.reorder_failed'))

      for (const item of result.items as ReorderItem[]) {
        useStore.getState().addToCart({
          productId: item.productId,
          slug: item.slug,
          name: item.name,
          price: item.price,
          image: item.image,
          stock: item.stock,
        }, item.quantity)
      }

      if (typeof window !== 'undefined') sessionStorage.setItem('wholesaleReorderId', result.reorder.id)
      toast({
        title: t('wholesale.reorder_prepared'),
        description: result.unavailableCount > 0
          ? t('wholesale.reorder_partial', { added: result.addedProductCount, unavailable: result.unavailableCount })
          : t('wholesale.reorder_all_available', { count: result.addedProductCount }),
      })
      await load()
      openWholesaleCatalog()
    } catch (error) {
      toast({ title: t('wholesale.reorder_failed'), description: error instanceof Error ? error.message : t('common.error'), variant: 'destructive' })
    } finally {
      setReorderingOrderId(null)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8"><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="mt-4 h-48 w-full rounded-2xl" /></div>
  }
  if (!data) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center"><p className="text-sm text-muted-foreground">{t('wholesale.dashboard_failed')}</p><Button variant="outline" className="mt-3" onClick={load}>{t('common.retry')}</Button></div>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <IconButton label={t('wholesale.back_store')} icon={<ArrowLeft className="h-4 w-4" />} onClick={goHome} variant="ghost" className="rounded-lg" />
        <div><h1 className="text-xl font-bold">{t('wholesale.dashboard')}</h1><p className="text-xs text-muted-foreground">{data.user.businessName}</p></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-card p-4"><Package className="h-4 w-4 text-sky-600" /><p className="mt-1 text-lg font-bold">{data.orderCount}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('wholesale.dashboard_order_count')}</p></div>
        <div className="rounded-2xl border bg-card p-4"><FileText className="h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold">{data.invoiceCount}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('wholesale.dashboard_invoice_count')}</p></div>
        <div className="rounded-2xl border bg-card p-4"><RefreshCw className="h-4 w-4 text-violet-600" /><p className="mt-1 text-lg font-bold">{data.reorderCount}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('wholesale.dashboard_reorder_count')}</p></div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t('wholesale.honest_credit_disabled')}</div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={openWholesaleCatalog}><ShoppingBag className="h-5 w-5 text-primary" /><span className="text-xs">{t('wholesale.new_order')}</span></Button>
        {data.recentOrders[0] && <Button variant="outline" className="h-auto flex-col gap-1 py-3" disabled={reorderingOrderId !== null} onClick={() => reorder(data.recentOrders[0].id)}><RefreshCw className={`h-5 w-5 text-violet-600 ${reorderingOrderId ? 'animate-spin' : ''}`} /><span className="text-xs">{t('wholesale.quick_reorder')}</span></Button>}
        <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={onInvoices}><FileText className="h-5 w-5 text-primary" /><span className="text-xs">{t('wholesale.my_invoices')}</span></Button>
        <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={() => useStore.getState().setView('trackOrder')}><Truck className="h-5 w-5 text-primary" /><span className="text-xs">{t('orders.track')}</span></Button>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">{t('wholesale.recent_orders')}</h2>
        {data.recentOrders.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{t('wholesale.no_orders')}</p> : (
          <div className="space-y-2">{data.recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm">
              <div><p className="font-mono text-xs font-bold">{order.orderNumber}</p><p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-RW', { day: 'numeric', month: 'short' })}</p><OrderStatusBadge status={order.status} className="mt-1" /></div>
              <div className="flex items-center gap-3"><p className="font-bold">{formatRWF(order.total)}</p><Button size="sm" variant="ghost" disabled={reorderingOrderId !== null} onClick={() => reorder(order.id)}>{t('wholesale.reorder_action')}</Button></div>
            </div>
          ))}</div>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">{t('wholesale.recent_invoices')}</h2><button onClick={onInvoices} className="text-xs text-primary hover:underline">{t('home.view_all')} →</button></div>
        {data.recentInvoices.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{t('wholesale.no_invoices_auto')}</p> : (
          <div className="space-y-2">{data.recentInvoices.map((invoice) => (
            <button key={invoice.id} onClick={onInvoices} className="flex w-full items-center justify-between rounded-xl border bg-card p-3 text-left text-sm">
              <div><p className="font-mono text-xs font-bold">{invoice.invoiceNumber}</p><p className="text-xs text-muted-foreground">{new Date(invoice.issuedAt).toLocaleDateString('en-RW', { day: 'numeric', month: 'short' })}</p></div>
              <div className="text-right"><p className="font-bold">{formatRWF(invoice.totalAmount)}</p><p className="text-[10px] font-semibold">{t(`wholesale.invoice_status_${invoice.paymentStatus.toLowerCase()}`)}</p></div>
            </button>
          ))}</div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border bg-secondary/20 p-4">
        <h2 className="text-sm font-semibold">{t('wholesale.honest_questions_title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('wholesale.honest_no_hours_promise')}</p>
        <div className="mt-3 flex flex-wrap gap-2">{WHOLESALE_CONFIG.contacts.map((contact) => (
          <a key={contact.whatsappE164} href={`https://wa.me/${contact.whatsappE164}`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline"><MessageCircle className="mr-1.5 h-4 w-4" />{t('wholesale.honest_whatsapp_contact', { phone: contact.displayPhone })}</Button></a>
        ))}</div>
      </div>
    </div>
  )
}
