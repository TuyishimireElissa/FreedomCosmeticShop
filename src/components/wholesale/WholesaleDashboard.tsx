'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, BarChart3, FileText, MessageCircle, Package, Phone, RefreshCw, ShoppingBag, Truck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRWF } from '@/lib/format'
import { WHOLESALE_CONFIG } from '@/lib/wholesale-config'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useT } from '@/lib/i18n/LanguageContext'
import IconButton from '@/components/a11y/IconButton'
import OrderStatusBadge from '@/components/a11y/OrderStatusBadge'

interface DashboardData {
  orderCount: number
  invoiceCount: number
  reorderCount: number
  user: { name: string; businessName: string; phone: string; loyaltyPoints: number }
  relationship: { tier: string | null; accountDiscount: number; manager: { name: string; phone: string | null; whatsapp: string | null } | null; preferredDeliveryDays: string[] }
  analytics: { totalSpent: number; totalSaved: number; monthlySpent: number; lastMonthSpent: number; averageOrder: number; completedOrderCount: number }
  lastOrder: null | { id: string; orderNumber: string; total: number; createdAt: string; items: Array<{ name: string; quantity: number; price: number }> }
  frequentProducts: Array<{ id: string; name: string; slug: string; retailPrice: number; stock: number; image: string | null; orderCount: number; totalQuantity: number }>
  restockSuggestions: Array<{ id: string; name: string; slug: string; lastBoughtAt: string; daysSince: number; averageDays: number }>
  recentOrders: Array<{ id: string; orderNumber: string; total: number; status: string; createdAt: string; isCredit: boolean }>
  recentInvoices: Array<{ id: string; invoiceNumber: string; totalAmount: number; paymentStatus: string; balanceDue: number; dueDate: string | null; issuedAt: string; pdfUrl: string | null }>
}
interface ReorderItem { productId: string; slug: string; name: string; price: number; image: string; stock: number; quantity: number }

