'use client'

import { forwardRef, useId, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  labelRw?: string
  error?: string
  hint?: string
  language?: 'en' | 'rw'
  wrapperClassName?: string
  textareaClassName?: string
  afterField?: ReactNode
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(function FormTextarea({
  label,
  labelRw,
  error,
  hint,
  required,
  language,
  id,
  className,
  wrapperClassName,
  textareaClassName,
  afterField,
  'aria-describedby': externalDescription,
  ...props
}, ref) {
  const uid = useId()
  const { language: activeLanguage, t } = useLanguage()
  const textareaId = id || `textarea-${uid.replaceAll(':', '')}`
  const errorId = `${textareaId}-error`
  const hintId = `${textareaId}-hint`
  const displayLanguage = language || (activeLanguage === 'rw' ? 'rw' : 'en')
  const displayLabel = displayLanguage === 'rw' && labelRw ? labelRw : label
  const describedBy = [externalDescription, hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      <label htmlFor={textareaId} className="block text-sm font-semibold text-gray-900">
        {displayLabel}
        {required && <><span className="ml-1 text-red-700" aria-hidden="true">*</span><span className="sr-only"> {t('accessibility.required')}</span></>}
      </label>
      {hint && <p id={hintId} className="text-xs leading-5 text-gray-600">{hint}</p>}
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-errormessage={error ? errorId : undefined}
        className={cn('input-field', error && 'border-red-600 focus:border-red-700', textareaClassName, className)}
        {...props}
      />
      {afterField}
      {error && <p id={errorId} className="flex items-start gap-1.5 text-sm font-semibold text-red-700" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{error}</span></p>}
    </div>
  )
})

export default FormTextarea
