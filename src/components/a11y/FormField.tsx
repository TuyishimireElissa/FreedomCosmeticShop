'use client'

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  labelRw?: string
  error?: string
  hint?: string
  language?: 'en' | 'rw'
  wrapperClassName?: string
  inputClassName?: string
  startAdornment?: ReactNode
  endAdornment?: ReactNode
  labelExtra?: ReactNode
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField({
  label,
  labelRw,
  error,
  hint,
  required,
  language,
  id,
  className,
  wrapperClassName,
  inputClassName,
  startAdornment,
  endAdornment,
  labelExtra,
  'aria-describedby': externalDescription,
  ...props
}, ref) {
  const uid = useId()
  const { language: activeLanguage, t } = useLanguage()
  const inputId = id || `field-${uid.replaceAll(':', '')}`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const displayLanguage = language || (activeLanguage === 'rw' ? 'rw' : 'en')
  const displayLabel = displayLanguage === 'rw' && labelRw ? labelRw : label
  const describedBy = [externalDescription, hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      <div className="flex min-h-6 items-start justify-between gap-3">
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-900">
          {displayLabel}
          {required && (
            <>
              <span className="ml-1 text-red-700" aria-hidden="true">*</span>
              <span className="sr-only"> {t('accessibility.required')}</span>
            </>
          )}
        </label>
        {labelExtra}
      </div>
      {hint && <p id={hintId} className="text-xs leading-5 text-gray-600">{hint}</p>}
      <div className="relative">
        {startAdornment && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center" aria-hidden="true">{startAdornment}</span>}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-errormessage={error ? errorId : undefined}
          className={cn(
            'input-field',
            startAdornment && 'pl-10',
            endAdornment && 'pr-12',
            error && 'border-red-600 focus:border-red-700',
            inputClassName,
            className,
          )}
          {...props}
        />
        {endAdornment && <span className="absolute inset-y-0 right-0 flex items-center">{endAdornment}</span>}
      </div>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-semibold text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
})

export default FormField
