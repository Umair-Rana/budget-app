import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { SyncState } from '@/data/sync/sync-state'
import {
  createInitialNetworkSnapshot,
  getNetworkSnapshotAfterStatus,
  type NetworkSnapshot,
} from '@/lib/network-status'
import { createNetworkStatusAdapter } from '@/lib/network-status-adapter'
import { invalidateFinanceData } from '@/lib/query-invalidation'
import {
  NetworkStatusContext,
  type NetworkStatusContextValue,
} from '@/providers/network-context'

const reconnectingDurationMs = 2_000

function getNavigator() {
  return typeof window === 'undefined' ? undefined : window.navigator
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(() =>
    createInitialNetworkSnapshot(getNavigator()),
  )
  const lastOnlineRef = useRef(snapshot.isOnline)

  const setSyncState = useCallback((syncState: SyncState) => {
    setSnapshot((current) => ({
      ...current,
      syncState: current.isOnline ? syncState : SyncState.OFFLINE,
    }))
  }, [])

  useEffect(() => {
    let reconnectingTimer: ReturnType<typeof setTimeout> | null = null
    let active = true
    const cleanupCallbacks: Array<() => void> = []
    const adapter = createNetworkStatusAdapter()

    function clearReconnectingTimer() {
      if (reconnectingTimer !== null) {
        clearTimeout(reconnectingTimer)
        reconnectingTimer = null
      }
    }

    function finishReconnectingSoon() {
      clearReconnectingTimer()

      reconnectingTimer = setTimeout(() => {
        setSnapshot((current) => ({
          ...current,
          isReconnecting: false,
        }))
      }, reconnectingDurationMs)
    }

    function applyStatus(
      status: Parameters<typeof getNetworkSnapshotAfterStatus>[1],
    ) {
      if (!active) {
        return
      }

      const wasOnline = lastOnlineRef.current
      lastOnlineRef.current = status.connected

      if (!status.connected) {
        clearReconnectingTimer()
      }

      setSnapshot((current) => ({
        ...getNetworkSnapshotAfterStatus(current, status),
        isReconnecting: status.connected && !wasOnline,
      }))

      if (status.connected && !wasOnline) {
        finishReconnectingSoon()
        void invalidateFinanceData(queryClient)
      }
    }

    async function refreshStatus() {
      try {
        applyStatus(await adapter.getCurrentStatus())
      } catch {
        // Keep the last known status if a platform status check fails.
      }
    }

    void refreshStatus()

    void Promise.resolve(
      adapter.addNetworkStatusListener((status) => applyStatus(status)),
    ).then((cleanup) => {
      if (!active) {
        cleanup()
        return
      }

      cleanupCallbacks.push(cleanup)
    })

    void Promise.resolve(adapter.addResumeListener(refreshStatus)).then(
      (cleanup) => {
        if (!active) {
          cleanup()
          return
        }

        cleanupCallbacks.push(cleanup)
      },
    )

    return () => {
      active = false
      clearReconnectingTimer()
      for (const cleanup of cleanupCallbacks) {
        cleanup()
      }
    }
  }, [queryClient])

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
