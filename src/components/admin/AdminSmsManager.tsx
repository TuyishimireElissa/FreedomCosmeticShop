"use client"

/**
 * AdminSmsManager — SMS dashboard with templates, queue stats, scheduled SMS.
 *
 * Tabs:
 *   - Overview: Queue stats, delivery stats, recent SMS
 *   - Templates: View all templates (EN + RW)
 *   - Send: Send a test SMS
 *   - Scheduled: Schedule promotional SMS
 */

import { useEffect, useState, useCallback } from "react"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Send,
  Clock,
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface SmsStats {
  queue: {
    total: number
    queued: number
    sending: number
    sent: number
    failed: number
    scheduled: number
    totalCost: number
    totalSegments: number
  }
  delivery: {
    total: number
    sent: number
    delivered: number
    failed: number
    pending: number
  }
  recent: {
    id: string
    to: string
    message: string
    status: string
    provider?: string
    createdAt: string
    sentAt?: string
    cost?: number
    segments?: number
  }[]
}

interface Template {
  key: string
  label: string
  description: string
  en: string
  rw: string
  variables: string[]
  critical: boolean
}

interface ScheduledSms {
  id: string
  name: string
  message: string
  recipients: string[]
  scheduledAt: string
  status: string
  sentCount?: number
}

export function AdminSmsManager() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">SMS Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage SMS notifications, templates, and scheduling.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="send">
          <SendTab />
        </TabsContent>
        <TabsContent value="scheduled">
          <ScheduledTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<SmsStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/sms/stats")
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setStats(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [load])

  if (loading) {
    return <Skeleton className="h-64 rounded-2xl" />
  }

  if (!stats) {
    return <p className="text-sm text-muted-foreground">Failed to load stats.</p>
  }

  return (
    <div className="space-y-4">
      {/* Queue stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.queue.total, icon: MessageSquare },
          { label: "Sent", value: stats.queue.sent, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Queued", value: stats.queue.queued, icon: Clock, color: "text-amber-600" },
          { label: "Failed", value: stats.queue.failed, icon: XCircle, color: "text-red-600" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <s.icon className={`h-4 w-4 ${s.color || "text-primary"}`} />
            </div>
            <p className={`mt-2 text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Cost stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total cost
          </p>
          <p className="mt-2 text-xl font-bold">{formatRWF(stats.queue.totalCost)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total segments
          </p>
          <p className="mt-2 text-xl font-bold">{stats.queue.totalSegments}</p>
        </div>
      </div>

      {/* Recent SMS */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-lg font-semibold">Recent SMS</h3>
        {stats.recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No SMS sent yet.</p>
        ) : (
          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto ub-scroll">
            {stats.recent.map((sms) => (
              <div key={sms.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{sms.to}</span>
                  <Badge
                    variant={
                      sms.status === "sent" ? "default" :
                      sms.status === "failed" ? "destructive" :
                      "secondary"
                    }
                    className="text-xs"
                  >
                    {sms.status}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sms.message}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{sms.provider || "—"}</span>
                  <span>
                    {new Date(sms.createdAt).toLocaleString("en-RW", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Templates Tab ───────────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/sms/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <Skeleton className="h-64 rounded-2xl" />
  }

  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <div key={t.key} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </div>
            {t.critical && (
              <Badge variant="default" className="text-xs">
                Critical
              </Badge>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-secondary/30 p-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">🇬🇧 English</p>
              <p className="mt-1 text-sm">{t.en}</p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">🇷🇼 Kinyarwanda</p>
              <p className="mt-1 text-sm">{t.rw}</p>
            </div>
          </div>
          {t.variables.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Variables: {t.variables.map((v) => `{{${v}}}`).join(", ")}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Send Tab ────────────────────────────────────────────────────────────────

function SendTab() {
  const { toast } = useToast()
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!phone || !message) {
      toast({ title: "Phone and message are required", variant: "destructive" })
      return
    }

    setSending(true)
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Send failed")
      }
      toast({ title: "SMS sent!", description: `To: ${phone}` })
      setMessage("")
    } catch (e) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-lg rounded-2xl border bg-card p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Send className="h-5 w-5 text-primary" /> Send test SMS
      </h3>
      <p className="text-sm text-muted-foreground">
        Send a manual SMS to any phone number.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="sms-phone">Recipient phone</Label>
          <Input
            id="sms-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0788123456"
          />
        </div>
        <div>
          <Label htmlFor="sms-message">Message</Label>
          <Textarea
            id="sms-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={4}
            maxLength={480}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {message.length} characters · ~{Math.ceil(message.length / 160)} SMS segments
          </p>
        </div>
        <Button onClick={handleSend} disabled={sending} className="w-full">
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send SMS
        </Button>
      </div>
    </div>
  )
}

// ─── Scheduled Tab ───────────────────────────────────────────────────────────

function ScheduledTab() {
  const { toast } = useToast()
  const [scheduled, setScheduled] = useState<ScheduledSms[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [recipients, setRecipients] = useState("")
  const [broadcast, setBroadcast] = useState(false)
  const [scheduledAt, setScheduledAt] = useState("")
  const [scheduling, setScheduling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/sms/scheduled")
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setScheduled(data.scheduled || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSchedule = async () => {
    if (!name || !message || !scheduledAt) {
      toast({ title: "Name, message, and date are required", variant: "destructive" })
      return
    }

    setScheduling(true)
    try {
      const payload: Record<string, unknown> = {
        name,
        message,
        broadcast,
        scheduledAt,
        language: "en",
      }
      if (!broadcast && recipients) {
        payload.recipients = recipients.split(",").map((r) => r.trim())
      }

      const res = await fetch("/api/sms/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Schedule failed")

      toast({ title: "SMS scheduled!", description: `For ${new Date(scheduledAt).toLocaleString("en-RW")}` })
      setName("")
      setMessage("")
      setRecipients("")
      setScheduledAt("")
      load()
    } catch (e) {
      toast({
        title: "Schedule failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Schedule form */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5 text-primary" /> Schedule SMS
        </h3>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="sched-name">Campaign name</Label>
            <Input
              id="sched-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend promo"
            />
          </div>
          <div>
            <Label htmlFor="sched-msg">Message</Label>
            <Textarea
              id="sched-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Get 15% off this weekend! Use code WEEKEND15."
              rows={3}
              maxLength={480}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sched-date">Send at</Label>
              <Input
                id="sched-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <Label>Recipients</Label>
              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={broadcast}
                    onChange={(e) => setBroadcast(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  All customers
                </label>
              </div>
            </div>
          </div>
          {!broadcast && (
            <div>
              <Label htmlFor="sched-recipients">Recipients (comma-separated phones)</Label>
              <Input
                id="sched-recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="+250788123456, +250799876543"
              />
            </div>
          )}
          <Button onClick={handleSchedule} disabled={scheduling} className="w-full">
            {scheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
            Schedule SMS
          </Button>
        </div>
      </div>

      {/* Scheduled list */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-lg font-semibold">Scheduled campaigns</h3>
        {loading ? (
          <Skeleton className="mt-3 h-20 w-full" />
        ) : scheduled.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No scheduled SMS.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {scheduled.map((s) => (
              <div key={s.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.name}</span>
                  <Badge
                    variant={
                      s.status === "sent" ? "default" :
                      s.status === "cancelled" ? "destructive" :
                      "secondary"
                    }
                    className="text-xs"
                  >
                    {s.status}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.message}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{s.recipients.length} recipients</span>
                  <span>
                    {new Date(s.scheduledAt).toLocaleString("en-RW", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {s.sentCount !== undefined && (
                  <p className="mt-1 text-xs text-emerald-600">✓ Sent to {s.sentCount} recipients</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
