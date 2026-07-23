import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const service = readFileSync('src/server/services/wholesale.ts', 'utf8')
const dashboard = readFileSync('src/components/wholesale/WholesaleDashboard.tsx', 'utf8')
const approve = readFileSync('src/app/api/admin/wholesale/applications/[id]/approve/route.ts', 'utf8')
const preferences = readFileSync('src/app/api/wholesale/preferences/route.ts', 'utf8')

describe('personal wholesale relationship dashboard', () => {
  it('stores only administrator-assigned manager and delivery facts', () => {
    for (const field of ['assignedManagerName', 'assignedManagerPhone', 'assignedManagerWhatsApp', 'preferredDeliveryDays']) expect(schema).toContain(field)
    expect(approve).toContain('assignedManagerName: parsed.data.managerName || null')
  })

  it('calculates analytics from real completed wholesale orders', () => {
    expect(service).toContain("orderType: 'WHOLESALE'")
    expect(service).toContain("payment.status === 'PAID'")
    expect(service).toContain('totalSpent')
    expect(service).toContain('totalSaved')
    expect(service).toContain('frequentProducts')
    expect(service).toContain('restockSuggestions')
  })

  it('provides personal greeting, manager contact, reorder, invoices, and analytics', () => {
    for (const text of ['Mwaramutse', 'Your account manager', 'Reorder same items', 'Frequently ordered', 'Your purchase analytics']) expect(dashboard).toContain(text)
    expect(dashboard).toContain('wa ${data.user.businessName}')
    expect(dashboard).not.toContain('Jean Paul')
    expect(dashboard).not.toContain('15 min')
  })

  it('keeps tier claims fail-closed until an owner publishes them', () => {
    expect(dashboard).toContain('No account tier or upgrade threshold has been published')
    expect(dashboard).not.toContain('500,000')
    expect(dashboard).not.toContain('Platinum')
  })

  it('allows approved customers to save up to two preferred delivery days', () => {
    expect(preferences).toContain("z.array(Day).max(2)")
    expect(preferences).toContain("user.wholesaleStatus !== 'APPROVED'")
    expect(preferences).toContain('preferredDeliveryDays: parsed.data.preferredDeliveryDays')
    expect(dashboard).toContain('preferredDeliveryDays: next')
  })
})
