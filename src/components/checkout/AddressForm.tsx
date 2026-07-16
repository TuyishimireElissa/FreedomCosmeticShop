'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Home, Mail, MapPin, Phone, Save, Share2, Star, User } from 'lucide-react'
import {
  RWANDA_DISTRICTS,
  RWANDA_PROVINCES,
  formatRwandaPhone,
  getCellsForSector,
  getProvinceByDistrict,
  getSectorsForDistrict,
  getVillagesForCell,
  type RwandaProvince,
} from '@/lib/rwanda-locations'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useStore } from '@/store/useStore'
import { buildWhatsAppShareUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'

export interface CheckoutAddress {
  fullName: string
  phone: string
  email: string
  province: RwandaProvince | ''
  district: string
  sector: string
  cell: string
  village: string
  landmark: string
  address: string
}
interface SavedAddress {
  id: string
  label: string
  recipientName: string
  recipientPhone: string
  province: RwandaProvince
  district: string
  sector: string
  cell?: string | null
  village?: string | null
  streetAddress?: string | null
  isDefault: boolean
}
interface AddressFormProps {
  value: CheckoutAddress
  onChange: (value: CheckoutAddress) => void
  errors?: Partial<Record<keyof CheckoutAddress, string>>
}

export default function AddressForm({ value, onChange, errors = {} }: AddressFormProps) {
  const { t, language } = useLanguage()
  const user = useStore((state) => state.user)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [showSaved, setShowSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const sectors = useMemo(() => getSectorsForDistrict(value.district), [value.district])
  const cells = useMemo(() => getCellsForSector(value.district, value.sector), [value.district, value.sector])
  const villages = useMemo(() => getVillagesForCell(value.district, value.sector, value.cell), [value.cell, value.district, value.sector])

  useEffect(() => {
    if (!user) { setSavedAddresses([]); return }
    const controller = new AbortController()
    fetch('/api/user/addresses', { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((result) => setSavedAddresses(result.addresses || []))
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setSavedAddresses([]) })
    return () => controller.abort()
  }, [user])

  const update = <K extends keyof CheckoutAddress>(key: K, fieldValue: CheckoutAddress[K]) => onChange({ ...value, [key]: fieldValue })
  const changeProvince = (province: RwandaProvince | '') => onChange({ ...value, province, district: '', sector: '', cell: '', village: '' })
  const changeDistrict = (district: string) => onChange({ ...value, province: getProvinceByDistrict(district) || value.province, district, sector: '', cell: '', village: '' })
  const changeSector = (sector: string) => onChange({ ...value, sector, cell: '', village: '' })
  const changeCell = (cell: string) => onChange({ ...value, cell, village: '' })
  const applySaved = (address: SavedAddress) => {
    onChange({ fullName: address.recipientName, phone: formatRwandaPhone(address.recipientPhone), email: value.email, province: address.province, district: address.district, sector: address.sector, cell: address.cell || '', village: address.village || '', landmark: '', address: address.streetAddress || '' })
    setShowSaved(false)
  }
  const saveAddress = async () => {
    if (!user || !value.fullName.trim() || !value.district || !value.sector || !value.cell || !value.village) return
    setSaving(true); setSaved(false)
    try {
      const response = await fetch('/api/user/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: t('checkout.address_home_label'), recipientName: value.fullName.trim(), recipientPhone: value.phone, province: value.province, district: value.district, sector: value.sector, cell: value.cell, village: value.village, streetAddress: [value.landmark, value.address].filter(Boolean).join(' — '), isDefault: savedAddresses.length === 0 }) })
      if (!response.ok) throw new Error()
      const result = await response.json()
      setSavedAddresses((current) => [result.address, ...current.filter((address) => address.id !== result.address.id)])
      setSaved(true)
    } catch { setSaved(false) }
    finally { setSaving(false) }
  }
  const shareLocation = () => {
    const message = t('checkout.whatsapp_location_message', { name: value.fullName, province: value.province, district: value.district, sector: value.sector, cell: value.cell, village: value.village, landmark: value.landmark || value.address })
    window.open(buildWhatsAppShareUrl(message), '_blank', 'noopener,noreferrer')
    trackWhatsAppClick('delivery_inquiry', { district: value.district, language: language === 'en' ? 'en' : 'rw', pagePath: '/checkout' })
  }

  return <div className="space-y-5">
    {user && savedAddresses.length > 0 && <section className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3"><button type="button" onClick={() => setShowSaved((open) => !open)} className="flex min-h-12 w-full items-center gap-2 rounded-xl px-2 text-left text-sm font-bold text-[#B76E79]"><Home className="h-4 w-4" />{t('checkout.use_saved_count', { count: savedAddresses.length })}<ChevronDown className={`ml-auto h-4 w-4 transition-transform ${showSaved ? 'rotate-180' : ''}`} /></button>{showSaved && <div className="mt-2 space-y-2">{savedAddresses.map((address) => <button type="button" key={address.id} onClick={() => applySaved(address)} className="flex min-h-[60px] w-full items-start gap-3 rounded-xl bg-white p-3 text-left shadow-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B76E79]" /><span className="min-w-0 flex-1"><span className="flex items-center gap-1 text-sm font-black">{address.label}{address.isDefault && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}</span><span className="block text-xs text-gray-500">{address.recipientName} · {address.village}, {address.cell}, {address.district}</span></span></button>)}</div>}</section>}

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t('checkout.full_name')} error={errors.fullName}><div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={value.fullName} onChange={(event) => update('fullName', event.target.value)} placeholder={t('checkout.full_name_example')} autoComplete="name" className="input-field min-h-12 pl-10 text-base" /></div></Field>
      <Field label={t('checkout.phone_rwanda')} error={errors.phone}><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="tel" value={value.phone} onChange={(event) => update('phone', formatRwandaPhone(event.target.value))} placeholder="+250 78X XXX XXX" autoComplete="tel" inputMode="tel" className="input-field min-h-12 pl-10 text-base" /></div><span className="mt-1 block text-xs text-gray-400">{t('checkout.phone_format_hint')}</span></Field>
    </div>
    <Field label={t('checkout.email_optional')} error={errors.email}><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="email" value={value.email} onChange={(event) => update('email', event.target.value)} placeholder="name@example.com" autoComplete="email" inputMode="email" className="input-field min-h-12 pl-10 text-base" /></div></Field>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t('checkout.province')} error={errors.province}><select value={value.province} onChange={(event) => changeProvince(event.target.value as RwandaProvince | '')} className="input-field min-h-12 appearance-none text-base"><option value="">{t('checkout.province_select')}</option>{RWANDA_PROVINCES.map((province) => <option key={province}>{province}</option>)}</select></Field>
      <Field label={t('checkout.district')} error={errors.district}><select value={value.district} onChange={(event) => changeDistrict(event.target.value)} disabled={!value.province} className="input-field min-h-12 appearance-none text-base disabled:bg-gray-100"><option value="">{value.province ? t('checkout.district_select') : t('checkout.select_province_first')}</option>{value.province && RWANDA_DISTRICTS[value.province].map((district) => <option key={district}>{district}</option>)}</select></Field>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <Field label={t('checkout.sector_required')} error={errors.sector}><select value={value.sector} onChange={(event) => changeSector(event.target.value)} disabled={!value.district} className="input-field min-h-12 appearance-none text-base disabled:bg-gray-100"><option value="">{value.district ? t('checkout.select_sector') : t('checkout.select_district_first')}</option>{sectors.map((sector) => <option key={sector}>{sector}</option>)}</select></Field>
      <Field label={t('checkout.cell_required')} error={errors.cell}><select value={value.cell} onChange={(event) => changeCell(event.target.value)} disabled={!value.sector} className="input-field min-h-12 appearance-none text-base disabled:bg-gray-100"><option value="">{value.sector ? t('checkout.select_cell') : t('checkout.select_sector_first')}</option>{cells.map((cell) => <option key={cell}>{cell}</option>)}</select></Field>
      <Field label={t('checkout.village_required')} error={errors.village}><select value={value.village} onChange={(event) => update('village', event.target.value)} disabled={!value.cell} className="input-field min-h-12 appearance-none text-base disabled:bg-gray-100"><option value="">{value.cell ? t('checkout.select_village') : t('checkout.select_cell_first')}</option>{villages.map((village) => <option key={village}>{village}</option>)}</select></Field>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t('checkout.landmark')}><input value={value.landmark} onChange={(event) => update('landmark', event.target.value)} placeholder={t('checkout.landmark_kct_example')} className="input-field min-h-12 text-base" /></Field>
      <Field label={t('checkout.street_delivery_details')} error={errors.address}><textarea value={value.address} onChange={(event) => update('address', event.target.value)} placeholder={t('checkout.address_directions_placeholder')} rows={2} className="input-field min-h-12 resize-none text-base" /></Field>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {user && <button type="button" onClick={saveAddress} disabled={saving || !value.village} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-rose-100 font-bold text-[#B76E79] disabled:opacity-40">{saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saving ? t('common.loading') : saved ? t('checkout.address_saved') : t('checkout.save_address_button')}</button>}
      <button type="button" onClick={shareLocation} disabled={!value.village} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-50 font-bold text-green-700 disabled:opacity-40"><Share2 className="h-4 w-4" />{t('checkout.whatsapp_location')}</button>
    </div>
    <div className="rounded-2xl bg-[#f8f9fa] p-4 text-xs leading-5 text-gray-500"><strong className="text-gray-700">{t('checkout.all_rwanda_covered')}</strong> {t('checkout.district_coverage')}</div>
  </div>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-gray-700">{label}</span>{children}{error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}</label>
}
