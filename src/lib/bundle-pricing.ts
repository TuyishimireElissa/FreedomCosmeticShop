export interface BundlePriceItem {
  quantity: number
  product: { price: number; stock: number }
}

export function calculateBundleFacts(bundlePrice: number, items: BundlePriceItem[]) {
  const normalTotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const savings = normalTotal - bundlePrice
  const savingsPercent = normalTotal > 0 ? Math.round((savings / normalTotal) * 100) : 0
  const isInStock = items.length > 0 && items.every((item) => item.quantity > 0 && item.product.stock >= item.quantity)
  const maxQuantity = items.length > 0
    ? Math.max(0, Math.min(...items.map((item) => item.quantity > 0 ? Math.floor(item.product.stock / item.quantity) : 0)))
    : 0
  return { normalTotal, savings, savingsPercent, isInStock, maxQuantity }
}
