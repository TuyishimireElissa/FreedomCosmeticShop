'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Download, FileText, MapPin, MessageCircle, Share2 } from 'lucide-react'
import { toBlob, toPng } from 'html-to-image'
import { useCart } from '@/hooks/useCart'
import { useStore } from '@/store/useStore'
import { formatRWF } from '@/lib/format'
import { wholesaleWhatsAppNumber } from '@/lib/wholesale-whatsapp'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { trackWhatsAppClick } from '@/lib/whatsapp-service'

interface ProvinceGroup { province: string; districts: string[] }
interface DeliveryQuote { fee: number; deliveryTime: string }

export default function WholesaleOrderPreview() {
  const cart = useCart()
  const user = useStore((state) => state.user)
  const authLoading = useStore((state) => state.authLoading)
  const { language } = useLanguage()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [provinces, setProvinces] = useState<ProvinceGroup[]>([])
  const [district, setDistrict] = useState(cart.selectedDistrict || '')
  const [sector, setSector] = useState('')
  const [landmark, setLandmark] = useState('')
  const [delivery, setDelivery] = useState<DeliveryQuote | null>(null)
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sent, setSent] = useState(false)
  const [notice, setNotice] = useState('')
  const isWholesale = user?.wholesaleStatus === 'APPROVED'
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = delivery?.fee || 0
  const total = subtotal + deliveryFee
  const province = useMemo(() => provinces.find((group) => group.districts.includes(district))?.province || '', [district, provinces])
  const isRw = language !== 'en'

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/delivery/districts', { signal: controller.signal, cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error()))
      .then((result) => setProvinces(result.provinces || result.data?.provinces || []))
      .catch((error) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Delivery locations could not be loaded. Please try again.') })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!district || subtotal <= 0) { setDelivery(null); return }
    const controller = new AbortController()
    setDeliveryLoading(true)
    fetch(`/api/delivery/calculate?district=${encodeURIComponent(district)}&orderTotal=${subtotal}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error()))
      .then((result) => setDelivery(result.data || result))
      .catch((error) => { if (!(error instanceof DOMException && error.name === 'AbortError')) { setDelivery(null); setNotice('Delivery fee could not be calculated. Please try again.') } })
      .finally(() => { if (!controller.signal.aborted) setDeliveryLoading(false) })
    return () => controller.abort()
  }, [district, subtotal])

  const invoiceFilename = `FreedomCosmeticShop-wholesale-order-${new Date().toISOString().slice(0, 10)}.png`

  const downloadPng = async () => {
    if (!invoiceRef.current) return
    setExporting(true); setNotice('')
    try {
      const dataUrl = await toPng(invoiceRef.current, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
      const link = document.createElement('a')
      link.download = invoiceFilename
      link.href = dataUrl
      link.click()
      setNotice(isRw ? 'Ifoto y’inyemezabuguzi yabitswe.' : 'Invoice image downloaded.')
    } catch {
      setNotice(isRw ? 'Ifoto ntiyabashije kubikwa. Ongera ugerageze.' : 'The invoice image could not be downloaded. Please try again.')
    } finally { setExporting(false) }
  }

  const shareInvoiceImage = async () => {
    if (!invoiceRef.current) return
    setExporting(true); setNotice('')
    try {
      const blob = await toBlob(invoiceRef.current, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
      if (!blob) throw new Error('IMAGE_FAILED')
      const file = new File([blob], invoiceFilename, { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'FreedomCosmeticShop — Wholesale Order', text: 'Please confirm this wholesale order.', files: [file] })
        setSent(true)
        setNotice(isRw ? 'Ifoto y’inyemezabuguzi yafunguwe ngo isangizwe.' : 'Invoice image opened in your phone’s share menu. Choose WhatsApp to send it.')
      } else {
        await downloadPng()
        setNotice(isRw ? 'Hitamo ifoto yabitswe maze uyohereze kuri WhatsApp.' : 'Your browser downloaded the invoice image. Attach it in WhatsApp to send it.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setNotice(isRw ? 'Ifoto ntiyabashije gusangizwa. Ongera ugerageze.' : 'The invoice image could not be shared. Please try again.')
    } finally { setExporting(false) }
  }

  const openWhatsApp = () => {
    if (!district || !sector.trim() || !delivery) return
    const itemLines = cart.items.map((item, index) => `${index + 1}. ${item.name}${item.volume ? ` (${item.volume})` : ''} x ${item.quantity} - ${formatRWF(item.price * item.quantity)}`).join('\n')
    const address = [sector.trim(), landmark.trim() ? `(Landmark: ${landmark.trim()})` : '', district, province].filter(Boolean).join(', ')
    const message = [
      '*FreedomCosmeticShop — Wholesale Order*', '',
      '*BILL TO:*', user?.name || 'Customer', user?.phone || '', user?.email || '', '',
      '*DELIVER TO:*', address, '',
      '*ITEMS:*', itemLines, '',
      `Subtotal: ${formatRWF(subtotal)}`,
      `Delivery: ${formatRWF(deliveryFee)}`,
      `*TOTAL: ${formatRWF(total)}*`, '',
      'Please confirm this order.',
    ].filter((line, index, values) => line !== '' || values[index - 1] !== '').join('\n')
    window.open(`https://wa.me/${wholesaleWhatsAppNumber(user?.assignedManagerWhatsApp)}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    trackWhatsAppClick('order_cart', { cartTotal: total, district, language: isRw ? 'rw' : 'en', pagePath: '/wholesale/order-preview' })
    setSent(true)
  }

  if (authLoading) return <main className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4"><p className="text-sm text-gray-500">Loading order preview…</p></main>
  if (!isWholesale) return <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center"><div><h1 className="text-2xl font-bold">Wholesale approval required</h1><p className="mt-2 text-sm text-gray-500">This invoice preview is available to approved wholesale customers.</p><Link href="/wholesale" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#B76E79] px-6 font-bold text-white">Wholesale information</Link></div></main>
  if (cart.items.length === 0) return <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center"><div><h1 className="text-2xl font-bold">Your cart is empty</h1><p className="mt-2 text-sm text-gray-500">Add wholesale products before creating an invoice preview.</p><Link href="/products" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#B76E79] px-6 font-bold text-white">Browse products</Link></div></main>

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <header className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B76E79]">FreedomCosmeticShop Wholesale</p><h1 className="mt-2 text-3xl font-black text-gray-950">Professional order invoice</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Confirm the delivery address, review every amount, then share the invoice image or send the order details through WhatsApp.</p></header>

    <section className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5" aria-labelledby="delivery-heading">
      <h2 id="delivery-heading" className="flex items-center gap-2 text-lg font-bold"><MapPin className="h-5 w-5 text-[#B76E79]" />Where should we deliver?</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-semibold text-gray-700">District<span className="text-red-600"> *</span><select value={district} onChange={(event) => { setDistrict(event.target.value); cart.setDistrict(event.target.value); setNotice('') }} className="mt-1 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base"><option value="">Select District</option>{provinces.map((group) => <optgroup key={group.province} label={group.province}>{group.districts.map((value) => <option key={value} value={value}>{value}</option>)}</optgroup>)}</select></label>
        <label className="text-sm font-semibold text-gray-700">Sector<span className="text-red-600"> *</span><input value={sector} onChange={(event) => setSector(event.target.value)} placeholder="e.g. Kimironko" className="mt-1 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base" /></label>
        <label className="text-sm font-semibold text-gray-700">Landmark <span className="font-normal text-gray-400">(optional)</span><input value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="e.g. Near the market" className="mt-1 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base" /></label>
      </div>
      {deliveryLoading && <p role="status" className="mt-3 text-sm text-gray-500">Calculating the real delivery fee…</p>}
      {delivery && <p className="mt-3 text-sm font-semibold text-emerald-700">Delivery quote: {formatRWF(deliveryFee)} · {delivery.deliveryTime}</p>}
    </section>

    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-100 p-2 sm:p-4">
      <div ref={invoiceRef} className="mx-auto w-[760px] bg-white p-10 text-gray-900 shadow-sm">
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-6"><div><p className="text-2xl font-black tracking-tight">FreedomCosmeticShop</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#B76E79]">Wholesale Order Invoice</p></div><div className="text-right text-xs text-gray-500"><p>ORDER PREVIEW</p><p className="mt-1">{new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div></div>

        <div className="mt-8 grid grid-cols-2 gap-12">
          <InvoiceAddress title="Bill To"><p className="font-bold uppercase text-gray-950">{user?.name || 'Customer'}</p>{user?.businessName && <p>{user.businessName}</p>}<p>{user?.phone || ''}</p><p>{user?.email || ''}</p></InvoiceAddress>
          <InvoiceAddress title="Deliver To">{sector && <p>{sector}</p>}{landmark && <p>(Landmark: {landmark})</p>}{district && <p>{district}</p>}{province && <p>{province}</p>}{!district && <p className="italic text-gray-400">Select a delivery address above</p>}</InvoiceAddress>
        </div>

        <div className="mt-10">
          <div className="grid grid-cols-12 gap-2 border-y-2 border-[#B76E79] py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500"><div className="col-span-6">Item</div><div className="col-span-1 text-center">Qty</div><div className="col-span-2 text-right">Price</div><div className="col-span-3 text-right">Total</div></div>
          {cart.items.map((item) => <div key={item.productId} className="grid min-h-16 grid-cols-12 items-center gap-2 border-b border-gray-100 py-4 text-sm"><div className="col-span-6"><p className="font-semibold">{item.name}</p>{item.volume && <p className="mt-0.5 text-xs text-gray-500">{item.volume}</p>}</div><div className="col-span-1 text-center">{item.quantity}</div><div className="col-span-2 text-right">{formatRWF(item.price)}</div><div className="col-span-3 text-right font-semibold">{formatRWF(item.price * item.quantity)}</div></div>)}
        </div>

        <div className="ml-auto mt-7 w-[330px] border-t-2 border-gray-200 pt-4"><InvoiceTotal label="Subtotal" value={formatRWF(subtotal)} /><InvoiceTotal label="Delivery fee" value={deliveryLoading ? 'Calculating…' : formatRWF(deliveryFee)} /><div className="mt-3 border-t-2 border-gray-900 pt-3"><InvoiceTotal label="TOTAL" value={formatRWF(total)} strong /></div></div>
        <div className="mt-10 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">Wholesale order request · Final availability and delivery details are confirmed on WhatsApp.</div>
      </div>
    </div>

    {notice && <p role="status" aria-live="polite" className="mt-5 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">{notice}</p>}
    {sent && <section role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-800">Invoice sharing started</p><p className="mt-1 text-sm text-emerald-700">Our team will confirm the order after receiving it on WhatsApp.</p></section>}

    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={shareInvoiceImage} disabled={exporting || !district || !sector.trim() || !delivery} className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"><Share2 className="h-5 w-5" />{exporting ? 'Preparing invoice…' : 'Share Invoice Image'}</button>
      <button type="button" onClick={openWhatsApp} disabled={!district || !sector.trim() || !delivery} className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 font-bold text-white hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-gray-300"><MessageCircle className="h-5 w-5" />{district ? 'Send Order via WhatsApp' : 'Select district first'}</button>
      <button type="button" onClick={downloadPng} disabled={exporting} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 font-bold text-gray-700 hover:border-[#B76E79]"><Download className="h-5 w-5" />Download Invoice PNG</button>
      <button type="button" onClick={() => window.print()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 font-bold text-gray-700 hover:border-[#B76E79]"><FileText className="h-5 w-5" />Print / Save PDF</button>
    </div>
    <Link href="/products" className="mt-3 flex min-h-12 items-center justify-center rounded-xl text-sm font-bold text-[#B76E79]">Continue Shopping</Link>
  </main>
}

function InvoiceAddress({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="border-b border-[#B76E79] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">{title}</h2><div className="mt-3 space-y-1 text-sm leading-5 text-gray-600">{children}</div></section>
}

function InvoiceTotal({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-baseline justify-between py-1.5 ${strong ? 'text-base font-black' : 'text-sm'}`}><span>{label}:</span><span>{value}</span></div>
}
