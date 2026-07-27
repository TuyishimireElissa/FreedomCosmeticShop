'use client'

import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Option {
  value: string
  label: string
  disabled?: boolean
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  labelRw?: string
  options: readonly Option[]
  error?: string
  hint?: string
  placeholder?: string
  language?: 'en' | 'rw'
  wrapperClassName?: string
  selectClassName?: string
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(function FormSelect({
  label,
  labelRw,
  options,
  error,
  hint,
  required,
  placeholder,
  language,
  id,
  className,
  wrapperClassName,
  selectClassName,
  'aria-describedby': externalDescription,
  ...props
}, ref) {
  const uid = useId()
  const { language: activeLanguage, t } = useLanguage()
  const selectId = id || `select-${uid.replaceAll(':', '')}`
  const errorId = `${selectId}-error`
  const hintId = `${selectId}-hint`
  const displayLanguage = language || (activeLanguage === 'rw' ? 'rw' : 'en')
  const displayLabel = displayLanguage === 'rw' && labelRw ? labelRw : label
  const describedBy = [externalDescription, hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      <label htmlFor={selectId} className="block text-sm font-semibold text-gray-900">
        {displayLabel}
        {required && (
          <>
            <span className="ml-1 text-red-700" aria-hidden="true">*</span>
            <span className="sr-only"> {t('accessibility.required')}</span>
          </>
        )}
      </label>
      {hint && <p id={hintId} className="text-xs leading-5 text-gray-600">{hint}</p>}
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-errormessage={error ? errorId : undefined}
        className={cn('input-field appearance-none', error && 'border-red-600 focus:border-red-700', selectClassName, className)}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-semibold text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
})

export default FormSelect
