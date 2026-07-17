'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  label: string
  icon: ReactNode
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
  label,
  icon,
  variant = 'default',
  size = 'md',
  className,
  title,
  type = 'button',
  ...props
}, ref) {
  const sizeClasses = {
    sm: 'h-11 w-11 p-2.5',
    md: 'h-11 w-11 p-2.5',
    lg: 'h-12 w-12 p-3',
  }
  const variantClasses = {
    default: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
    primary: 'bg-[#B76E79] text-white hover:bg-[#a55d68] active:bg-[#8f4f59]',
    danger: 'text-red-700 hover:bg-red-50 active:bg-red-100',
    ghost: 'text-gray-600 hover:bg-gray-50 hover:text-gray-950 active:bg-gray-100',
  }

  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title || label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  )
})

export default IconButton
