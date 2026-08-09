/**
 * Relative timestamps for the admin order list ("15m ago").
 *
 * Lives in its own `.ts` module rather than inside the `.tsx` view because the
 * test runner is configured for `src/**\/*.test.ts` in a node environment and
 * cannot parse JSX — every existing test reads components as text instead.
 * Keeping the logic here makes it directly executable.
 *
 * `now` is injectable so tests are not clock-dependent.
 */

type Translate = (key: string, vars?: Record<string, string | number>) => string

export function timeAgo(iso: string, t: Translate, now: number = Date.now()): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (mins < 1) return t('whatsapp.time_just_now')
  if (mins < 60) return t('whatsapp.time_minutes', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('whatsapp.time_hours', { count: hours })
  return t('whatsapp.time_days', { count: Math.floor(hours / 24) })
}
