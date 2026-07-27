import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const schema = read('prisma/schema.prisma')
const writeApi = read('src/app/api/analytics/whatsapp-click/route.ts')
const adminApi = read('src/app/api/admin/analytics/whatsapp/route.ts')
const view = read('src/components/admin/WhatsAppAnalytics.tsx')
const admin = read('src/components/admin/AdminAnalytics.tsx')

describe('PII-free WhatsApp analytics', () => {
  it('stores only funnel metadata and no identity or message content', () => {
    const model = schema.slice(schema.indexOf('model WhatsAppClick'), schema.indexOf('model SearchLog'))
    for (const field of ['eventType', 'productId', 'productSlug', 'cartTotal', 'district', 'language', 'pagePath', 'createdAt']) expect(model).toContain(field)
    for (const pii of ['productName', 'sessionId', 'userId', 'phone', 'email', 'message']) expect(model).not.toContain(pii)
    expect(model).toContain('cartTotal   Int?')
  })

  it('strictly validates public writes, real products and Rwanda districts', () => {
    expect(writeApi).toContain('}).strict()')
    expect(writeApi).toContain('getAllDistricts().includes(data.district)')
    expect(writeApi).toContain('id: data.productId, slug: data.productSlug, isDeleted: false')
    expect(writeApi).toContain('INVALID_ORIGIN')
    expect(writeApi).toContain('RATE_LIMITED')
    expect(writeApi).not.toContain('requireAuth')
    for (const pii of ['productName:', 'sessionId:', 'userId:', 'phone:', 'email:', 'message:']) expect(writeApi).not.toContain(pii)
  })

  it('protects analytics reads with custom JWT permissions, never NextAuth', () => {
    expect(adminApi).toContain('requirePermission(PERMISSIONS.ANALYTICS_READ)')
    expect(adminApi).not.toContain('getServerSession')
    expect(adminApi).not.toContain('next-auth')
  })

  it('joins current product names only in the protected admin response', () => {
    expect(adminApi).toContain("select: { id: true, name: true, slug: true }")
    expect(adminApi).toContain('productName: product.name')
    expect(view).toContain("fetch('/api/admin/analytics/whatsapp'")
    expect(admin).toContain('<WhatsAppAnalytics />')
  })

  it('tracks all active storefront WhatsApp entry points non-blockingly', () => {
    const sources = [
      'src/components/products/OrderViaWhatsApp.tsx',
      'src/components/cart/CartWhatsAppOrder.tsx',
      'src/components/support/WhatsAppSupportView.tsx',
      'src/components/ui/WhatsAppButton.tsx',
      'src/components/home/WhatsAppCTA.tsx',
      'src/components/checkout/AddressForm.tsx',
      'src/components/checkout/ConfirmationView.tsx',
      'src/components/checkout/MoMoWaiting.tsx',
      'src/components/storefront/CartView.tsx',
      'src/components/storefront/TrackOrderView.tsx',
    ]
    for (const source of sources) expect(read(source)).toContain('trackWhatsAppClick(')
  })
})
