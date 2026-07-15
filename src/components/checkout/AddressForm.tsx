'use client'

import { MapPin, Phone, User } from 'lucide-react'
import { RWANDA_DISTRICTS, RWANDA_PROVINCES, RWANDA_SECTORS, type RwandaProvince } from '@/lib/rwanda-locations'
import { useT } from '@/lib/i18n/LanguageContext'

export interface CheckoutAddress {
  fullName: string
  phone: string
  province: RwandaProvince
  district: string
  sector: string
  landmark: string
  address: string
}

interface AddressFormProps {
  value: CheckoutAddress
  onChange: (value: CheckoutAddress) => void
  errors?: Partial<Record<keyof CheckoutAddress, string>>
}

export default function AddressForm({ value, onChange, errors = {} }: AddressFormProps) {
  const t = useT()
  const update = <K extends keyof CheckoutAddress>(key: K, fieldValue: CheckoutAddress[K]) => onChange({ ...value, [key]: fieldValue })
  const changeProvince = (province: RwandaProvince) => {
    const district = RWANDA_DISTRICTS[province][0]
    onChange({ ...value, province, district, sector: RWANDA_SECTORS[district]?.[0] || '' })
  }
  const changeDistrict = (district: string) => onChange({ ...value, district, sector: RWANDA_SECTORS[district]?.[0] || '' })

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('checkout.full_name')} error={errors.fullName}><div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={value.fullName} onChange={(event) => update('fullName', event.target.value)} placeholder={t('checkout.full_name_example')} autoComplete="name" className="input-field pl-10" /></div></Field>
        <Field label={t('checkout.phone_rwanda')} error={errors.phone}><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="tel" value={value.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+250 78X XXX XXX" autoComplete="tel" className="input-field pl-10" /></div></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('checkout.province')} error={errors.province}><select value={value.province} onChange={(event) => changeProvince(event.target.value as RwandaProvince)} className="input-field appearance-none">{RWANDA_PROVINCES.map((province) => <option key={province}>{province}</option>)}</select></Field>
        <Field label={t('checkout.district')} error={errors.district}><select value={value.district} onChange={(event) => changeDistrict(event.target.value)} className="input-field appearance-none">{RWANDA_DISTRICTS[value.province].map((district) => <option key={district}>{district}</option>)}</select></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('checkout.sector_required')} error={errors.sector}>{RWANDA_SECTORS[value.district]?.length ? <select value={value.sector} onChange={(event) => update('sector', event.target.value)} className="input-field appearance-none">{RWANDA_SECTORS[value.district].map((sector) => <option key={sector}>{sector}</option>)}</select> : <input value={value.sector} onChange={(event) => update('sector', event.target.value)} placeholder={t('checkout.sector_placeholder')} className="input-field appearance-none" />}</Field>
        <Field label={t('checkout.landmark')}><input value={value.landmark} onChange={(event) => update('landmark', event.target.value)} placeholder={t('checkout.landmark_example')} className="input-field appearance-none" /></Field>
      </div>

      <Field label={t('checkout.street_delivery_details')} error={errors.address}><div className="relative"><MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><textarea value={value.address} onChange={(event) => update('address', event.target.value)} placeholder={t('checkout.address_directions_placeholder')} rows={3} className="input-field resize-none pl-10" /></div></Field>

      <div className="rounded-2xl bg-[#f8f9fa] p-4 text-xs leading-5 text-gray-500"><strong className="text-gray-700">{t('checkout.all_rwanda_covered')}</strong> {t('checkout.district_coverage')}</div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-gray-700">{label}</span>{children}{error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}</label>
}
