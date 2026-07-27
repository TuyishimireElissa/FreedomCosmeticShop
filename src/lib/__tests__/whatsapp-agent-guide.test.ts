import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const page = read('src/app/admin/whatsapp-guide/page.tsx')
const layout = read('src/app/admin/layout.tsx')
const guide = read('src/components/admin/WhatsAppAgentGuide.tsx')
const service = read('src/lib/whatsapp-service.ts')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

describe('WhatsApp agent saved-reply guide', () => {
  it('is rendered inside the existing protected admin layout', () => {
    expect(page).toContain('<WhatsAppAgentGuide />')
    expect(layout).toContain('<AdminAuthGuard>')
  })

  it('uses the validated shared quick replies in Kinyarwanda by default', () => {
    for (const reply of ['QUICK_REPLIES.payment', 'QUICK_REPLIES.delivery', 'QUICK_REPLIES.returns', 'QUICK_REPLIES.authenticity', 'QUICK_REPLIES.hours']) expect(guide).toContain(reply)
    expect(guide).toContain("useState<'rw' | 'en'>('rw')")
    expect(service).toContain("quick_hours_unconfigured")
  })

  it('does not invent an agent, hours, or response time', () => {
    expect(guide).toContain("WA_CONFIG.agentName || t('whatsapp.agent_name_unpublished')")
    expect(guide).toContain("WA_CONFIG.responseHours.weekdays || t('whatsapp.hours_unpublished')")
    expect(guide).toContain("WA_CONFIG.responseHours.responseTime || t('whatsapp.response_time_unpublished')")
    expect(guide).not.toContain('Support Team')
    expect(guide).not.toContain('within 30 minutes')
  })

  it('provides translated clipboard feedback and safe-use reminders', () => {
    expect(guide).toContain('navigator.clipboard.writeText')
    expect(guide).toContain("t('whatsapp.guide_copy_failed')")
    expect(guide).toContain("t('whatsapp.guide_usage_pin')")
    expect(guide).toContain('min-h-11')
  })

  it('has matching verified Kinyarwanda guide translations', () => {
    for (const key of ['guide_title', 'guide_subtitle', 'guide_setup_required', 'guide_topic_payment', 'guide_topic_delivery', 'guide_topic_returns', 'guide_topic_authenticity', 'guide_topic_hours', 'guide_copy', 'guide_copied', 'guide_usage_pin']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
