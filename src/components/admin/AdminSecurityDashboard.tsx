'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TestTube2,
  UserCog,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { canViewSecurityDashboard } from '@/lib/security-dashboard'
import { useStore } from '@/store/useStore'

interface SecurityAlertItem {
  id: string
  type: string
  severity: string
  title: string
  message: string
  ipAddress: string | null
  createdAt: string
}

interface SecurityDashboardData {
  generatedAt: string
  period: { from: string; to: string }
  summary: {
    unresolvedAlerts: number
    highRiskAlerts: number
    failedLogins24h: number
    uniqueFailureIps24h: number
    lockedAccounts: number
    forcedPasswordChanges: number
    flaggedTestAccounts: number
    passwordResetRequests7d: number
    successfulPasswordResets7d: number
    adminActions7d: number
    failedAdminActions7d: number
    mfa: { enabled: number; total: number; coveragePercent: number }
  }
  alerts: SecurityAlertItem[]
  lockedAccounts: Array<{
    id: string
    name: string
    role: string
    lockedUntil: string
    failedLoginCount: number
  }>
  recentFailures: Array<{
    id: string
    identifier: string | null
    ipAddress: string | null
    reason: string | null
    createdAt: string
  }>
  recentActivity: Array<{
    id: string
    userName: string
    userRole: string
    action: string
    resource: string
    resourceId: string | null
    status: string
    ipAddress: string | null
    createdAt: string
  }>
  topActions: Array<{ action: string; count: number }>
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Kigali',
  })
}

function severityClass(severity: string) {
  if (severity === 'CRITICAL') return 'bg-red-100 text-red-800'
  if (severity === 'HIGH') return 'bg-orange-100 text-orange-800'
  if (severity === 'MEDIUM') return 'bg-amber-100 text-amber-800'
  return 'bg-blue-100 text-blue-800'
}

