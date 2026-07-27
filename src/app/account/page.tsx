'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Gauge, Gift, Heart, Loader2, Mail, MapPin, Package, Phone, Save, User } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useT } from '@/lib/i18n/LanguageContext'

export default function AccountPage() {
  const t = useT()
  const { user, authLoading, fetchUser, setUser } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [counts, setCounts] = useState({ orders: 0, wishlist: 0 })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => { if (user) { setName(user.name); setEmail(user.email || ''); Promise.all([fetch('/api/account/orders').then((r) => r.json()), fetch('/api/wishlist').then((r) => r.json())]).then(([orders, wishlist]) => setCounts({ orders: (orders.orders || orders.data?.orders || []).length, wishlist: (wishlist.wishlist || wishlist.data?.wishlist || []).length })).catch(() => {}) } }, [user])

  const save = async () => {
    setSaving(true); setMessage(null)
    try { const response = await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim() || null }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || t('auth.profile_update_failed')); setUser({ ...user!, name: data.user.name, email: data.user.email }); setMessage(t('auth.profile_updated')) }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : t('auth.profile_update_failed')) }
    finally { setSaving(false) }
  }

  if (authLoading) return <AccountLoading />
  if (!user) return <AuthRequired />

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-xl bg-[#1a1a1a] p-6 text-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#B76E79] text-2xl font-bold">{user.name.split(' ').map((part) => part[0]).slice(0,2).join('').toUpperCase()}</span><div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFD700]">{t('auth.my_beauty_account')}</span><h1 className="mt-2 truncate text-3xl font-bold">{user.name}</h1><div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400"><span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{user.phone}</span>{user.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}</span>}</div></div></div></div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
          { icon: Package, value: counts.orders, label: t('orders.title'), href: '/account/orders' }, { icon: Heart, value: counts.wishlist, label: t('nav.wishlist'), href: '/account/wishlist' }, { icon: Gift, value: user.loyaltyPoints || 0, label: t('auth.points'), href: '/account' }, { icon: MapPin, value: 'RW', label: t('auth.rwanda'), href: '/account' },
        ].map(({ icon: Icon, value, label, href }) => <Link key={label} href={href} className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md"><Icon className="h-5 w-5 text-[#B76E79]" /><strong className="mt-3 block text-xl text-[#1a1a1a]">{value}</strong><span className="text-xs text-gray-500">{label}</span></Link>)}</div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-7"><h2 className="flex items-center gap-2 text-lg font-bold"><User className="h-5 w-5 text-[#B76E79]" />{t('auth.profile_details')}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('auth.full_name')}<input value={name} onChange={(event) => setName(event.target.value)} className="input-field mt-1.5" /></label><label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('auth.email_optional')}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input-field mt-1.5" /></label><label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('auth.phone')}<input value={user.phone} disabled className="input-field mt-1.5 bg-gray-50 text-gray-400" /></label><label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('auth.account_role')}<input value={user.role} disabled className="input-field mt-1.5 bg-gray-50 text-gray-400" /></label></div>{message && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-[#9e5964]">{message}</p>}<button type="button" onClick={save} disabled={saving || name.trim().length < 2} className="mt-5 flex min-h-11 items-center gap-2 rounded-xl bg-[#B76E79] px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('auth.save_changes')}</button></section>
          <aside className="space-y-3">{[{ label: t('auth.view_my_orders'), href: '/account/orders', icon: Package }, { label: t('auth.open_wishlist'), href: '/account/wishlist', icon: Heart }, { label: t('low_data.settings_title'), href: '/account/settings', icon: Gauge }, { label: t('cart.browse_products'), href: '/products', icon: Gift }].map(({ label, href, icon: Icon }) => <Link key={href + label} href={href} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 text-sm font-bold shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-rose-200"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-[#B76E79]"><Icon className="h-5 w-5" /></span>{label}</Link>)}</aside>
        </div>
      </div>
    </main>
  )
}
function AccountLoading() { return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#B76E79]" /></div> }
function AuthRequired() { const t = useT(); return <div className="grid min-h-[60vh] place-items-center px-4 text-center"><div><User className="mx-auto h-12 w-12 text-[#B76E79]" /><h1 className="mt-4 text-2xl font-bold">{t('auth.signin_account')}</h1><Link href="/login" className="mt-5 inline-block rounded-full bg-[#B76E79] px-6 py-3 text-sm font-bold text-white">{t('auth.login_button')}</Link></div></div> }
