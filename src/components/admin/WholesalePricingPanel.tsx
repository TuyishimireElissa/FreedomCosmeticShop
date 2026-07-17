"use client"

/**
 * WholesalePricingPanel — admin component for managing wholesale pricing tiers.
 *
 * Section 3: Product Pricing Management
 *
 * Features:
 *   - Toggle wholesale pricing on/off per product
 *   - Set minimum wholesale quantity
 *   - Edit/add/remove price tiers (minQty, maxQty, pricePerUnit, discount%)
 *   - Live profit calculator (cost vs retail vs wholesale)
 *   - Save to /api/admin/products/[id]/pricing
 *
 * Used inside AdminProductManager's edit dialog.
 */

import { useState, useEffect, useCallback } from "react"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  TrendingDown,
  Percent,
} from "lucide-react"

interface Tier {
  id?: string
  tierName: string
  minQuantity: number
  maxQuantity: number | null
  pricePerUnit: number
  discountPercent: number
}

interface ProductInfo {
  id: string
  name: string
  retailPrice: number
  costPrice: number | null
  wholesaleActive: boolean
  minWholesaleQty: number
}

interface WholesalePricingPanelProps {
  productId: string
  onClose?: () => void
}

export function WholesalePricingPanel({ productId, onClose }: WholesalePricingPanelProps) {
  const { toast } = useToast()
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [wholesaleActive, setWholesaleActive] = useState(false)
  const [minWholesaleQty, setMinWholesaleQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/pricing`)
      if (!res.ok) return
      const data = await res.json()
      setProduct(data.product)
      setTiers(data.tiers.map((t: Tier) => ({
        ...t,
        maxQuantity: t.maxQuantity ?? null,
      })))
      setWholesaleActive(data.product.wholesaleActive)
      setMinWholesaleQty(data.product.minWholesaleQty)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    load()
  }, [load])

  const updateTier = (index: number, field: keyof Tier, value: string | number | null) => {
    setTiers((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t
        const updated = { ...t, [field]: value }

        // Auto-calculate discount % from price, or price from discount %
        if (field === "pricePerUnit" && product) {
          const numValue = Number(value)
          if (!isNaN(numValue) && product.retailPrice > 0) {
            updated.discountPercent = Math.round(
              ((product.retailPrice - numValue) / product.retailPrice) * 100
            )
          }
          // Auto-generate tier name
          updated.tierName = updated.minQuantity === 1 ? "Retail" : `Buy ${updated.minQuantity}+`
        }
        if (field === "discountPercent" && product) {
          const numValue = Number(value)
          if (!isNaN(numValue)) {
            updated.pricePerUnit = Math.round(
              product.retailPrice * (1 - numValue / 100)
            )
          }
        }
        if (field === "minQuantity") {
          const numValue = Number(value)
          updated.tierName = numValue === 1 ? "Retail" : `Buy ${numValue}+`
        }

        return updated
      })
    )
  }

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1]
    const newMin = lastTier
      ? (lastTier.maxQuantity ? lastTier.maxQuantity + 1 : lastTier.minQuantity + 1)
      : minWholesaleQty
    setTiers((prev) => [
      ...prev,
      {
        tierName: `Buy ${newMin}+`,
        minQuantity: newMin,
        maxQuantity: null,
        pricePerUnit: product?.retailPrice || 0,
        discountPercent: 0,
      },
    ])
  }

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/pricing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wholesaleActive,
          minWholesaleQty,
          tiers: tiers.map((t) => ({
            tierName: t.tierName,
            minQuantity: t.minQuantity,
            maxQuantity: t.maxQuantity,
            pricePerUnit: t.pricePerUnit,
            discountPercent: t.discountPercent,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Save failed")
      toast({ title: "✅ Wholesale pricing saved", description: `${tiers.length} tiers configured` })
      onClose?.()
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Profit calculations
  const costPrice = product?.costPrice || 0
  const retailProfit = product ? product.retailPrice - costPrice : 0
  const retailProfitPct = product && product.retailPrice > 0
    ? Math.round((retailProfit / product.retailPrice) * 100)
    : 0
  const lowestWholesale = tiers.length > 0
    ? Math.min(...tiers.map((t) => t.pricePerUnit))
    : 0
  const wholesaleProfit = lowestWholesale - costPrice
  const wholesaleProfitPct = lowestWholesale > 0
    ? Math.round((wholesaleProfit / lowestWholesale) * 100)
    : 0

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!product) {
    return <p className="text-sm text-muted-foreground">Product not found.</p>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={wholesaleActive}
            onCheckedChange={setWholesaleActive}
          />
          <div>
            <p className="text-sm font-semibold">Wholesale Pricing {wholesaleActive ? "Enabled" : "Disabled"}</p>
            <p className="text-xs text-muted-foreground">{product.name}</p>
          </div>
        </div>
      </div>

      {/* Min wholesale qty */}
      <div>
        <Label htmlFor="min-wholesale-qty" className="text-xs">
          Minimum Wholesale Quantity
        </Label>
        <Input
          id="min-wholesale-qty"
          type="number"
          min={1}
          value={minWholesaleQty}
          onChange={(e) => setMinWholesaleQty(Number(e.target.value))}
          className="mt-1 h-9"
        />
      </div>

      {/* Price tiers */}
      <div className="rounded-lg border p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Price Tiers ({tiers.length})
          </p>
          <Button size="sm" variant="ghost" onClick={addTier} className="h-7 text-xs">
            <Plus className="mr-1 h-3 w-3" /> Add Tier
          </Button>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_80px_100px_80px_32px] gap-2 px-1 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Tier Name</span>
          <span className="text-center">Min Qty</span>
          <span className="text-center">Max Qty</span>
          <span className="text-center">Price (RWF)</span>
          <span className="text-center">Disc %</span>
          <span></span>
        </div>

        {/* Tier rows */}
        <div className="space-y-1">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_80px_80px_100px_80px_32px] items-center gap-2 rounded-md border p-1.5"
            >
              <Input
                value={tier.tierName}
                onChange={(e) => updateTier(i, "tierName", e.target.value)}
                className="h-8 text-xs"
                placeholder="Buy 6+"
              />
              <Input
                type="number"
                value={tier.minQuantity}
                onChange={(e) => updateTier(i, "minQuantity", Number(e.target.value))}
                className="h-8 text-center text-xs"
                min={1}
              />
              <Input
                type="number"
                value={tier.maxQuantity ?? ""}
                onChange={(e) => updateTier(i, "maxQuantity", e.target.value ? Number(e.target.value) : null)}
                className="h-8 text-center text-xs"
                placeholder="∞"
              />
              <Input
                type="number"
                value={tier.pricePerUnit}
                onChange={(e) => updateTier(i, "pricePerUnit", Number(e.target.value))}
                className="h-8 text-center text-xs"
              />
              <div className="flex items-center justify-center gap-0.5">
                <Input
                  type="number"
                  value={tier.discountPercent}
                  onChange={(e) => updateTier(i, "discountPercent", Number(e.target.value))}
                  className="h-8 w-12 text-center text-xs"
                  min={0}
                  max={100}
                />
                <Percent className="h-3 w-3 text-muted-foreground" />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={() => removeTier(i)}
                disabled={tiers.length <= 1}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Profit Calculator */}
      <div className="rounded-lg border border-secondary bg-secondary/20 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingDown className="h-3.5 w-3.5" />
          Profit Calculator
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Cost Price</p>
            <p className="font-bold">{formatRWF(costPrice)}</p>
          </div>
          <div className="rounded-md bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Retail Profit</p>
            <p className="font-bold text-emerald-600">{formatRWF(retailProfit)}</p>
            <p className="text-[10px] text-muted-foreground">({retailProfitPct}% margin)</p>
          </div>
          <div className="rounded-md bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Wholesale Min Profit</p>
            <p className={`font-bold ${wholesaleProfit >= 0 ? "text-amber-600" : "text-red-600"}`}>
              {formatRWF(wholesaleProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground">({wholesaleProfitPct}% margin)</p>
          </div>
        </div>
        {wholesaleProfit < 0 && (
          <p className="mt-2 rounded bg-red-50 p-2 text-[10px] text-red-700">
            ⚠️ Warning: Lowest wholesale price is below cost price. You are losing {formatRWF(Math.abs(wholesaleProfit))} per unit.
          </p>
        )}
      </div>

      {/* Save */}
      <Button
        className="w-full"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Wholesale Pricing
      </Button>
    </div>
  )
}
