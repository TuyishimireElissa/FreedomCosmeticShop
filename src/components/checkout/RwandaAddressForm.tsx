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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <Label htmlFor="addr-name" className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> Full Name *
        </Label>
        <Input
          id="addr-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Amina Uwase"
          className="mt-1"
        />
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="addr-phone" className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" /> Phone Number *
        </Label>
        <Input
          id="addr-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+250 780 000 001"
          className="mt-1"
        />
      </div>

      {/* Province */}
      <div>
        <Label htmlFor="addr-province" className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Province *
        </Label>
        <Select value={province} onValueChange={setProvince}>
          <SelectTrigger id="addr-province" className="mt-1">
            <SelectValue placeholder="Select province" />
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
        <Label htmlFor="addr-district" className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> District *
        </Label>
        <Select
          value={district}
          onValueChange={(v) => {
            setDistrict(v)
            setSector("")
          }}
          disabled={!province}
        >
          <SelectTrigger id="addr-district" className="mt-1">
            <SelectValue placeholder={province ? "Select district" : "Select province first"} />
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
        <Label htmlFor="addr-sector">Sector</Label>
        <Select value={sector} onValueChange={setSector} disabled={!district}>
          <SelectTrigger id="addr-sector" className="mt-1">
            <SelectValue placeholder={district ? "Select sector" : "Select district first"} />
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
        <Label htmlFor="addr-cell">Cell (optional)</Label>
        <Input
          id="addr-cell"
          value={cell}
          onChange={(e) => setCell(e.target.value)}
          placeholder="e.g., Akabuye"
          className="mt-1"
        />
      </div>

      {/* Landmark / Street */}
      <div>
        <Label htmlFor="addr-landmark" className="flex items-center gap-1.5">
          <Landmark className="h-3.5 w-3.5" /> Landmark / Street *
        </Label>
        <Input
          id="addr-landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="Near KCT Building"
          className="mt-1"
        />
      </div>

      {/* Additional Notes */}
      <div>
        <Label htmlFor="addr-notes" className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> Additional Notes
        </Label>
        <Textarea
          id="addr-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Call when you arrive"
          rows={2}
          className="mt-1"
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
            💾 Save this address for future orders
          </Label>
        </div>
      )}

      {/* Save button (optional) */}
      {onSave && (
        <Button onClick={handleSubmit} className="w-full" size="lg">
          <Save className="mr-2 h-4 w-4" /> Save Address
        </Button>
      )}
    </div>
  )
}
