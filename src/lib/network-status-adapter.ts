import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'

import {
  getBrowserConnectionType,
  normalizeConnectionType,
  type ConnectionType,
} from '@/lib/network-status'

export interface NetworkAdapterStatus {
  connectionType: ConnectionType
  connected: boolean
}

export type NetworkStatusListener = (status: NetworkAdapterStatus) => void
export type NetworkResumeListener = () => void

export interface NetworkStatusAdapter {
  addNetworkStatusListener(
    listener: NetworkStatusListener,
  ): Promise<() => void> | (() => void)
  addResumeListener(
    listener: NetworkResumeListener,
  ): Promise<() => void> | (() => void)
  getCurrentStatus(): Promise<NetworkAdapterStatus>
}

function getNavigator() {
  return typeof window === 'undefined' ? undefined : window.navigator
}

function getBrowserStatus(): NetworkAdapterStatus {
  const navigatorRef = getNavigator()
  const connected = navigatorRef?.onLine ?? true

  return {
    connectionType: connected ? getBrowserConnectionType(navigatorRef) : 'none',
    connected,
  }
}

export function createWebNetworkStatusAdapter(): NetworkStatusAdapter {
  return {
    addNetworkStatusListener(listener) {
      if (typeof window === 'undefined') {
        return () => undefined
      }

      function emitCurrentStatus() {
        listener(getBrowserStatus())
      }

      const connection = (
        window.navigator as Navigator & {
          connection?: EventTarget
        }
      ).connection

      window.addEventListener('online', emitCurrentStatus)
      window.addEventListener('offline', emitCurrentStatus)
      connection?.addEventListener('change', emitCurrentStatus)

      return () => {
        window.removeEventListener('online', emitCurrentStatus)
        window.removeEventListener('offline', emitCurrentStatus)
        connection?.removeEventListener('change', emitCurrentStatus)
      }
    },
    addResumeListener(listener) {
      if (typeof document === 'undefined') {
        return () => undefined
      }

      function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
          listener()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    },
    async getCurrentStatus() {
      return getBrowserStatus()
    },
  }
}

export function createCapacitorNetworkStatusAdapter(): NetworkStatusAdapter {
  return {
    async addNetworkStatusListener(listener) {
      const handle = await Network.addListener('networkStatusChange', (status) => {
        listener({
          connectionType: status.connected
            ? normalizeConnectionType(status.connectionType)
            : 'none',
          connected: status.connected,
        })
      })

      return () => {
        void handle.remove()
      }
    },
    async addResumeListener(listener) {
      const handle = await CapacitorApp.addListener('resume', listener)

      return () => {
        void handle.remove()
      }
    },
    async getCurrentStatus() {
      const status = await Network.getStatus()

      return {
        connectionType: status.connected
          ? normalizeConnectionType(status.connectionType)
          : 'none',
        connected: status.connected,
      }
    },
  }
}

export function createNetworkStatusAdapter(): NetworkStatusAdapter {
  if (Capacitor.isNativePlatform()) {
    return createCapacitorNetworkStatusAdapter()
  }

  return createWebNetworkStatusAdapter()
}
