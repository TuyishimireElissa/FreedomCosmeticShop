'use client'

import { useEffect, useState } from 'react'

export function useOfflineDetection() {
  const [isOffline, setIsOffline] = useState(false)
  const [isConnectionKnown, setIsConnectionKnown] = useState(false)

  useEffect(() => {
    const updateStatus = () => {
      setIsOffline(!navigator.onLine)
      setIsConnectionKnown(true)
    }

    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  return {
    isOffline,
    isOnline: isConnectionKnown && !isOffline,
    isConnectionKnown,
  }
}
