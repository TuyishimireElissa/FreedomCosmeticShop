'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getVisitorSessionId } from './VisitorTracker'

/**
 * Optional, visitor-supplied location.
 *
 * IP geolocation cannot resolve sector, cell or village in Rwanda, so this
 * form is the only source for those levels. Every field is voluntary and the
 * storefront behaves identically if it is never used.
 *
 * The administrative hierarchy is fetched one level at a time, so the 362 KB
 * dataset never enters the storefront bundle.
 */

interface ProvinceMap { [province: string]: string[] }

const SELECT_CLASS =
  'custom-visitor-location__select mt-1 min-h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-base focus:border-[#B76E79] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'

export default function VisitorLocationForm() {
  const { toast } = useToast()
  const [provinces, setProvinces] = useState<ProvinceMap>({})
  const [sectors, setSectors] = useState<string[]>([])
  const [cells, setCells] = useState<string[]>([])
  const [villages, setVillages] = useState<string[]>([])

  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [sector, setSector] = useState('')
  const [cell, setCell] = useState('')
  const [village, setVillage] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    void fetch('/api/visitors/rwanda-locations')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { provinces?: ProvinceMap } | null) => {
        if (active && payload?.provinces) setProvinces(payload.provinces)
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const loadLevel = useCallback(async (query: string) => {
    try {
      const response = await fetch(`/api/visitors/rwanda-locations?${query}`)
      if (!response.ok) return null
      return (await response.json()) as { sectors?: string[]; cells?: string[]; villages?: string[] }
    } catch {
      return null
    }
  }, [])

  const onProvince = (value: string) => {
    setProvince(value); setDistrict(''); setSector(''); setCell(''); setVillage('')
    setSectors([]); setCells([]); setVillages([]); setSaved(false)
  }

  const onDistrict = async (value: string) => {
    setDistrict(value); setSector(''); setCell(''); setVillage('')
    setCells([]); setVillages([]); setSaved(false)
    setSectors(value ? (await loadLevel(`district=${encodeURIComponent(value)}`))?.sectors || [] : [])
  }

  const onSector = async (value: string) => {
    setSector(value); setCell(''); setVillage(''); setVillages([]); setSaved(false)
    setCells(value ? (await loadLevel(`district=${encodeURIComponent(district)}&sector=${encodeURIComponent(value)}`))?.cells || [] : [])
  }

  const onCell = async (value: string) => {
    setCell(value); setVillage(''); setSaved(false)
    setVillages(value
      ? (await loadLevel(`district=${encodeURIComponent(district)}&sector=${encodeURIComponent(sector)}&cell=${encodeURIComponent(value)}`))?.villages || []
      : [])
  }

  const submit = async () => {
    const sessionId = getVisitorSessionId()
    if (!sessionId) {
      toast({ title: 'Location not saved', description: 'Your browser blocked session storage.', variant: 'destructive' })
      return
    }
    if (!province || !district) {
      toast({ title: 'Choose a district', description: 'Province and district are required.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/visitors/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          province,
          district,
          sector: sector || null,
          cell: cell || null,
          village: village || null,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error === 'NO_SESSION'
          ? 'Browse the shop for a moment, then try again.'
          : 'Your location could not be saved.')
      }
      setSaved(true)
      toast({ title: 'Thank you', description: 'Your location helps us plan deliveries.' })
    } catch (error) {
      toast({
        title: 'Location not saved',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="custom-visitor-location rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="visitor-location-heading">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-[#B76E79]">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="visitor-location-heading" className="font-black text-gray-950">Share your location (optional)</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            We collect anonymous location data to improve our service and plan deliveries.
            This is optional, is never linked to your identity, and you can leave any level blank.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading districts…
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="visitor-province" className="text-sm font-semibold text-gray-700">Province</label>
            <select id="visitor-province" className={SELECT_CLASS} value={province} onChange={(event) => onProvince(event.target.value)}>
              <option value="">Select province</option>
              {Object.keys(provinces).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="visitor-district" className="text-sm font-semibold text-gray-700">District</label>
            <select id="visitor-district" className={SELECT_CLASS} value={district} disabled={!province} onChange={(event) => void onDistrict(event.target.value)}>
              <option value="">Select district</option>
              {(provinces[province] || []).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="visitor-sector" className="text-sm font-semibold text-gray-700">Sector <span className="font-normal text-gray-400">(optional)</span></label>
            <select id="visitor-sector" className={SELECT_CLASS} value={sector} disabled={!district} onChange={(event) => void onSector(event.target.value)}>
              <option value="">Select sector</option>
              {sectors.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="visitor-cell" className="text-sm font-semibold text-gray-700">Cell <span className="font-normal text-gray-400">(optional)</span></label>
            <select id="visitor-cell" className={SELECT_CLASS} value={cell} disabled={!sector} onChange={(event) => void onCell(event.target.value)}>
              <option value="">Select cell</option>
              {cells.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="visitor-village" className="text-sm font-semibold text-gray-700">Village <span className="font-normal text-gray-400">(optional)</span></label>
            <select id="visitor-village" className={SELECT_CLASS} value={village} disabled={!cell} onChange={(event) => { setVillage(event.target.value); setSaved(false) }}>
              <option value="">Select village</option>
              {villages.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving || loading || !district}
        className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 text-sm font-bold text-white transition-colors hover:bg-[#9B5A64] disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {saved ? 'Saved — update' : 'Save my location'}
      </button>
    </section>
  )
}
