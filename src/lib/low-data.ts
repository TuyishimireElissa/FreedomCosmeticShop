export type LowDataPreference = 'auto' | 'on' | 'off'

export interface NetworkConnectionSnapshot {
  effectiveType?: string
  downlink?: number
  saveData?: boolean
}

export const LOW_DATA_STORAGE_KEY = 'fcs_low_data_pref'

export function isLowDataPreference(value: unknown): value is LowDataPreference {
  return value === 'auto' || value === 'on' || value === 'off'
}

export function isSlowNetwork(connection?: Pick<NetworkConnectionSnapshot, 'effectiveType' | 'downlink'> | null) {
  if (!connection) return false
  return connection.effectiveType === 'slow-2g'
    || connection.effectiveType === '2g'
    || (typeof connection.downlink === 'number' && connection.downlink < 1)
}
