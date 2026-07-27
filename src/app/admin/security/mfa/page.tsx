'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Copy, Download, Loader2, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Step = 'intro' | 'scan' | 'verify' | 'success'

export default function MFASetupPage() {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('intro')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const begin = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/security/mfa/setup', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'MFA setup failed')
      setQrCode(data.data.qrCode)
      setSecret(data.data.secret)
      setBackupCodes(data.data.backupCodes)
      setStep('scan')
    } catch (reason) {
      toast({ title: 'MFA setup failed', description: reason instanceof Error ? reason.message : 'Please try again', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const verify = async () => {
    if (!/^\d{6}$/.test(token)) {
      toast({ title: 'Enter the six-digit code', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/admin/security/mfa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Invalid code')
      setStep('success')
      toast({ title: 'MFA enabled successfully' })
    } catch (reason) {
      toast({ title: 'Verification failed', description: reason instanceof Error ? reason.message : 'Please try again', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const downloadCodes = () => {
    const content = `FreedomCosmeticShop MFA backup codes\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nEach code works once. Store offline.`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'freedomcosmeticshop-mfa-backup-codes.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-emerald-700"><ShieldCheck className="h-6 w-6" /></span><div><h1 className="text-xl font-black">Two-factor authentication</h1><p className="text-sm text-gray-500">Protect this admin account with an authenticator app.</p></div></div>
        <div className="mt-6 grid grid-cols-4 gap-2">{(['intro','scan','verify','success'] as Step[]).map((value, index) => <span key={value} className={`h-1.5 rounded-full ${index <= ['intro','scan','verify','success'].indexOf(step) ? 'bg-emerald-500' : 'bg-gray-200'}`} />)}</div>

        {step === 'intro' && <div className="mt-7 space-y-4"><div className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900"><p className="font-bold">Before you begin</p><ol className="mt-2 list-inside list-decimal"><li>Install Google Authenticator, Microsoft Authenticator, 1Password, or Authy.</li><li>Scan the QR code.</li><li>Verify one six-digit code.</li><li>Download and store backup codes offline.</li></ol></div><p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">After activation, password-only admin login will no longer be accepted.</p><button onClick={begin} disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] font-black text-white disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Preparing…</> : 'Start MFA setup'}</button></div>}

        {step === 'scan' && <div className="mt-7 space-y-4 text-center"><p className="text-sm text-gray-600">Scan this QR code with your authenticator app.</p><div className="inline-block rounded-2xl border-2 border-gray-100 bg-white p-3"><img src={qrCode} alt="Authenticator QR code" className="h-52 w-52" /></div><div className="rounded-xl bg-gray-50 p-3 text-left"><p className="text-[11px] font-bold text-gray-500">Manual setup key</p><div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded bg-white p-2 text-xs">{secret}</code><button onClick={() => { navigator.clipboard.writeText(secret); toast({ title: 'Secret copied' }) }} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-gray-200" aria-label="Copy setup key"><Copy className="h-4 w-4" /></button></div></div><button onClick={() => setStep('verify')} className="min-h-12 w-full rounded-xl bg-[#B76E79] font-black text-white">I scanned the QR code</button></div>}

        {step === 'verify' && <div className="mt-7 space-y-5"><p className="text-sm leading-6 text-gray-600">Enter the current six-digit code, then save the backup codes. They are displayed only during this setup.</p><input value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="input-field py-4 text-center font-mono text-3xl tracking-[0.3em]" /><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black text-amber-900">Save these one-time backup codes</p><div className="mt-3 grid grid-cols-2 gap-2">{backupCodes.map((code) => <code key={code} className="rounded border bg-white px-2 py-1 text-center text-xs">{code}</code>)}</div><div className="mt-3 flex gap-2"><button onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-amber-300 text-xs font-bold text-amber-900"><Copy className="h-3.5 w-3.5" />Copy</button><button onClick={downloadCodes} className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-amber-800 text-xs font-bold text-white"><Download className="h-3.5 w-3.5" />Download</button></div></div><button onClick={verify} disabled={loading || token.length !== 6} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] font-black text-white disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying…</> : 'Verify and enable MFA'}</button></div>}

        {step === 'success' && <div className="mt-8 text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /><h2 className="mt-4 text-2xl font-black text-emerald-800">MFA enabled</h2><p className="mt-2 text-sm leading-6 text-gray-600">Future admin logins require your authenticator or one unused backup code.</p><Link href="/admin" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#B76E79] px-5 font-bold text-white">Return to admin</Link></div>}
      </div>
    </div>
  )
}
