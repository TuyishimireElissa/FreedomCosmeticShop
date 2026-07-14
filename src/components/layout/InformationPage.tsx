import Link from 'next/link'
import { BUSINESS } from '@/lib/business-config'

export interface InformationSection {
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export default function InformationPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string
  title: string
  intro: string
  sections: InformationSection[]
}) {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-10 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <header className="bg-[#1a1a1a] px-6 py-10 text-white sm:px-10">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FFD700]">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300">{intro}</p>
          <p className="mt-4 text-xs text-gray-500">Last updated: 13 July 2026</p>
        </header>
        <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-black text-[#1a1a1a]">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-gray-600">{paragraph}</p>)}
              {section.bullets && <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">{section.bullets.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B76E79]" />{item}</li>)}</ul>}
            </section>
          ))}
          <div className="border-t border-gray-100 pt-6 text-sm text-gray-500">
            Questions? Email <a className="font-bold text-[#B76E79]" href={BUSINESS.email.includes('TODO') ? undefined : `mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or contact {BUSINESS.tradingName} on WhatsApp.
          </div>
          <Link href="/" className="inline-flex rounded-full bg-[#B76E79] px-5 py-2.5 text-sm font-black text-white">Back to store</Link>
        </div>
      </article>
    </main>
  )
}
