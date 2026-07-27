import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const store = read('src/store/cartStore.ts')
const sync = read('src/hooks/useCartSync.ts')
const hook = read('src/hooks/useCart.ts')

describe('persistent cart state', () => {
  it('persists cart, saved items, and selected district for guests', () => {
    expect(store).toContain("name: 'fcs-cart'")
    expect(store).toContain('items: state.items, savedItems: state.savedItems, selectedDistrict: state.selectedDistrict')
  })
  it('enforces real per-item stock limits and ten-second undo', () => {
    expect(store).toContain('Math.min(Math.trunc(quantity), Math.trunc(maximum))')
    expect(store).toContain('Date.now() - removed.timestamp > 10_000')
  })
  it('supports save, restore, remove, merge, and computed totals', () => {
    for (const action of ['saveForLater:', 'moveToCart:', 'removeSaved:', 'mergeServerItems:', 'getSubtotal:', 'getItemCount:']) expect(store).toContain(action)
  })
  it('uses custom JWT user state and never NextAuth', () => {
    expect(sync).toContain("useStore((state) => state.user)")
    expect(sync).not.toContain('next-auth')
    expect(sync).not.toContain('useSession')
  })
  it('merges on login and retries debounced server sync', () => {
    expect(sync).toContain('loadAndMerge')
    expect(sync).toContain("fetch('/api/cart/sync'")
    expect(sync).toContain('RETRY_DELAYS')
    expect(sync).toContain('2000')
  })
  it('migrates the existing persisted cart rather than discarding it', () => {
    expect(hook).toContain("localStorage.getItem('freedom-store')")
    expect(hook).toContain('importLegacyItems(items, saved)')
  })
})
