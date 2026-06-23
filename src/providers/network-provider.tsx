import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { SyncState } from '@/data/sync/sync-state'
import {
  createInitialNetworkSnapshot,
  getBrowserConnectionType,
  getNetworkSnapshotAfterOffline,
  getNetworkSnapshotAfterOnline,
  type NetworkSnapshot,
} from '@/lib/network-status'
import {
  NetworkStatusContext,
  type NetworkStatusContextValue,
} from '@/providers/network-context'

const reconnectingDurationMs = 2_000

function getNavigator() {
  return typeof window === 'undefined' ? undefined : window.navigator
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(() =>
    createInitialNetworkSnapshot(getNavigator()),
  )

  const setSyncState = useCallback((syncState: SyncState) => {
    setSnapshot((current) => ({
      ...current,
      syncState: current.isOnline ? syncState : SyncState.OFFLINE,
    }))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    let reconnectingTimer: ReturnType<typeof setTimeout> | null = null

    function clearReconnectingTimer() {
      if (reconnectingTimer !== null) {
        clearTimeout(reconnectingTimer)
        reconnectingTimer = null
      }
    }

    function handleOnline() {
      clearReconnectingTimer()

      setSnapshot((current) =>
        getNetworkSnapshotAfterOnline(current, window.navigator),
      )

      reconnectingTimer = setTimeout(() => {
        setSnapshot((current) => ({
          ...current,
          isReconnecting: false,
        }))
      }, reconnectingDurationMs)
    }

    function handleOffline() {
      clearReconnectingTimer()
      setSnapshot(getNetworkSnapshotAfterOffline)
    }

    function handleConnectionChange() {
      setSnapshot((current) => ({
        ...current,
        connectionType: current.isOnline
          ? getBrowserConnectionType(window.navigator)
          : 'none',
      }))
    }

    const connection = (
      window.navigator as Navigator & {
        connection?: EventTarget
      }
    ).connection

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    connection?.addEventListener('change', handleConnectionChange)

    return () => {
      clearReconnectingTimer()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      connection?.removeEventListener('change', handleConnectionChange)
    }
  }, [])

  const value = useMemo<NetworkStatusContextValue>(
    () => ({
      ...snapshot,
      setSyncState,
    }),
    [setSyncState, snapshot],
  )

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  )
}
