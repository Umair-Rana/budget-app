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
  initializeLastKnownNetworkConnected,
  setLastKnownNetworkConnected,
  type NetworkSnapshot,
} from '@/lib/network-status'
import { createNetworkStatusAdapter } from '@/lib/network-status-adapter'
import { triggerLocalSqliteSyncIfAvailable } from '@/lib/local-sqlite-sync-trigger'
import { invalidateFinanceData } from '@/lib/query-invalidation'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
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
  const { dataSource } = useFinanceDataSource()
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(() => {
    const initialSnapshot = createInitialNetworkSnapshot(getNavigator())
    initializeLastKnownNetworkConnected(initialSnapshot.isOnline)
    return initialSnapshot
  })
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

    async function syncPendingLocalOperationsIfAvailable() {
      await triggerLocalSqliteSyncIfAvailable({
        dataSource,
        onSynced: () => invalidateFinanceData(queryClient),
      })
    }

    function applyStatus(
      status: Parameters<typeof getNetworkSnapshotAfterStatus>[1],
    ) {
      if (!active) {
        return
      }

      const wasOnline = lastOnlineRef.current
      lastOnlineRef.current = status.connected
      setLastKnownNetworkConnected(status.connected)

      if (!status.connected) {
        clearReconnectingTimer()
      }

      setSnapshot((current) => ({
        ...getNetworkSnapshotAfterStatus(current, status),
        isReconnecting: status.connected && !wasOnline,
      }))

      if (status.connected && !wasOnline) {
        finishReconnectingSoon()
        void syncPendingLocalOperationsIfAvailable()
        void invalidateFinanceData(queryClient)
      }
    }

    async function refreshStatus() {
      try {
        const status = await adapter.getCurrentStatus()
        const wasOnlineBeforeRefresh = lastOnlineRef.current
        applyStatus(status)

        if (status.connected && wasOnlineBeforeRefresh) {
          void syncPendingLocalOperationsIfAvailable()
        }
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
  }, [dataSource, queryClient])

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
