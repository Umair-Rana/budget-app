import { SyncState } from '@/data/sync/sync-state'

export type ConnectionType =
  | 'cellular'
  | 'ethernet'
  | 'none'
  | 'unknown'
  | 'wifi'

export interface NetworkSnapshot {
  connectionType: ConnectionType
  isOnline: boolean
  isReconnecting: boolean
  lastOnlineAt: string | null
  syncState: SyncState
}

type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string
    type?: string
  }
}

export function normalizeConnectionType(type?: string): ConnectionType {
  if (!type) {
    return 'unknown'
  }

  if (type === 'wifi' || type === 'ethernet' || type === 'cellular') {
    return type
  }

  if (type === 'none') {
    return 'none'
  }

  if (['slow-2g', '2g', '3g', '4g', '5g'].includes(type)) {
    return 'cellular'
  }

  return 'unknown'
}

export function getBrowserConnectionType(
  navigatorRef: Navigator | undefined,
): ConnectionType {
  const connection = (navigatorRef as NavigatorWithConnection | undefined)
    ?.connection

  return normalizeConnectionType(connection?.type ?? connection?.effectiveType)
}

export function createInitialNetworkSnapshot(
  navigatorRef: Navigator | undefined,
  now: () => Date = () => new Date(),
): NetworkSnapshot {
  const isOnline = navigatorRef?.onLine ?? true

  return {
    connectionType: isOnline
      ? getBrowserConnectionType(navigatorRef)
      : 'none',
    isOnline,
    isReconnecting: false,
    lastOnlineAt: isOnline ? now().toISOString() : null,
    syncState: isOnline ? SyncState.ONLINE : SyncState.OFFLINE,
  }
}

export function getNetworkSnapshotAfterOnline(
  current: NetworkSnapshot,
  navigatorRef: Navigator | undefined,
  now: () => Date = () => new Date(),
): NetworkSnapshot {
  return {
    ...current,
    connectionType: getBrowserConnectionType(navigatorRef),
    isOnline: true,
    isReconnecting: !current.isOnline,
    lastOnlineAt: now().toISOString(),
    syncState:
      current.syncState === SyncState.SYNCING ||
      current.syncState === SyncState.SYNCED ||
      current.syncState === SyncState.ERROR
        ? current.syncState
        : SyncState.ONLINE,
  }
}

export function getNetworkSnapshotAfterStatus(
  current: NetworkSnapshot,
  status: {
    connectionType: ConnectionType
    connected: boolean
  },
  now: () => Date = () => new Date(),
): NetworkSnapshot {
  if (!status.connected) {
    return getNetworkSnapshotAfterOffline(current)
  }

  return {
    ...current,
    connectionType: status.connectionType,
    isOnline: true,
    isReconnecting: !current.isOnline,
    lastOnlineAt: now().toISOString(),
    syncState:
      current.syncState === SyncState.SYNCING ||
      current.syncState === SyncState.SYNCED ||
      current.syncState === SyncState.ERROR
        ? current.syncState
        : SyncState.ONLINE,
  }
}

export function getNetworkSnapshotAfterOffline(
  current: NetworkSnapshot,
): NetworkSnapshot {
  return {
    ...current,
    connectionType: 'none',
    isOnline: false,
    isReconnecting: false,
    syncState: SyncState.OFFLINE,
  }
}
