'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useLowData } from '@/contexts/LowDataContext'

interface LayoutShiftEntry extends PerformanceEntry {
  value?: number
  hadRecentInput?: boolean
}

interface PerformanceSnapshot {
  route: string
  lowData: boolean
  connectionType: string
  resourceCount: number
  transferredBytes: number
  encodedBytes: number
  imageResources: number
  domImages: number
  largestContentfulPaintMs: number | null
  cumulativeLayoutShift: number
  longTasks: number
  capturedAt: string
}

export default function PerformanceMonitor() {
  const pathname = usePathname()
  const { connectionType, isLowData } = useLowData()
  const largestContentfulPaint = useRef<number | null>(null)
  const cumulativeLayoutShift = useRef(0)
  const longTasks = useRef(0)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || typeof PerformanceObserver === 'undefined') return

    const observers: PerformanceObserver[] = []
    const observe = (type: string, callback: (entry: PerformanceEntry) => void) => {
      try {
        const observer = new PerformanceObserver((list) => list.getEntries().forEach(callback))
        observer.observe({ type, buffered: true })
        observers.push(observer)
      } catch {
        // The browser does not support this performance entry type.
      }
    }

    observe('largest-contentful-paint', (entry) => {
      largestContentfulPaint.current = Math.round(entry.startTime)
    })
    observe('layout-shift', (entry) => {
      const shift = entry as LayoutShiftEntry
      if (!shift.hadRecentInput) cumulativeLayoutShift.current += shift.value || 0
    })
    observe('longtask', () => {
      longTasks.current += 1
    })

    return () => observers.forEach((observer) => observer.disconnect())
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const timer = globalThis.setTimeout(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const snapshot: PerformanceSnapshot = {
        route: pathname,
        lowData: isLowData,
        connectionType,
        resourceCount: resources.length,
        transferredBytes: resources.reduce((total, resource) => total + (resource.transferSize || 0), 0),
        encodedBytes: resources.reduce((total, resource) => total + (resource.encodedBodySize || 0), 0),
        imageResources: resources.filter((resource) => resource.initiatorType === 'img').length,
        domImages: document.images.length,
        largestContentfulPaintMs: largestContentfulPaint.current,
        cumulativeLayoutShift: Number(cumulativeLayoutShift.current.toFixed(4)),
        longTasks: longTasks.current,
        capturedAt: new Date().toISOString(),
      }

      console.info('[FCS development performance snapshot]', snapshot)
    }, 2500)

    return () => globalThis.clearTimeout(timer)
  }, [connectionType, isLowData, pathname])

  return null
}
