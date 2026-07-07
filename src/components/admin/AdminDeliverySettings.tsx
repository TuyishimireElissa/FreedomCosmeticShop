"use client"

/**
 * AdminDeliverySettings — delivery zone fee management for admin dashboard.
 *
 * Shows all 6 delivery zones with editable fees, thresholds, and same-day settings.
 * Uses /api/admin/delivery-zones for data + updates.
 *
 * Usage:
 *   <AdminDeliverySettings />
 */

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Truck, Save, Loader2, CheckCircle2, Clock } from "lucide-react"

interface Zone {
  name: string
  code: string
  districts: string[]
  fee: number
  baseFee: number
  deliveryTime: string
  isSameDay: boolean
  estimatedDays: number
  freeThreshold: number
  sameDayCutoff: string | null
  isActive: boolean
}

export function AdminDeliverySettings() {
  const { toast } = useToast()
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null) // zoneCode being saved

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/delivery-zones")
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setZones(data.zones || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async (zone: Zone) => {
    setSaving(zone.code)
    try {
      const res = await fetch("/api/admin/delivery-zones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoneCode: zone.code,
          baseFee: zone.baseFee,
          freeThreshold: zone.freeThreshold,
          estimatedDays: zone.estimatedDays,
          isSameDay: zone.isSameDay,
          sameDayCutoff: zone.sameDayCutoff,
          isActive: zone.isActive,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Zone updated", description: zone.name })
      load()
    } catch {
      toast({ title: "Update failed", variant: "destructive" })
    } finally {
      setSaving(null)
    }
  }

  const updateZone = (code: string, field: keyof Zone, value: unknown) => {
    setZones((prev) =>
      prev.map((z) => (z.code === code ? { ...z, [field]: value } : z))
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Truck className="h-5 w-5 text-primary" /> Delivery Zone Management
        </h3>
        <p className="text-sm text-muted-foreground">
          Set delivery fees, free delivery thresholds, and same-day options per zone.
        </p>
      </div>

      {zones.map((zone) => (
        <div key={zone.code} className="rounded-xl border bg-card p-4">
          {/* Zone header */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{zone.name}</h4>
                {zone.isSameDay && (
                  <Badge className="bg-primary/10 text-xs text-primary">
                    <Clock className="mr-1 h-3 w-3" /> Same Day
                  </Badge>
                )}
                {!zone.isActive && (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {zone.districts.join(", ")}
              </p>
            </div>
            <Switch
              checked={zone.isActive}
              onCheckedChange={(v) => updateZone(zone.code, "isActive", v)}
            />
          </div>

          {/* Zone settings */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Fee */}
            <div>
              <Label htmlFor={`fee-${zone.code}`} className="text-xs">Fee (RWF)</Label>
              <Input
                id={`fee-${zone.code}`}
                type="number"
                value={zone.baseFee}
                onChange={(e) => updateZone(zone.code, "baseFee", Number(e.target.value))}
                className="mt-1"
              />
            </div>

            {/* Free threshold */}
            <div>
              <Label htmlFor={`threshold-${zone.code}`} className="text-xs">Free threshold (RWF)</Label>
              <Input
                id={`threshold-${zone.code}`}
                type="number"
                value={zone.freeThreshold}
                onChange={(e) => updateZone(zone.code, "freeThreshold", Number(e.target.value))}
                className="mt-1"
              />
            </div>

            {/* Estimated days */}
            <div>
              <Label htmlFor={`days-${zone.code}`} className="text-xs">Est. days</Label>
              <Input
                id={`days-${zone.code}`}
                type="number"
                value={zone.estimatedDays}
                onChange={(e) => updateZone(zone.code, "estimatedDays", Number(e.target.value))}
                className="mt-1"
              />
            </div>

            {/* Same-day cutoff */}
            {zone.isSameDay && (
              <div>
                <Label htmlFor={`cutoff-${zone.code}`} className="text-xs">Cutoff (HH:MM)</Label>
                <Input
                  id={`cutoff-${zone.code}`}
                  type="text"
                  value={zone.sameDayCutoff || "14:00"}
                  onChange={(e) => updateZone(zone.code, "sameDayCutoff", e.target.value)}
                  className="mt-1"
                  placeholder="14:00"
                />
              </div>
            )}
          </div>

          {/* Same-day toggle */}
          <div className="mt-3 flex items-center gap-2">
            <Switch
              checked={zone.isSameDay}
              onCheckedChange={(v) => updateZone(zone.code, "isSameDay", v)}
            />
            <Label className="text-sm font-normal">Enable same-day delivery</Label>
          </div>

          {/* Save button */}
          <Button
            size="sm"
            className="mt-3"
            onClick={() => handleSave(zone)}
            disabled={saving === zone.code}
          >
            {saving === zone.code ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      ))}
    </div>
  )
}