export function WholesaleDashboard({ onInvoices, onCatalog }: { onInvoices: () => void; onCatalog: () => void }) {
  const t = useT()
  const { toast } = useToast()
  const { goHome } = useStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const response = await fetch('/api/wholesale/dashboard', { cache: 'no-store' }); if (response.ok) setData(await response.json()) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'Mwaramutse' : 'Mwiriwe'
  }, [])
  const firstName = data?.user.name.trim().split(/\s+/)[0] || ''

  const openWholesaleCatalog = () => { sessionStorage.setItem('wholesaleShoppingMode', '1'); onCatalog() }
  const toggleDeliveryDay = async (day: string) => {
    if (!data) return
    const current = data.relationship.preferredDeliveryDays
    const next = current.includes(day) ? current.filter((value) => value !== day) : [...current, day].slice(-2)
    const response = await fetch('/api/wholesale/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferredDeliveryDays: next }) })
    if (!response.ok) return toast({ title: 'Delivery preference was not saved', variant: 'destructive' })
    setData({ ...data, relationship: { ...data.relationship, preferredDeliveryDays: next } })
    toast({ title: 'Delivery preference saved' })
  }
  const reorder = async (orderId: string, modify = false) => {
    setReorderingOrderId(orderId)
    try {
      const response = await fetch('/api/wholesale/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || t('wholesale.reorder_failed'))
      for (const item of result.items as ReorderItem[]) useStore.getState().addToCart({ productId: item.productId, slug: item.slug, name: item.name, price: item.price, image: item.image, stock: item.stock }, item.quantity)
      sessionStorage.setItem('wholesaleReorderId', result.reorder.id)
      toast({ title: t('wholesale.reorder_prepared'), description: result.unavailableCount > 0 ? t('wholesale.reorder_partial', { added: result.addedProductCount, unavailable: result.unavailableCount }) : t('wholesale.reorder_all_available', { count: result.addedProductCount }) })
      if (modify) useStore.getState().goCart(); else openWholesaleCatalog()
    } catch (error) { toast({ title: t('wholesale.reorder_failed'), description: error instanceof Error ? error.message : t('common.error'), variant: 'destructive' }) }
    finally { setReorderingOrderId(null) }
  }

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-8"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="mt-4 h-64 rounded-2xl" /></div>
  if (!data) return <div className="mx-auto max-w-md px-4 py-20 text-center"><p>{t('wholesale.dashboard_failed')}</p><Button className="mt-3" onClick={load}>{t('common.retry')}</Button></div>

  const manager = data.relationship.manager
  const fallbackContact = WHOLESALE_CONFIG.contacts[0]
  const whatsapp = manager?.whatsapp?.replace(/\D/g, '') || fallbackContact?.whatsappE164 || ''
  const managerLabel = manager?.name || fallbackContact?.name || 'FreedomCosmeticShop'
  const message = encodeURIComponent(`Muraho ${managerLabel}! Nitwa ${data.user.name} wa ${data.user.businessName}. Nkeneye ubufasha ku itumwa ryanjye.`)
  const growth = data.analytics.lastMonthSpent > 0 ? Math.round(((data.analytics.monthlySpent - data.analytics.lastMonthSpent) / data.analytics.lastMonthSpent) * 100) : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="flex items-start gap-3"><IconButton label={t('wholesale.back_store')} icon={<ArrowLeft className="h-4 w-4" />} onClick={goHome} variant="ghost" /><div><p className="text-sm font-semibold text-[#B76E79]">{greeting}, {firstName}!</p><h1 className="text-2xl font-bold text-gray-950">{data.user.businessName}</h1><p className="text-sm text-gray-500">{data.relationship.tier ? `${data.relationship.tier} Partner` : t('wholesale.dashboard')}</p><p className="mt-1 text-sm font-medium text-gray-700">{data.relationship.accountDiscount > 0 ? `Account discount: ${data.relationship.accountDiscount}%` : 'Wholesale prices appear on products where your shop has configured pricing.'}</p></div></header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={String(data.orderCount)} icon={<Package />} />
        <Stat label="Total spent" value={formatRWF(data.analytics.totalSpent)} icon={<BarChart3 />} />
        <Stat label="Total saved" value={formatRWF(data.analytics.totalSaved)} icon={<FileText />} />
        <Stat label="Points" value={data.user.loyaltyPoints.toLocaleString()} icon={<RefreshCw />} />
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Your account manager</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-lg font-bold text-[#B76E79]">{managerLabel.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="font-bold">{managerLabel}</p><p className="text-sm text-gray-500">{manager ? 'Wholesale Account Manager' : 'Wholesale support contact'}</p>{!manager && <p className="mt-1 text-xs text-amber-700">A dedicated manager has not been assigned yet.</p>}</div><div className="flex gap-2">{whatsapp && <a href={`https://wa.me/${whatsapp}?text=${message}`} target="_blank" rel="noreferrer"><Button><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button></a>}{manager?.phone && <a href={`tel:${manager.phone}`}><Button variant="outline"><Phone className="mr-2 h-4 w-4" />Call</Button></a>}</div></div>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Preferred delivery days</h2><p className="mt-1 text-sm text-gray-500">Choose up to two days. The shop will try to schedule deliveries on these days; this is not a guaranteed appointment.</p><div className="mt-3 flex flex-wrap gap-2">{['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'].map((day) => <button key={day} type="button" onClick={() => void toggleDeliveryDay(day)} className={`min-h-10 rounded-full border px-3 text-xs font-semibold ${data.relationship.preferredDeliveryDays.includes(day) ? 'border-[#B76E79] bg-rose-50 text-[#B76E79]' : 'text-gray-600'}`}>{day.charAt(0) + day.slice(1).toLowerCase()}</button>)}</div></section>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Button variant="outline" className="h-auto py-4" onClick={openWholesaleCatalog}><ShoppingBag className="mr-2 h-5 w-5" />Your prices</Button>{data.lastOrder && <Button variant="outline" className="h-auto py-4" disabled={!!reorderingOrderId} onClick={() => reorder(data.lastOrder!.id)}><RefreshCw className="mr-2 h-5 w-5" />Reorder last</Button>}<Button variant="outline" className="h-auto py-4" onClick={onInvoices}><FileText className="mr-2 h-5 w-5" />Invoices</Button><Button variant="outline" className="h-auto py-4" onClick={() => useStore.getState().setView('trackOrder')}><Truck className="mr-2 h-5 w-5" />Track orders</Button></section>

      {data.lastOrder && <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Your last order ({data.lastOrder.orderNumber})</h2><ul className="mt-3 divide-y">{data.lastOrder.items.map((item, index) => <li key={`${item.name}-${index}`} className="flex justify-between py-2 text-sm"><span>{item.name} × {item.quantity}</span><span>{formatRWF(item.price * item.quantity)}</span></li>)}</ul><p className="mt-3 text-right font-bold">{formatRWF(data.lastOrder.total)}</p><div className="mt-4 flex gap-2"><Button disabled={!!reorderingOrderId} onClick={() => reorder(data.lastOrder!.id)}>Reorder same items</Button><Button variant="outline" disabled={!!reorderingOrderId} onClick={() => reorder(data.lastOrder!.id, true)}>Modify in cart</Button></div></section>}

      {data.restockSuggestions.length > 0 && <section className="mt-6"><h2 className="font-bold">Products that may need restocking</h2><p className="text-sm text-gray-500">Based only on your completed order history.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{data.restockSuggestions.map((item) => <article key={item.id} className="rounded-xl border bg-white p-4"><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-gray-500">Last bought {item.daysSince} days ago · average interval {item.averageDays} days</p><Button className="mt-3" size="sm" onClick={openWholesaleCatalog}>Review and reorder</Button></article>)}</div></section>}

      {data.frequentProducts.length > 0 && <section className="mt-6"><h2 className="font-bold">Frequently ordered</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.frequentProducts.map((item) => <article key={item.id} className="rounded-xl border bg-white p-4"><div className="flex gap-3">{item.image ? <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-contain" /> : <span className="grid h-16 w-16 place-items-center rounded-lg bg-gray-100"><Package className="h-6 w-6 text-gray-300" /></span>}<div><p className="font-semibold">{item.name}</p><p className="text-xs text-gray-500">Ordered {item.orderCount} time{item.orderCount === 1 ? '' : 's'}</p><p className="mt-1 text-sm font-bold">Retail reference: {formatRWF(item.retailPrice)}</p></div></div><Button className="mt-3" size="sm" variant="outline" onClick={openWholesaleCatalog}>View your current price</Button></article>)}</div></section>}

      <section className="mt-6 grid gap-6 lg:grid-cols-2"><div><h2 className="font-bold">Recent orders</h2><div className="mt-3 space-y-2">{data.recentOrders.length === 0 ? <Empty text="No wholesale orders yet." /> : data.recentOrders.map((order) => <div key={order.id} className="flex items-center justify-between rounded-xl border bg-white p-3"><div><p className="font-mono text-xs font-bold">{order.orderNumber}</p><OrderStatusBadge status={order.status} className="mt-1" /></div><div className="text-right"><p className="font-bold">{formatRWF(order.total)}</p><button className="text-xs text-[#B76E79]" onClick={() => reorder(order.id)}>Reorder</button></div></div>)}</div></div><div><h2 className="font-bold">Recent invoices</h2><div className="mt-3 space-y-2">{data.recentInvoices.length === 0 ? <Empty text="Invoices are generated from wholesale orders." /> : data.recentInvoices.map((invoice) => <button key={invoice.id} onClick={onInvoices} className="flex w-full justify-between rounded-xl border bg-white p-3 text-left"><span><span className="block font-mono text-xs font-bold">{invoice.invoiceNumber}</span><span className="text-xs text-gray-500">{new Date(invoice.issuedAt).toLocaleDateString('en-RW')}</span></span><span className="font-bold">{formatRWF(invoice.totalAmount)}</span></button>)}</div></div></section>

      <section className="mt-6 rounded-2xl border bg-gray-50 p-5"><h2 className="font-bold">Your purchase analytics</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="This month" value={formatRWF(data.analytics.monthlySpent)} /><Metric label="Last month" value={formatRWF(data.analytics.lastMonthSpent)} /><Metric label="Average order" value={formatRWF(data.analytics.averageOrder)} /><Metric label="Growth" value={growth === null ? 'Not enough history' : `${growth >= 0 ? '+' : ''}${growth}%`} /></div></section>

      {!data.relationship.tier && <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No account tier or upgrade threshold has been published for your business. Product-specific wholesale prices remain the source of truth.</p>}
    </main>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) { return <div className="rounded-2xl border bg-white p-4"><span className="text-[#B76E79] [&_svg]:h-5 [&_svg]:w-5">{icon}</span><p className="mt-2 break-words text-lg font-bold">{value}</p><p className="text-xs uppercase tracking-wider text-gray-500">{label}</p></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-bold">{value}</p></div> }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed p-5 text-center text-sm text-gray-500">{text}</p> }
