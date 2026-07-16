import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const footer = read('src/components/layout/Footer.tsx')
const navbar = read('src/components/layout/Navbar.tsx')
const sidebar = read('src/components/admin/AdminSidebar.tsx')
const analyticsPage = read('src/app/admin/analytics/page.tsx')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

describe('WhatsApp support and admin navigation', () => {
  it('adds translated support links to the footer and desktop/mobile navbar', () => {
    expect(footer).toContain('href="/support/whatsapp"')
    expect(footer).toContain("t('footer.whatsapp_support')")
    expect(navbar).toContain("router.push('/support/whatsapp')")
    expect(navbar).toContain("t('nav.whatsapp_support')")
    expect(navbar).not.toContain('getWhatsAppLink')
  })

  it('links the guide and protected analytics from the admin sidebar', () => {
    expect(sidebar).toContain("href: '/admin/whatsapp-guide'")
    expect(sidebar).toContain("href: '/admin/analytics'")
    expect(sidebar).toContain("translationKey: 'whatsapp.admin_guide'")
    expect(sidebar).toContain("translationKey: 'whatsapp.admin_analytics'")
    expect(sidebar).toContain('min-h-11')
    expect(analyticsPage).toContain('<AdminFeaturePage tab="analytics" />')
  })

  it('has matching verified navigation translations', () => {
    expect(en).toContain("whatsapp_support: 'WhatsApp Support'")
    expect(rw).toMatch(/whatsapp_support: 'Ubufasha kuri WhatsApp'.*verified-rw/)
    for (const key of ['admin_guide', 'admin_analytics']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
