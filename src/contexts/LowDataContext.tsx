'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  isLowDataPreference,
  isSlowNetwork,
  LOW_DATA_STORAGE_KEY,
  type LowDataPreference,
  type NetworkConnectionSnapshot,
} from '@/lib/low-data'

interface NetworkInformationLike extends NetworkConnectionSnapshot {
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
  addListener?: (listener: () => void) => void
  removeListener?: (listener: () => void) => void
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike
  mozConnection?: NetworkInformationLike
  webkitConnection?: NetworkInformationLike
}

interface LowDataContextValue {
  isLowData: boolean
  isSlowConnection: boolean
  connectionType: string
  saveData: boolean
  toggleLowData: () => void
  userPreference: LowDataPreference
  setUserPreference: (preference: LowDataPreference) => void
}

const LowDataContext = createContext<LowDataContextValue | null>(null)

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined
  const networkNavigator = navigator as NavigatorWithConnection
  return networkNavigator.connection || networkNavigator.mozConnection || networkNavigator.webkitConnection
}

export function LowDataProvider({ children }: { children: ReactNode }) {
  const [userPreference, setUserPreferenceState] = useState<LowDataPreference>('auto')
  const [isSlowConnection, setIsSlowConnection] = useState(false)
  const [connectionType, setConnectionType] = useState('unknown')
  const [saveData, setSaveData] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOW_DATA_STORAGE_KEY)
      if (isLowDataPreference(stored)) setUserPreferenceState(stored)
    } catch {
      // Automatic mode remains available when storage is blocked.
    }
  }, [])

  const setUserPreference = useCallback((preference: LowDataPreference) => {
    setUserPreferenceState(preference)
    try {
      localStorage.setItem(LOW_DATA_STORAGE_KEY, preference)
    } catch {
      // Keep the in-memory preference when storage is unavailable.
    }
  }, [])

  useEffect(() => {
    const syncPreference = (event: StorageEvent) => {
      if (event.key === LOW_DATA_STORAGE_KEY && isLowDataPreference(event.newValue)) {
        setUserPreferenceState(event.newValue)
      }
    }
    window.addEventListener('storage', syncPreference)
    return () => window.removeEventListener('storage', syncPreference)
  }, [])

  useEffect(() => {
    const connection = getConnection()
    if (!connection) return

    const updateNetworkInfo = () => {
      setSaveData(connection.saveData === true)
      setConnectionType(connection.effectiveType || 'unknown')
      setIsSlowConnection(isSlowNetwork(connection))
    }

    updateNetworkInfo()
    if (connection.addEventListener) {
      connection.addEventListener('change', updateNetworkInfo)
      return () => connection.removeEventListener?.('change', updateNetworkInfo)
    }
    connection.addListener?.(updateNetworkInfo)
    return () => connection.removeListener?.(updateNetworkInfo)
  }, [])

  const isLowData = userPreference === 'on'
    || (userPreference === 'auto' && (isSlowConnection || saveData))

  const toggleLowData = useCallback(() => {
    setUserPreference(isLowData ? 'off' : 'on')
  }, [isLowData, setUserPreference])

  useEffect(() => {
    document.documentElement.dataset.lowData = isLowData ? 'true' : 'false'
    document.documentElement.dataset.connectionType = connectionType
  }, [connectionType, isLowData])

  const value = useMemo<LowDataContextValue>(() => ({
    isLowData,
    isSlowConnection,
    connectionType,
    saveData,
    toggleLowData,
    userPreference,
    setUserPreference,
  }), [connectionType, isLowData, isSlowConnection, saveData, setUserPreference, toggleLowData, userPreference])

  return <LowDataContext.Provider value={value}>{children}</LowDataContext.Provider>
}

export function useLowData() {
  const context = useContext(LowDataContext)
  if (!context) throw new Error('useLowData must be used within LowDataProvider')
  return context
}
