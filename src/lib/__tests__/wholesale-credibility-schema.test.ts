import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8')
const application = schema.slice(schema.indexOf('model WholesaleApplication'), schema.indexOf('model ProductPricing'))
const credit = schema.slice(schema.indexOf('model WholesaleCredit'), schema.indexOf('model CreditHistory'))
const invoice = schema.slice(schema.indexOf('model WholesaleInvoice'), schema.indexOf('model WholesaleReorder'))

describe('honest wholesale database foundation', () => {
  it('adds structured Rwanda business identity and document evidence without removing legacy fields', () => {
    for (const field of ['tradingName','tinNumber','rdbNumber','vatRegistered','ownerName','ownerPhone','businessRegistrationDoc','tinCertificateDoc','ownerIdDoc','additionalDocs']) expect(application).toContain(field)
    expect(application).toContain('documents               String @default("[]")')
    expect(application).toContain('nationalId')
    expect(application).toContain('appliedAt DateTime @default(now())')
  })

  it('stores approval decisions but does not pre-activate credit capability', () => {
    for (const field of ['approvedCreditLimit','paymentTermsDays','discountTier','assignedAgentId','approvedAt','approvedBy']) expect(application).toContain(field)
    expect(credit).toContain('isActive   Boolean @default(false)')
    expect(credit).toContain('isSuspended      Boolean @default(false)')
    expect(credit).toContain('creditRating String @default("NEW")')
    expect(credit).not.toContain('isActive   Boolean @default(true)')
  })

  it('preserves integer RWF money and adds real payment and overdue tracking', () => {
    for (const field of ['creditLimit     Int','usedCredit      Int','availableCredit Int','totalPaid      Int','totalOverdue   Int']) expect(credit).toContain(field)
    for (const field of ['paidAmount','balanceDue','paymentMethod','isOverdue','daysOverdue','overdueRemindersSent','lastReminderDate','pdfUrl']) expect(invoice).toContain(field)
    expect(invoice).toContain('subtotal    Int')
    expect(invoice).toContain('totalAmount Int')
  })

  it('adds reorder and retention records without fake customer counters', () => {
    expect(schema).toContain('model WholesaleReorder')
    expect(schema).toContain('originalOrderId String')
    expect(schema).toContain('model WholesaleRetentionMetric')
    expect(schema).toContain('totalOrders    Int @default(0)')
    expect(schema).toContain('totalSpent     Int @default(0)')
    expect(schema).toContain('reorderRateBps Int @default(0)')
    expect(schema).not.toContain('trustedBusinesses')
    expect(schema).not.toContain('fakeCustomerCount')
  })

  it('does not encode unconfirmed discount percentages, approval times, or staff identity', () => {
    expect(application).not.toContain('BRONZE')
    expect(application).not.toContain('approvalTimeDays')
    expect(application).not.toContain('Wholesale Account Manager')
  })
})
