'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Gift, Heart, Loader2, Mail, MapPin, Package, Phone, Save, User } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function AccountPage() {
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
    try { const response = await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim() || null }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Update failed'); setUser({ ...user!, name: data.user.name, email: data.user.email }); setMessage('Profile updated successfully.') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Profile update failed') }
    finally { setSaving(false) }
  }

  if (authLoading) return <AccountLoading />
  if (!user) return <AuthRequired />

  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-3xl bg-[#1a1a1a] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#B76E79] text-2xl font-black">{user.name.split(' ').map((part) => part[0]).slice(0,2).join('').toUpperCase()}</span><div className="min-w-0"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD700]">My beauty account</span><h1 className="mt-2 truncate text-3xl font-black">{user.name}</h1><div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400"><span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{user.phone}</span>{user.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}</span>}</div></div></div></div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
          { icon: Package, value: counts.orders, label: 'Orders', href: '/account/orders' }, { icon: Heart, value: counts.wishlist, label: 'Wishlist', href: '/account/wishlist' }, { icon: Gift, value: user.loyaltyPoints || 0, label: 'Points', href: '/account' }, { icon: MapPin, value: 'RW', label: 'Rwanda', href: '/account' },
        ].map(({ icon: Icon, value, label, href }) => <Link key={label} href={href} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><Icon className="h-5 w-5 text-[#B76E79]" /><strong className="mt-3 block text-xl text-[#1a1a1a]">{value}</strong><span className="text-xs text-gray-500">{label}</span></Link>)}</div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7"><h2 className="flex items-center gap-2 text-lg font-black"><User className="h-5 w-5 text-[#B76E79]" />Profile details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-black uppercase tracking-wider text-gray-500">Full name<input value={name} onChange={(event) => setName(event.target.value)} className="input-field mt-1.5" /></label><label className="text-xs font-black uppercase tracking-wider text-gray-500">Email (optional)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input-field mt-1.5" /></label><label className="text-xs font-black uppercase tracking-wider text-gray-500">Phone<input value={user.phone} disabled className="input-field mt-1.5 bg-gray-50 text-gray-400" /></label><label className="text-xs font-black uppercase tracking-wider text-gray-500">Account role<input value={user.role} disabled className="input-field mt-1.5 bg-gray-50 text-gray-400" /></label></div>{message && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-[#9e5964]">{message}</p>}<button type="button" onClick={save} disabled={saving || name.trim().length < 2} className="mt-5 flex min-h-11 items-center gap-2 rounded-xl bg-[#B76E79] px-5 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes</button></section>
          <aside className="space-y-3">{[{ label: 'View my orders', href: '/account/orders', icon: Package }, { label: 'Open wishlist', href: '/account/wishlist', icon: Heart }, { label: 'Browse products', href: '/products', icon: Gift }].map(({ label, href, icon: Icon }) => <Link key={href + label} href={href} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-sm font-bold shadow-sm hover:border-rose-200"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-[#B76E79]"><Icon className="h-5 w-5" /></span>{label}</Link>)}</aside>
        </div>
      </div>
    </main>
  )
}
function AccountLoading() { return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#B76E79]" /></div> }
function AuthRequired() { return <div className="grid min-h-[60vh] place-items-center px-4 text-center"><div><User className="mx-auto h-12 w-12 text-[#B76E79]" /><h1 className="mt-4 text-2xl font-black">Sign in to your account</h1><Link href="/login" className="mt-5 inline-block rounded-full bg-[#B76E79] px-6 py-3 text-sm font-bold text-white">Log in</Link></div></div> }
