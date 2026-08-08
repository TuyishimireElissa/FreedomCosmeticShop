'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { CheckCircle2, Loader2, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { BUSINESS, WHATSAPP_ORDERING_NUMBERS, formatWhatsAppDisplay, getWhatsAppLink, isPlaceholder, realValue } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

type FieldErrors = Partial<Record<'name' | 'email' | 'phone' | 'message', string>>

export default function ContactPageClient() {
  const t = useT()

  const [values, setValues] = useState({ name: '', email: '', phone: '', message: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [formError, setFormError] = useState<string | null>(null)

  // The business config deliberately ships owner placeholders rather than
  // inventing contact details. Never render an unfilled one to a customer.
  const channels = [
    ...WHATSAPP_ORDERING_NUMBERS.map((number, index) => ({
      icon: MessageCircle,
      // Both lines take orders; number them so customers know either works.
      title: index === 0 ? 'WhatsApp' : `WhatsApp ${index + 1}`,
      value: realValue(number) && formatWhatsAppDisplay(number),
      href: isPlaceholder(number) ? undefined : getWhatsAppLink(undefined, number),
    })),
    {
      icon: Phone,
      title: t('pages.call_us'),
      value: realValue(BUSINESS.phoneDisplay),
      href: isPlaceholder(BUSINESS.phone) ? undefined : `tel:${BUSINESS.phone}`,
    },
    {
      icon: Mail,
      title: t('pages.email'),
      value: realValue(BUSINESS.email),
      href: isPlaceholder(BUSINESS.email) ? undefined : `mailto:${BUSINESS.email}`,
    },
  ].filter((channel) => channel.value !== null)

  const supportHours = realValue(BUSINESS.supportHours.weekdays)
  const addressLine = [realValue(BUSINESS.address.sector), realValue(BUSINESS.address.district), BUSINESS.address.city]
    .filter(Boolean)
    .join(', ')

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (values.name.trim().length < 2) next.name = t('pages.contact_err_name')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = t('pages.contact_err_email')
    if (values.message.trim().length < 10) next.message = t('pages.contact_err_message')
    const phone = values.phone.trim()
    // Optional, but if supplied it must be a reachable Rwandan number so the
    // server does not reject the whole submission.
    if (phone && !/^(\+?250|0)?7[2389]\d{7}$/.test(phone.replace(/[\s-]/g, ''))) {
      next.phone = t('pages.contact_err_phone')
    }
    return next
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setStatus('sending')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          message: values.message.trim(),
          ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
        }),
      })

      if (response.ok) {
        setStatus('sent')
        setValues({ name: '', email: '', phone: '', message: '' })
        return
      }

      setStatus('error')
      setFormError(response.status === 429 ? t('pages.contact_rate_limited') : t('pages.contact_error'))
    } catch {
      setStatus('error')
      setFormError(t('pages.contact_error'))
    }
  }

  const inputClass =
    'mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none transition-colors focus:border-fcs-brand focus:ring-2 focus:ring-[#B76E79]/20'

  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fcs-brand-text">{t('pages.customer_care')}</p>
          <h1 className="mt-3 text-4xl font-black text-[#1a1a1a]">{t('pages.contact_business', { business: BUSINESS.tradingName })}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-500">{t('pages.contact_intro')}</p>
        </header>

        {channels.length > 0 && (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {channels.map(({ icon: Icon, title, value, href }) => (
              <a
                key={title}
                href={href}
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-fcs-brand-text"><Icon className="h-5 w-5" /></span>
                <h2 className="mt-4 font-black">{title}</h2>
                <p className="mt-1 break-all text-sm text-gray-500">{value}</p>
              </a>
            ))}
          </div>
        )}

        {channels.length === 0 && (
          <p className="mx-auto mt-8 max-w-xl rounded-2xl bg-amber-50 px-5 py-4 text-center text-sm font-semibold text-amber-900">
            {t('pages.contact_details_pending')}
          </p>
        )}

        <section className="mt-6 rounded-3xl border border-gray-100 bg-white p-7 shadow-sm sm:p-9">
          <h2 className="text-xl font-black text-[#1a1a1a]">{t('pages.contact_form_title')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('pages.contact_form_hint')}</p>

          {status === 'sent' ? (
            <p role="status" className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              {t('pages.contact_sent')}
            </p>
          ) : (
            <form noValidate onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-[#1a1a1a]">
                  {t('pages.contact_name')}
                  <input
                    type="text"
                    value={values.name}
                    onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    className={inputClass}
                  />
                  {errors.name && <span id="contact-name-error" role="alert" className="mt-1 block text-xs font-semibold text-red-600">{errors.name}</span>}
                </label>

                <label className="block text-sm font-bold text-[#1a1a1a]">
                  {t('pages.contact_email')}
                  <input
                    type="email"
                    value={values.email}
                    onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    className={inputClass}
                  />
                  {errors.email && <span id="contact-email-error" role="alert" className="mt-1 block text-xs font-semibold text-red-600">{errors.email}</span>}
                </label>
              </div>

              <label className="block text-sm font-bold text-[#1a1a1a]">
                {t('pages.contact_phone')}
                <input
                  type="tel"
                  inputMode="tel"
                  value={values.phone}
                  onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
                  className={inputClass}
                />
                {errors.phone && <span id="contact-phone-error" role="alert" className="mt-1 block text-xs font-semibold text-red-600">{errors.phone}</span>}
              </label>

              <label className="block text-sm font-bold text-[#1a1a1a]">
                {t('pages.contact_message')}
                <textarea
                  rows={5}
                  value={values.message}
                  onChange={(event) => setValues((prev) => ({ ...prev, message: event.target.value }))}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  className={`${inputClass} resize-y`}
                />
                {errors.message && <span id="contact-message-error" role="alert" className="mt-1 block text-xs font-semibold text-red-600">{errors.message}</span>}
              </label>

              {formError && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-fcs-brand px-6 text-sm font-black text-white transition-opacity disabled:opacity-50"
              >
                {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {status === 'sending' ? t('pages.contact_sending') : t('pages.contact_send')}
              </button>
            </form>
          )}
        </section>

        <section className="mt-6 rounded-3xl bg-[#1a1a1a] p-7 text-white sm:p-9">
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#FFD700]" />
            <div>
              <h2 className="text-xl font-black">{addressLine}, {BUSINESS.address.country}</h2>
              <p className="mt-2 text-sm leading-6 text-fcs-text-muted">{t('pages.contact_orders_notice')}</p>
              {supportHours && (
                <p className="mt-4 text-xs text-gray-500">
                  {t('pages.support_hours', {
                    weekdays: BUSINESS.supportHours.weekdays,
                    saturday: BUSINESS.supportHours.saturday,
                    sunday: BUSINESS.supportHours.sunday,
                    timezone: BUSINESS.supportHours.timezone,
                  })}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mt-7 text-center">
          <Link href="/faq" className="font-bold text-fcs-brand-text">{t('pages.read_faq')} →</Link>
        </div>
      </div>
    </main>
  )
}
