'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const questions = [
  ['Are your products authentic?', 'Yes. Products should be sourced from authorized distributors and verified suppliers. Each listing identifies the brand and product details. Contact support if you need sourcing information for a specific item.'],
  ['Where do you deliver?', 'We deliver to all 30 districts of Rwanda. Select your province and district during checkout for the exact delivery fee and estimate.'],
  ['How can I pay?', 'MTN MoMo is recommended. Airtel Money, Visa/Mastercard, and Kigali cash on delivery may also be available at checkout. Never share your Mobile Money PIN.'],
  ['How long does delivery take?', 'Kigali is generally same day or 1–2 business days. Other provinces generally take 2–4 business days depending on district and road access.'],
  ['Can I return cosmetics?', 'Unopened, unused products may be eligible within 7 days. Opened personal-care items cannot normally be returned for hygiene reasons unless defective or incorrect.'],
  ['How do I track an order?', 'Use your order number from the confirmation message or open My Orders in your account. Support can also assist by WhatsApp.'],
  ['Do you offer wholesale prices?', 'Yes. Salons, spas, shops, hotels, and resellers can apply for a wholesale account. Minimum order and tier discounts are shown in the wholesale section.'],
  ['Is BEAUTY20 valid?', 'Eligibility and limits are checked at checkout. A valid coupon is recalculated by the server before your order is confirmed.'],
]

export default function FaqPage() {
  const [open, setOpen] = useState(0)
  return <main className="min-h-screen bg-[#f8f9fa] px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><header className="text-center"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#B76E79]">Help centre</p><h1 className="mt-3 text-4xl font-black">Frequently asked questions</h1><p className="mt-3 text-sm text-gray-500">Everything you need to shop confidently with FreedomCosmeticShop.</p></header><div className="mt-9 space-y-3">{questions.map(([question,answer],index)=><section key={question} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"><button type="button" onClick={()=>setOpen(open===index?-1:index)} className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-black text-[#1a1a1a] sm:text-base" aria-expanded={open===index}>{question}<ChevronDown className={`h-5 w-5 shrink-0 text-[#B76E79] transition-transform ${open===index?'rotate-180':''}`} /></button>{open===index&&<p className="border-t border-gray-100 px-5 py-4 text-sm leading-7 text-gray-600">{answer}</p>}</section>)}</div></div></main>
}
