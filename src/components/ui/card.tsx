import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Umweto card primitive.
 *
 * Created rather than extended: this project had no card.tsx, so card markup
 * was repeated inline across components. Variants use the fcs-* token layer so
 * surfaces stay consistent with the deployed design system.
 */
const VARIANTS = {
  default: 'bg-white border border-fcs-border shadow-fcs-1',
  // Warm lift on hover; the transform is dropped under reduced motion.
  'fcs-product':
    'bg-white border border-fcs-border shadow-fcs-1 transition-[transform,box-shadow] duration-300 ease-out hover:shadow-fcs-glow-rose motion-safe:hover:-translate-y-1 motion-reduce:transition-none',
  'fcs-surface': 'bg-fcs-surface border border-fcs-border',
  'fcs-editorial': 'bg-fcs-surface border border-fcs-border shadow-fcs-2',
} as const

export type CardVariant = keyof typeof VARIANTS

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }>(
  function Card({ className, variant = 'default', ...props }, ref) {
    return <div ref={ref} className={cn('rounded-fcs-lg', VARIANTS[variant], className)} {...props} />
  },
)

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  },
)

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return <h3 ref={ref} className={cn('font-display text-2xl font-normal leading-tight text-fcs-text', className)} {...props} />
  },
)

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  },
)

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  },
)

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
