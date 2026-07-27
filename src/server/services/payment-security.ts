import { prisma } from '@/lib/prisma'

export async function recordPaymentSecurityAlert(input: {
  provider: 'PAYPACK' | 'FLUTTERWAVE'
  orderId: string
  orderNumber: string
  paymentId: string
  reason: string
  expectedAmount?: number
  receivedAmount?: number
}) {
  await prisma.securityAlert.create({
    data: {
      type: 'PAYMENT_WEBHOOK_MISMATCH',
      severity: 'CRITICAL',
      title: `${input.provider} webhook requires review`,
      message: `${input.provider} webhook rejected for order ${input.orderNumber}: ${input.reason}`,
      metadata: {
        provider: input.provider,
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        paymentId: input.paymentId,
        reason: input.reason,
        expectedAmount: input.expectedAmount,
        receivedAmount: input.receivedAmount,
      },
    },
  }).catch(() => null)
}
