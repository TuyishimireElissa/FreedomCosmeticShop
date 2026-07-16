import { prisma } from '@/lib/prisma'

/** Recheck current product and bundle-component stock immediately before payment initiation. */
export async function validateOrderStockForPayment(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: {
      product: { select: { id: true, name: true, stock: true, isActive: true, isDeleted: true } },
      bundle: { include: { products: { include: { product: { select: { id: true, name: true, stock: true, isActive: true, isDeleted: true } } } } } },
    },
  })
  const required = new Map<string, { name: string; stock: number; quantity: number; available: boolean }>()
  const add = (product: { id: string; name: string; stock: number; isActive: boolean; isDeleted: boolean }, quantity: number) => {
    const current = required.get(product.id)
    required.set(product.id, { name: product.name, stock: product.stock, quantity: (current?.quantity || 0) + quantity, available: product.isActive && !product.isDeleted })
  }
  for (const item of items) {
    if (item.product) add(item.product, item.quantity)
    if (item.bundle) for (const component of item.bundle.products) add(component.product, component.quantity * item.quantity)
  }
  const unavailable = [...required.values()].filter((item) => !item.available || item.stock < item.quantity)
  return { available: unavailable.length === 0, unavailable }
}
