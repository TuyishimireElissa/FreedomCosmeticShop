import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Phase 4 — the admin category screen.
 *
 * The category API was complete for months but nothing called it, so the owner
 * could not add or rename a category without a developer. These assertions pin
 * the decisions that make the screen safe to hand over.
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const raw = read('src/components/admin/AdminCategories.tsx')
// The file explains its own choices in prose; strip comments so a comment can
// never satisfy an assertion about the code.
const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const page = read('src/app/admin/categories/page.tsx')
const sidebar = read('src/components/admin/AdminSidebar.tsx')
const shell = read('src/components/admin/AdminShellContext.tsx')

describe('admin category screen is wired into the panel', () => {
  it('adds a categories tab to the shell union', () => {
    expect(shell).toMatch(/\|\s*'categories'/)
  })

  it('adds one nav item pointing at its own page', () => {
    const matches = sidebar.match(/href:\s*'\/admin\/categories'/g) || []
    expect(matches, 'exactly one Categories nav entry').toHaveLength(1)
    expect(sidebar).toContain("{ label: 'Categories'")
  })

  it('gates the nav item behind the products permission', () => {
    const line = sidebar.split('\n').find((l) => l.includes("'/admin/categories'")) || ''
    expect(line).toContain("permission: 'products.read'")
  })

  it('renders the component from its route', () => {
    expect(page).toContain("import AdminCategories from '@/components/admin/AdminCategories'")
    expect(page).toContain('<AdminCategories />')
  })
})

describe('the screen follows the existing admin conventions', () => {
  it('uses useState and fetch, not TanStack Query', () => {
    expect(code).toContain('useState')
    expect(code).toContain('fetch(')
    // The provider is mounted but no component uses these; this is not the
    // place to introduce a second data-fetching pattern.
    expect(code).not.toContain('useQuery')
    expect(code).not.toContain('useMutation')
  })

  it('hand-rolls the table markup the other admin screens use', () => {
    expect(code).toContain('<table className="w-full text-sm">')
    expect(code).toContain('className="px-3 py-3 text-left font-medium"')
    // Quote-agnostic: the file uses double quotes, so a single-quoted needle
    // silently passed here and let a shadcn Table import survive mutation M4.
    expect(code).not.toMatch(/@\/components\/ui\/table/)
  })

  it('reports every outcome through the shared toast', () => {
    expect(code).toContain('useToast')
    expect(code).toContain("variant: \"destructive\"")
  })

  it('extends the shared primitives instead of rebuilding them', () => {
    for (const primitive of ['switch', 'dialog', 'alert-dialog', 'badge', 'button', 'input', 'label', 'skeleton', 'textarea']) {
      expect(code, `should import ui/${primitive}`).toContain(`@/components/ui/${primitive}`)
    }
  })

  it('uses no raw hex colours', () => {
    // Brand colour must come from fcs-* tokens, never a literal.
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('respects reduced motion on every spinner', () => {
    const spinners = code.match(/animate-spin/g) || []
    const optOuts = code.match(/motion-reduce:animate-none/g) || []
    expect(spinners.length).toBeGreaterThan(0)
    expect(optOuts.length, 'every animate-spin needs a reduced-motion opt-out').toBe(spinners.length)
  })
})

describe('hiding a stocked category is guarded', () => {
  it('asks for confirmation instead of hiding on one tap', () => {
    expect(code).toContain('function requestToggle')
    expect(code).toContain('if (!next && productCount(category) > 0)')
    expect(code).toContain('setConfirmHide(category)')
    expect(code).toContain('AlertDialog')
  })

  it('says the products are not deleted', () => {
    expect(raw).toContain('The products are not deleted')
  })

  it('hides an empty category without a prompt', () => {
    // The guard is conditional on the count, not on the direction alone.
    expect(code).toMatch(/if \(!next && productCount\(category\) > 0\) \{[\s\S]{0,80}return/)
    expect(code).toContain('void applyVisibility(category, next)')
  })

  it('rolls the switch back when the request fails', () => {
    expect(code).toContain('isActive: !isActive')
    expect(code).toContain('Could not change visibility')
  })
})

describe('the edit dialog cannot break a shared link', () => {
  it('never sends a slug when saving', () => {
    // The API keeps the slug stable, and this screen has no slug field at all.
    const payload = code.slice(code.indexOf('const payload = {'), code.indexOf('const response = await fetch(\n        editing'))
    expect(payload.length).toBeGreaterThan(20)
    expect(payload).not.toContain('slug')
  })

  it('tells the owner the address will not change', () => {
    expect(raw).toContain('The web address stays the same when you rename')
  })

  it('edits the Kinyarwanda name as data', () => {
    expect(code).toContain('nameRw')
    expect(code).toContain('cat-name-rw')
  })
})

describe('the list stays honest', () => {
  it('subscribes to realtime category events', () => {
    expect(code).toContain('useCategoryUpdates')
    // Quiet refetch: a background update must not flash the skeleton.
    expect(code).toContain('void load(true)')
  })

  it('orders by sortOrder from the API rather than re-sorting locally', () => {
    expect(code).not.toContain('.sort(')
  })

  it('treats a missing count as zero rather than showing nothing', () => {
    expect(code).toContain('category._count?.products ?? 0')
  })

  it('puts a new category after the last one', () => {
    expect(code).toContain('Math.max(max, category.sortOrder), 0) + 1')
  })

  it('labels the visibility switch per row for screen readers', () => {
    expect(code).toMatch(/aria-label=\{`\$\{category\.isActive \? "Hide" : "Show"\} \$\{category\.name\}`\}/)
  })
})
