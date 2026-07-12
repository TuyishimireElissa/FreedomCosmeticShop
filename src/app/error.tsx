'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Application error:', error) }, [error])
  return <main className="grid min-h-[70vh] place-items-center bg-[#f8f9fa] px-4 py-16"><div className="w-full max-w-lg rounded-[2rem] border border-red-100 bg-white p-7 text-center shadow-xl shadow-black/5 sm:p-10"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="h-8 w-8" /></span><p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#B76E79]">FreedomCosmeticShop</p><h1 className="mt-2 text-3xl font-black text-[#1a1a1a]">Something went wrong</h1><p className="mt-3 text-sm leading-6 text-gray-500">We couldn&apos;t complete that request. Your cart and account information are safe.</p>{error.digest && <p className="mt-3 font-mono text-[10px] text-gray-400">Reference: {error.digest}</p>}<div className="mt-7 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={reset} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#B76E79] text-sm font-black text-white"><RefreshCw className="h-4 w-4" />Try again</button><Link href="/" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#1a1a1a] text-sm font-black text-white"><Home className="h-4 w-4" />Go home</Link></div></div></main>
}
