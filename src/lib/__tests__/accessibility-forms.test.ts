import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const formField = read('src/components/a11y/FormField.tsx')
const formSelect = read('src/components/a11y/FormSelect.tsx')
const formTextarea = read('src/components/a11y/FormTextarea.tsx')
const loginPage = read('src/app/(auth)/login/page.tsx')
const registerPage = read('src/app/(auth)/register/page.tsx')
const address = read('src/components/checkout/AddressForm.tsx')
const wholesale = read('src/components/wholesale/WholesaleView.tsx')
const review = read('src/components/reviews/ReviewSubmissionForm.tsx')
const checkout = read('src/app/checkout/page.tsx')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('accessible form controls', () => {
  it('connects input labels, hints, errors, and required state', () => {
    expect(formField).toContain('<label htmlFor={inputId}')
    expect(formField).toContain('aria-describedby={describedBy}')
    expect(formField).toContain('aria-errormessage={error ? errorId : undefined}')
    expect(formField).toContain('aria-invalid={error ? true : undefined}')
    expect(formField).toContain('aria-required={required || undefined}')
    expect(formField).toContain('role="alert"')
    expect(formField).toContain("t('accessibility.required')")
  })

  it('provides equivalent native select and textarea relationships', () => {
    for (const source of [formSelect, formTextarea]) {
      expect(source).toContain('htmlFor=')
      expect(source).toContain('aria-describedby={describedBy}')
      expect(source).toContain('aria-errormessage={error ? errorId : undefined}')
      expect(source).toContain('role="alert"')
    }
    expect(formSelect).toContain('<select')
    expect(formTextarea).toContain('<textarea')
  })

  it('checks the active authentication forms', () => {
    expect(loginPage.match(/<FormField/g)?.length).toBeGreaterThanOrEqual(2)
    expect(registerPage.match(/<FormField/g)?.length).toBeGreaterThanOrEqual(3)
    expect(registerPage).toContain("id=\"register-terms-error\"")
    expect(registerPage).toContain('aria-describedby={fieldErrors.terms')
  })

  it('associates every checkout address error with its field', () => {
    expect(address.match(/<FormField/g)?.length).toBeGreaterThanOrEqual(4)
    expect(address.match(/<FormSelect/g)?.length).toBe(5)
    expect(address).toContain('<FormTextarea')
    for (const field of ['fullName', 'phone', 'email', 'province', 'district', 'sector', 'cell', 'village', 'address']) {
      expect(address).toContain(`error={errors.${field}}`)
    }
    expect(checkout).toContain('role="alert" aria-live="assertive"')
  })

  it('associates wholesale validation and required confirmations', () => {
    expect(wholesale.match(/<FormField/g)?.length).toBeGreaterThanOrEqual(7)
    expect(wholesale.match(/<FormSelect/g)?.length).toBeGreaterThanOrEqual(5)
    expect(wholesale).toContain('<FormTextarea')
    expect(wholesale).toContain('id="wholesale-form-error"')
    expect(wholesale).toContain("aria-describedby={formError && !agreeTerms ? 'wholesale-form-error'")
    expect(wholesale).toContain('role="alert" aria-live="assertive"')
  })

  it('exposes review rating semantics and form errors without relying on color', () => {
    expect(review).toContain('role="radiogroup"')
    expect(review).toContain('role="radio"')
    expect(review).toContain('aria-checked={rating === star}')
    expect(review).toContain('aria-describedby={error === \'RATING_REQUIRED\' ? \'review-form-error\'')
    expect(review).toContain('id="review-form-error"')
    expect(review).toContain('role="alert" aria-live="assertive"')
    expect(review).toContain('<FormTextarea')
  })

  it('provides verified Kinyarwanda required-state copy', () => {
    expect(kinyarwanda).toContain("required: '(birasabwa)', // verified-rw")
  })
})
