export type InvoicePaymentSnapshot = {
  status: string
  amount: number
  method: string
  completedAt: Date | null
}

export function getInvoicePaymentSummary(
  payments: InvoicePaymentSnapshot[],
  totalAmount: number,
  dueDate: Date | null,
  now = new Date()
) {
  const refunded = payments.some((payment) => payment.status === 'REFUNDED')
  const paidPayments = payments.filter((payment) => payment.status === 'PAID')
  const paidAmount = Math.min(totalAmount, paidPayments.reduce((sum, payment) => sum + payment.amount, 0))
  const isPaid = !refunded && paidAmount >= totalAmount
  const isOverdue = !isPaid && !refunded && dueDate !== null && dueDate.getTime() < now.getTime()
  const daysOverdue = isOverdue ? Math.max(1, Math.floor((now.getTime() - dueDate!.getTime()) / 86_400_000)) : 0
  const allFailed = payments.length > 0 && payments.every((payment) => payment.status === 'FAILED')
  const paymentStatus = refunded ? 'REFUNDED' : isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : allFailed ? 'FAILED' : 'PENDING'
  const paidAt = isPaid
    ? paidPayments.map((payment) => payment.completedAt).filter((date): date is Date => date !== null).sort((a, b) => b.getTime() - a.getTime())[0] || null
    : null

  return {
    paymentStatus,
    isPaid,
    paidAt,
    paidAmount: refunded ? 0 : paidAmount,
    balanceDue: refunded ? 0 : Math.max(0, totalAmount - paidAmount),
    paymentMethod: paidPayments[0]?.method || payments[0]?.method || null,
    isOverdue,
    daysOverdue,
  }
}
