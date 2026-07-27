import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/components/ui/WhatsAppButton.tsx'), 'utf8')
const chrome = readFileSync(resolve(process.cwd(), 'src/components/layout/SiteChrome.tsx'), 'utf8')
const en = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/en.ts'), 'utf8')
const rw = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/rw.ts'), 'utf8')

describe('context-aware floating WhatsApp button', () => {
  it('remains mounted globally but stays hidden on admin and checkout', () => {
    expect(chrome).toContain('<WhatsAppButton />')
    expect(source).toContain("pathname.startsWith('/admin')")
    expect(source).toContain("pathname.startsWith('/checkout')")
  })

  it('uses mobile WhatsApp and desktop WhatsApp Web links', () => {
    expect(source).toContain('https://web.whatsapp.com/send?phone=')
    expect(source).toContain('https://wa.me/${number}?text=')
    expect(source).toContain('buildWhatsAppUrl(contextMessage)')
  })

  it('uses page-aware messages and event types', () => {
    expect(source).toContain("pathname.startsWith('/products/') ? t('whatsapp.floating_product')")
    expect(source).toContain("pathname === '/cart' ? t('whatsapp.floating_cart')")
    expect(source).toContain("t('whatsapp.floating_order')")
    expect(source).toContain("? 'product_inquiry'")
    expect(source).toContain("? 'track_order'")
  })

  it('shows a one-time delayed tooltip without false online, agent, hours, or response claims', () => {
    expect(source).toContain("sessionStorage.getItem('wa-tooltip-seen')")
    expect(source).toContain('5000')
    expect(source).toContain('WA_CONFIG.agentName || BUSINESS.tradingName')
    expect(source).toContain("WA_CONFIG.responseHours.responseTime || t('whatsapp.response_time_unpublished')")
    expect(source).not.toContain('animate-pulse')
    expect(source).not.toContain('Online')
  })

  it('opens before non-blocking tracking and meets touch target requirements', () => {
    expect(source.indexOf('window.open(url')).toBeLessThan(source.indexOf('trackWhatsAppClick(eventType'))
    expect(source).toContain('h-14 w-14')
    expect(source).toContain('h-11 w-11')
  })

  it('has matching verified translations', () => {
    for (const key of ['floating_product', 'floating_cart', 'floating_order', 'floating_invitation', 'response_time_unpublished']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
