export function percentage(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0 || numerator < 0) return 0
  return Math.round((numerator / denominator) * 10_000) / 100
}

export function boundedDays(value: string | null) {
  const parsed = Number(value || 30)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 365 ? parsed : null
}