export function AdminSecurityDashboard() {
  const user = useStore((state) => state.user)
  const { toast } = useToast()
  const [data, setData] = useState<SecurityDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const allowed = canViewSecurityDashboard(user?.role)

  const load = useCallback(async (background = false) => {
    if (!allowed) return
    if (background) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/security/dashboard', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Security dashboard request failed')
      setData(payload.data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Security dashboard request failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [allowed])

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(true), 60_000)
    return () => window.clearInterval(interval)
  }, [load])

  const resolveAlert = async (alert: SecurityAlertItem) => {
    if (!window.confirm(`Resolve this ${alert.severity.toLowerCase()} alert?\n\n${alert.title}`)) return
    setResolvingId(alert.id)
    try {
      const response = await fetch(`/api/admin/security/alerts/${alert.id}`, { method: 'PATCH' })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Alert resolution failed')
      toast({ title: 'Security alert resolved', description: alert.title })
      await load(true)
    } catch (reason) {
      toast({
        title: 'Could not resolve alert',
        description: reason instanceof Error ? reason.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setResolvingId(null)
    }
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-600" />
        <h2 className="mt-4 text-xl font-bold text-red-900">Security dashboard restricted</h2>
        <p className="mt-2 text-sm text-red-700">Only Admin and Super Admin accounts can view security telemetry.</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-semibold text-gray-500"><Loader2 className="h-5 w-5 animate-spin" />Loading live security data…</div>
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <XCircle className="mx-auto h-11 w-11 text-red-600" />
        <h2 className="mt-3 text-lg font-bold text-red-900">Security data unavailable</h2>
        <p className="mt-2 text-sm text-red-700">{error || 'No security data was returned.'}</p>
        <Button className="mt-5" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
      </div>
    )
  }

  const summaryCards = [
    { label: 'Unresolved alerts', value: data.summary.unresolvedAlerts, detail: `${data.summary.highRiskAlerts} high risk`, icon: ShieldAlert, tone: data.summary.highRiskAlerts ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50' },
    { label: 'Failed logins · 24h', value: data.summary.failedLogins24h, detail: `${data.summary.uniqueFailureIps24h} unique IPs`, icon: AlertTriangle, tone: data.summary.failedLogins24h ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50' },
    { label: 'Locked accounts', value: data.summary.lockedAccounts, detail: 'Currently locked', icon: LockKeyhole, tone: data.summary.lockedAccounts ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50' },
    { label: 'MFA coverage', value: `${data.summary.mfa.coveragePercent}%`, detail: `${data.summary.mfa.enabled} of ${data.summary.mfa.total} privileged`, icon: KeyRound, tone: data.summary.mfa.coveragePercent === 100 ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50' },
    { label: 'Password change required', value: data.summary.forcedPasswordChanges, detail: 'Privileged accounts', icon: UserCog, tone: data.summary.forcedPasswordChanges ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50' },
    { label: 'Flagged test accounts', value: data.summary.flaggedTestAccounts, detail: 'Active explicit flags', icon: TestTube2, tone: data.summary.flaggedTestAccounts ? 'text-purple-700 bg-purple-50' : 'text-emerald-700 bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-[#171717] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#e2aab2]"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.18em]">Live security telemetry</span></div>
          <h2 className="mt-2 text-2xl font-black">Admin Security Dashboard</h2>
          <p className="mt-1 text-xs text-gray-400">Generated {formatDate(data.generatedAt)} · refreshes every 60 seconds</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/security/mfa" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold hover:bg-white/10"><KeyRound className="h-4 w-4" />MFA settings</Link>
          <Button variant="outline" onClick={() => void load(true)} disabled={refreshing} className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-2 text-3xl font-black text-gray-900">{value}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></div>
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4"><div><h3 className="font-black">Unresolved security alerts</h3><p className="text-xs text-gray-500">Resolution is recorded in the admin audit log.</p></div><span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">{data.alerts.length}</span></div>
          <div className="divide-y">
            {data.alerts.length === 0 ? <div className="p-8 text-center text-sm text-gray-500"><CheckCircle2 className="mx-auto mb-2 h-9 w-9 text-emerald-500" />No unresolved alerts</div> : data.alerts.map((alert) => (
              <div key={alert.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${severityClass(alert.severity)}`}>{alert.severity}</span><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{alert.type}</span></div><p className="mt-2 font-bold text-gray-900">{alert.title}</p><p className="mt-1 text-sm leading-6 text-gray-600">{alert.message}</p><p className="mt-2 text-xs text-gray-400">{formatDate(alert.createdAt)}{alert.ipAddress ? ` · IP ${alert.ipAddress}` : ''}</p></div>
                  <Button size="sm" variant="outline" disabled={resolvingId === alert.id} onClick={() => void resolveAlert(alert)}>{resolvingId === alert.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}Resolve</Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black">Seven-day controls</h3><div className="mt-4 space-y-3 text-sm"><MetricRow label="Admin actions" value={data.summary.adminActions7d} /><MetricRow label="Failed admin actions" value={data.summary.failedAdminActions7d} danger={data.summary.failedAdminActions7d > 0} /><MetricRow label="Password reset requests" value={data.summary.passwordResetRequests7d} /><MetricRow label="Successful password resets" value={data.summary.successfulPasswordResets7d} /></div></section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black">Top admin actions · 7 days</h3><div className="mt-4 space-y-2">{data.topActions.length === 0 ? <p className="text-sm text-gray-500">No admin activity in this period.</p> : data.topActions.map((item) => <div key={item.action} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs"><span className="truncate font-bold text-gray-700">{item.action}</span><span className="ml-3 rounded-full bg-white px-2 py-0.5 font-black">{item.count}</span></div>)}</div></section>
        </div>
      </div>

      {data.lockedAccounts.length > 0 && <section className="rounded-2xl border border-red-200 bg-red-50 p-5"><h3 className="flex items-center gap-2 font-black text-red-900"><LockKeyhole className="h-5 w-5" />Currently locked privileged accounts</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{data.lockedAccounts.map((account) => <div key={account.id} className="rounded-xl border border-red-100 bg-white p-4"><p className="font-bold">{account.name}</p><p className="mt-1 text-xs text-gray-500">{account.role} · {account.failedLoginCount} failed attempts</p><p className="mt-2 text-xs font-semibold text-red-700">Locked until {formatDate(account.lockedUntil)}</p></div>)}</div></section>}

      <div className="grid gap-6 xl:grid-cols-2">
        <SecurityTable title="Recent failed logins" empty="No failed login records." headers={['Account', 'IP address', 'Reason', 'Time']} rows={data.recentFailures.map((attempt) => [attempt.identifier || 'Unknown', attempt.ipAddress || 'Unavailable', attempt.reason || 'Invalid credentials', formatDate(attempt.createdAt)])} />
        <SecurityTable title="Recent admin activity" empty="No admin activity records." headers={['Administrator', 'Action', 'Resource', 'Status']} rows={data.recentActivity.map((activity) => [`${activity.userName} · ${activity.userRole}`, activity.action, activity.resource, activity.status])} />
      </div>
    </div>
  )
}

function MetricRow({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0"><span className="text-gray-600">{label}</span><span className={`font-black ${danger ? 'text-red-700' : 'text-gray-900'}`}>{value}</span></div>
}

function SecurityTable({ title, empty, headers, rows }: { title: string; empty: string; headers: string[]; rows: string[][] }) {
  return <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h3 className="font-black">{title}</h3></div>{rows.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">{empty}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-black">{header}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`} className="hover:bg-gray-50">{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} className="max-w-[220px] truncate px-4 py-3 text-gray-700">{cell}</td>)}</tr>)}</tbody></table></div>}</section>
}
