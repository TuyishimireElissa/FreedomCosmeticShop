'use client'

/**
 * Loading placeholders for product grids.
 *
 * Built on the existing `Skeleton` primitive rather than a second animated
 * div, so pulse timing and reduced-motion behaviour stay in one place.
 *
 * The proportions deliberately mirror `ProductCard`: a 4/5 image well, then
 * title, size and price lines. A skeleton that does not match the real card
 * causes a visible jump when data lands, which reads as jank on the 3G
 * connections this shop is built for.
 *
 * Accessibility: the grid is a single `role="status"` region with one label.
 * Marking each card individually would make a screen reader announce
 * "loading" six times.
 */

import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-fcs-md border border-fcs-border-subtle bg-fcs-surface-elevated ${className}`}
      aria-hidden="true"
    >
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-1 h-5 w-1/2" />
      </div>
    </div>
  )
}

interface SkeletonGridProps {
  /** Number of placeholder cards. Match the page size being fetched. */
  count?: number
  /** Announced to assistive tech while the grid is busy. */
  label: string
  className?: string
}

export function SkeletonGrid({ count = 4, label, className = '' }: SkeletonGridProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 ${className}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}
