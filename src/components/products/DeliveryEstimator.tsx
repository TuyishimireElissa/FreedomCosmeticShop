'use client'

import { useEffect, useState } from 'react'
import { Clock, Loader2, MapPin, RefreshCw, Truck } from 'lucide-react'

interface ProvinceGroup { province: string; districts: string[] }
interface DeliveryResult { fee: number; feeFormatted: string; deliveryTime: string; isFreeDelivery: boolean; message: string; province: string }

export default function DeliveryEstimator({ orderTotal }: { orderTotal: number }) {
  const [provinces, setProvinces] = useState<ProvinceGroup[]>([])
  const [district, setDistrict] = useState('Gasabo')
  const [result, setResult] = useState<DeliveryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState(0)

  useEffect(() => {
    fetch('/api/delivery/districts').then((response) => { if (!response.ok) throw new Error(); return response.json() }).then((data) => setProvinces(data.provinces || [])).catch(() => setError('Districts could not be loaded'))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null)
    fetch(`/api/delivery/calculate?district=${encodeURIComponent(district)}&orderTotal=${orderTotal}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Delivery estimate unavailable'); return response.json() })
      .then(setResult)
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Delivery estimate unavailable') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [district, orderTotal, request])

  return (
    <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/70 to-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#B76E79] text-white"><Truck className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-[#1a1a1a]">Delivery estimator</h3><p className="text-[11px] text-gray-500">Available across all 30 Rwanda districts</p></div></div>
      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-gray-500"><MapPin className="mr-1 inline h-3.5 w-3.5" />Select your district<select value={district} onChange={(event) => setDistrict(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 focus:border-[#B76E79]">{provinces.map((group) => <optgroup key={group.province} label={group.province}>{group.districts.map((name) => <option key={name}>{name}</option>)}</optgroup>)}</select></label>
      {loading ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-white p-3 text-xs text-gray-500"><Loader2 className="h-4 w-4 animate-spin text-[#B76E79]" />Calculating delivery…</div> : error ? <button type="button" onClick={() => setRequest((value) => value + 1)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white p-3 text-xs font-bold text-red-600"><RefreshCw className="h-3.5 w-3.5" />{error}</button> : result && <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Delivery fee</p><p className={`mt-1 text-sm font-black ${result.isFreeDelivery ? 'text-emerald-600' : 'text-[#B76E79]'}`}>{result.feeFormatted}</p></div><div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Estimated time</p><p className="mt-1 flex items-center gap-1 text-xs font-bold text-gray-700"><Clock className="h-3.5 w-3.5 text-[#B76E79]" />{result.deliveryTime}</p></div><p className="col-span-2 rounded-xl bg-[#1a1a1a] px-3 py-2 text-center text-[11px] font-semibold text-white">{result.message}</p></div>}
    </section>
  )
}
