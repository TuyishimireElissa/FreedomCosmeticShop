"use client"

/**
 * DeliveryFeeCard — displays delivery fee info based on selected district.
 *
 * Shows:
 *   - When no district: "Select your district"
 *   - When Kigali: "Same Day Delivery" + fee + time + free delivery progress
 *   - When province: "Standard Delivery" + fee + time
 *   - When free delivery: "🎉 FREE DELIVERY!" with strikethrough fee
 *
 * Usage:
 *   <DeliveryFeeCard district="Gasabo" orderTotal={25000} />
 */

import { useDeliveryFee } from "@/hooks/useDelivery"
import { Skeleton } from "@/components/ui/skeleton"
import { Truck, Clock, CheckCircle2, Sparkles } from "lucide-react"
import { useT } from '@/lib/i18n/LanguageContext'

interface DeliveryFeeCardProps {
  district: string | null
  orderTotal: number
  className?: string
}

export function DeliveryFeeCard({ district, orderTotal, className = "" }: DeliveryFeeCardProps) {
  const t = useT()
  const { calculation, loading } = useDeliveryFee(district, orderTotal)

  // No district selected
  if (!district) {
    return (
      <div className={`rounded-xl border border-dashed bg-secondary/20 p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('cart.delivery')}</p>
            <p className="text-xs text-muted-foreground">{t('checkout.select_district_for_fee')}</p>
          </div>
        </div>
      </div>
    )
  }

  // Loading
  if (loading || !calculation) {
    return <Skeleton className={`h-24 rounded-xl ${className}`} />
  }

  const isFree = calculation.isFreeDelivery
  const isSameDay = calculation.isSameDay

  return (
    <div
      className={`rounded-xl border p-4 ${
        isFree
          ? "border-emerald-300 bg-emerald-50"
          : isSameDay
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`grid h-8 w-8 place-items-center rounded-full ${isFree ? "bg-emerald-100" : "bg-secondary"}`}>
            <Truck className={`h-4 w-4 ${isFree ? "text-emerald-600" : "text-primary"}`} />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {t('checkout.delivery_to', { place: district })}
            </p>
            {isSameDay && !isFree && (
              <p className="flex items-center gap-1 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3 w-3" /> {t('delivery.kigali_same_day')}
              </p>
            )}
            {isFree && (
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Sparkles className="h-3 w-3" /> {t('delivery.free_delivery')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fee + time */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{calculation.deliveryTime}</span>
        </div>
        <div className="text-right">
          {isFree ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-muted-foreground line-through">
                {calculation.zone === "KIGALI_SAME_DAY" ? "1,000 RWF" : "3,000 RWF"}
              </span>
              <span className="text-lg font-bold text-emerald-600">{t('common.free')}</span>
            </div>
          ) : (
            <span className="text-lg font-bold">{calculation.feeFormatted}</span>
          )}
        </div>
      </div>

      {/* Free delivery progress */}
      {!isFree && calculation.amountNeededForFree > 0 && (
        <div className="mt-3 rounded-lg bg-primary/5 p-2 text-center">
          <p className="text-xs text-primary">
            {t('delivery.spend_more', { amount: calculation.amountNeededForFree.toLocaleString() })}
          </p>
        </div>
      )}

      {/* Same-day cutoff note */}
      {isSameDay && !isFree && (
        <p className="mt-2 text-xs text-muted-foreground">
          ⏰ {t('delivery.cutoff')}
        </p>
      )}
    </div>
  )
}
