# Phase 4 plan — admin category management UI

**Status:** planned, not built. Awaiting owner's mobile-device green light.
**Written:** 2026-08-14, after Phases 1–3 deployed at `eb6643a`.

---

## Scope: UI only

Phase 0 established that the entire backend already exists and is deployed:

| Endpoint | State | Does Phase 4 change it? |
| --- | --- | --- |
| `GET /api/admin/categories` | works, returns `_count.products`, ordered by `sortOrder` since Phase 1 | no |
| `POST /api/admin/categories` | works, accepts `nameRw` since Phase 1 | no |
| `PUT /api/admin/categories/[id]` | works, accepts `isActive` and `nameRw` | no |
| `DELETE /api/admin/categories/[id]` | soft-delete only, sets `isActive: false` | no |
| Permission gates | `PRODUCTS_READ` / `PRODUCTS_UPDATE`; DELETE also needs `requireDestructiveOperation` | no |
| Activity log | writes `entityType: "CATEGORY"` | no |
| Realtime broadcast | `category:created` / `:updated` / `:deactivated` | no |
| Storefront listener | `use-realtime.ts` L113 already subscribes | no |

**No API work. No schema work.** Toggling a category off in admin will remove
it from the storefront nav instantly, because that path is already wired
end-to-end.

---

## ⚠️ One correction to the brief before starting

**Step 4D says "use the existing TanStack Query pattern from other admin
components." There is no such pattern.**

Verified:

- `@tanstack/react-query@^5.0.0` **is** in `package.json`
- `QueryClientProvider` **is** mounted in `src/components/Providers.tsx`
- **Zero components call `useQuery`, `useMutation` or `QueryClient`** — the
  grep returns only `Providers.tsx` itself

Every admin component fetches with `useState` + `useEffect` + `fetch`, e.g.
`AdminCustomers.tsx` L268+.

**Rule 17 says match existing admin patterns exactly**, and Rule 10 says extend
rather than duplicate. Introducing the first real TanStack usage in this
codebase, in a single page, would create a second data-fetching convention for
one screen.

**Recommendation:** follow the actual admin pattern — `useState` + `fetch` +
`useToast` — and note the deviation from 4D in the commit. **Owner decision
required before I start.**

---

## Files to create

| File | Purpose |
| --- | --- |
| `src/app/admin/categories/page.tsx` | route; inherits the existing admin layout |
| `src/components/admin/AdminCategories.tsx` | the table, toggle, edit and create dialogs |

## Files to modify

| File | Change |
| --- | --- |
| `src/components/admin/AdminShellContext.tsx` L5–11 | add `'categories'` to the `AdminTab` union |
| `src/components/admin/AdminSidebar.tsx` L47–75 | add the nav item, `permission: 'products.update'` |

---

## Component design

Matching `AdminCustomers.tsx` and `AdminDeliveries.tsx` exactly.

**Table markup is raw `<table>`**, not a shadcn primitive — Phase 0 confirmed
no `table.tsx` exists, and five admin components already use
`<table className="w-full text-sm">` with
`<th className="px-3 py-3 text-left font-medium">`. Creating a `Table`
primitive for one page would duplicate a pattern used in five places.

**Primitives that DO exist and will be used:** `switch.tsx`, `dialog.tsx`,
`badge.tsx`, `button.tsx`, `input.tsx`, `label.tsx`, `toast.tsx`,
`skeleton.tsx`.

### Columns

| Column | Content |
| --- | --- |
| Order | `sortOrder` |
| Name | English name, with `nameRw` beneath in smaller muted text |
| Slug | monospace |
| Products | live count — green pill if > 0, amber if 0 |
| Status | green **Active** / grey **Hidden** badge |
| Actions | `Switch` toggle + Edit button |

### Toggle

- `Switch` primitive, `PUT /api/admin/categories/[id]` with
  `{ isActive: !current }`
- optimistic update, rolled back on error
- `useToast` on success and failure
- **no page reload** — the realtime broadcast already updates the storefront

### Edit dialog

Fields: `name`, `nameRw`, `description`, `sortOrder`, image upload.
Save → `PUT`. Cancel closes without saving.

**Image upload:** must reuse the existing product-image upload path rather than
invent one. `AdminProductImageManager.tsx` is the reference. Note that category
`image` is a plain URL column, not a `ProductImage` relation — three of seven
existing categories have one, all Cloudinary `/fetch/` URLs.

### Create dialog

Fields: slug (auto-generated from the English name, editable), `name`,
`nameRw`, `description`, `sortOrder`. Validates slug uniqueness client-side
against the loaded list; the API also enforces it and appends a suffix on
collision.

### Realtime

Subscribe via the existing `use-realtime` hook to
`category:created|updated|deactivated` and refetch. This is how a second admin
tab stays in sync.

### States

Loading skeleton, error with retry, and a friendly empty state — matching how
`AdminCustomers` handles all three.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `sortOrder` collisions from manual edits | the UI cannot prevent duplicates; the API accepts any integer. Ties break by name. Flag in the UI if two rows share a value. |
| Renaming changes the slug | `PUT` regenerates the slug when `name` changes, which **breaks existing category URLs and any shared link**. Needs a visible warning in the edit dialog, or slug should be locked after creation. **Owner decision needed.** |
| Toggling off a stocked category | hides 44 products with one tap. Consider a confirmation when `_count.products > 0`. |
| Deleting via the API | `DELETE` only deactivates, never removes. Correct — products reference the row. No delete button in the UI; the toggle is sufficient. |

---

## Test plan

- toggle calls `PUT` with the correct id and inverted `isActive`
- optimistic update rolls back on a failed request
- edit dialog sends `nameRw` and the API persists it
- create validates slug uniqueness
- no raw hex; `fcs-*` tokens only
- table renders at 360px — admin may be used on a phone
- mutation-test every new assertion, with input that can actually fail

---

## Out of scope

Deleting categories · reassigning products between categories (that is Phase 6)
· editing `parentId` (hierarchy exists in the schema but **0 rows use it**;
exposing it would invite a tree nobody has asked for).
