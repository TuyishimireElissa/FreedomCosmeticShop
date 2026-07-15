"use client"

/**
 * RwandaAddressForm — reusable address form with province/district/sector cascading dropdowns.
 *
 * Features:
 *   - Province dropdown (5 provinces)
 *   - District dropdown (auto-filtered by province)
 *   - Sector dropdown (auto-filtered by district)
 *   - Full name + phone + landmark + notes
 *   - "Save this address" checkbox
 *   - Auto-calculates delivery fee when district changes
 *
 * This is a REUSABLE component — the existing CheckoutView.tsx already has
 * its own delivery form. This component can be used in account settings,
 * or as a drop-in replacement.
 *
 * Usage:
 *   <RwandaAddressForm
 *     onDistrictChange={(district) => setDistrict(district)}
 *     onSave={(address) => saveAddress(address)}
 *   />
 */

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRwandaDistricts, useDistrictSectors } from "@/hooks/useDelivery"
import { RWANDA_PROVINCES } from "@/lib/rwanda-locations"
import { User, Phone, MapPin, Landmark, MessageSquare, Save } from "lucide-react"
import { useT } from '@/lib/i18n/LanguageContext'

export interface RwandaAddressData {
  fullName: string
  phone: string
  province: string
  district: string
  sector: string
  cell?: string
  landmark?: string
  notes?: string
  saveAddress?: boolean
}

interface RwandaAddressFormProps {
  initialData?: Partial<RwandaAddressData>
  onDistrictChange?: (district: string, province: string) => void
  onSave?: (data: RwandaAddressData) => void
  showSaveCheckbox?: boolean
  className?: string
}

export function RwandaAddressForm({
  initialData,
  onDistrictChange,
  onSave,
  showSaveCheckbox = true,
  className = "",
}: RwandaAddressFormProps) {
  const t = useT()
  const [fullName, setFullName] = useState(initialData?.fullName || "")
  const [phone, setPhone] = useState(initialData?.phone || "")
  const [province, setProvince] = useState(initialData?.province || "")
  const [district, setDistrict] = useState(initialData?.district || "")
  const [sector, setSector] = useState(initialData?.sector || "")
  const [cell, setCell] = useState(initialData?.cell || "")
  const [landmark, setLandmark] = useState(initialData?.landmark || "")
  const [notes, setNotes] = useState(initialData?.notes || "")
  const [saveAddress, setSaveAddress] = useState(false)

  const { data: districtsData } = useRwandaDistricts()
  const { sectors } = useDistrictSectors(district || null)

  // Get districts for selected province
  const availableDistricts = districtsData?.provinces.find(
    (p) => p.province === province
  )?.districts || []

  // Reset district when province changes
  useEffect(() => {
    if (province && district && !availableDistricts.includes(district)) {
      setDistrict("")
      setSector("")
    }
  }, [province, district, availableDistricts])

  // Notify parent when district changes
  useEffect(() => {
    if (district && onDistrictChange) {
      onDistrictChange(district, province)
    }
  }, [district, province, onDistrictChange])

  const handleSubmit = () => {
    onSave?.({
      fullName,
      phone,
      province,
      district,
      sector,
      cell: cell || undefined,
      landmark: landmark || undefined,
      notes: notes || undefined,
      saveAddress,
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Full Name */}
      <div>
        <Label htmlFor="addr-name" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <User className="h-3.5 w-3.5" /> {t('checkout.full_name')} *
        </Label>
        <Input
          id="addr-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('checkout.full_name_sample')}
          className="mt-1 min-h-12 text-base"
        />
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="addr-phone" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Phone className="h-3.5 w-3.5" /> {t('checkout.phone')} *
        </Label>
        <Input
          id="addr-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+250 780 000 001"
          className="mt-1 min-h-12 text-base"
        />
      </div>

      {/* Province */}
      <div>
        <Label htmlFor="addr-province" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <MapPin className="h-3.5 w-3.5" /> {t('checkout.province')} *
        </Label>
        <Select value={province} onValueChange={setProvince}>
          <SelectTrigger id="addr-province" className="mt-1 min-h-12 text-base">
            <SelectValue placeholder={t('checkout.province_select')} />
          </SelectTrigger>
          <SelectContent>
            {RWANDA_PROVINCES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* District (auto-filtered by province) */}
      <div>
        <Label htmlFor="addr-district" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <MapPin className="h-3.5 w-3.5" /> {t('checkout.district')} *
        </Label>
        <Select
          value={district}
          onValueChange={(v) => {
            setDistrict(v)
            setSector("")
          }}
          disabled={!province}
        >
          <SelectTrigger id="addr-district" className="mt-1 min-h-12 text-base">
            <SelectValue placeholder={province ? t('checkout.district_select') : t('checkout.select_province_first')} />
          </SelectTrigger>
          <SelectContent>
            {availableDistricts.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sector (auto-filtered by district) */}
      <div>
        <Label htmlFor="addr-sector" className="text-sm font-medium text-gray-700">{t('checkout.sector')}</Label>
        <Select value={sector} onValueChange={setSector} disabled={!district}>
          <SelectTrigger id="addr-sector" className="mt-1 min-h-12 text-base">
            <SelectValue placeholder={district ? t('checkout.select_sector') : t('checkout.select_district_first')} />
          </SelectTrigger>
          <SelectContent>
            {sectors.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cell */}
      <div>
        <Label htmlFor="addr-cell" className="text-sm font-medium text-gray-700">{t('checkout.cell_optional')}</Label>
        <Input
          id="addr-cell"
          value={cell}
          onChange={(e) => setCell(e.target.value)}
          placeholder={t('checkout.cell_example')}
          className="mt-1 min-h-12 text-base"
        />
      </div>

      {/* Landmark / Street */}
      <div>
        <Label htmlFor="addr-landmark" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Landmark className="h-3.5 w-3.5" /> {t('checkout.landmark')} *
        </Label>
        <Input
          id="addr-landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder={t('checkout.landmark_kct_example')}
          className="mt-1 min-h-12 text-base"
        />
      </div>

      {/* Additional Notes */}
      <div>
        <Label htmlFor="addr-notes" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <MessageSquare className="h-3.5 w-3.5" /> {t('checkout.additional_notes')}
        </Label>
        <Textarea
          id="addr-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('checkout.call_on_arrival')}
          rows={2}
          className="mt-1 min-h-12 text-base"
        />
      </div>

      {/* Save address checkbox */}
      {showSaveCheckbox && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="save-addr"
            checked={saveAddress}
            onCheckedChange={(v) => setSaveAddress(v === true)}
          />
          <Label htmlFor="save-addr" className="text-sm font-normal cursor-pointer">
            💾 {t('checkout.save_address_future')}
          </Label>
        </div>
      )}

      {/* Save button (optional) */}
      {onSave && (
        <Button onClick={handleSubmit} className="w-full" size="lg">
          <Save className="mr-2 h-4 w-4" /> {t('checkout.save_address_button')}
        </Button>
      )}
    </div>
  )
}
