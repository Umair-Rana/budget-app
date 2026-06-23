import { describe, expect, it } from 'vitest'

import { SyncState } from '@/data/sync/sync-state'
import { getConnectionStatusBannerView } from '@/lib/connection-status-banner'
import {
  createInitialNetworkSnapshot,
  getNetworkSnapshotAfterOffline,
  getNetworkSnapshotAfterOnline,
  getNetworkSnapshotAfterStatus,
  normalizeConnectionType,
} from '@/lib/network-status'

function createNavigatorMock({
  effectiveType,
  onLine,
  type,
}: {
  effectiveType?: string
  onLine: boolean
  type?: string
}) {
  return {
    connection: {
      effectiveType,
      type,
    },
    onLine,
  } as unknown as Navigator
}

describe('network status model', () => {
  it('creates initial online provider state from navigator.onLine', () => {
    const snapshot = createInitialNetworkSnapshot(
      createNavigatorMock({ onLine: true, type: 'wifi' }),
      () => new Date('2026-06-23T10:00:00.000Z'),
    )

    expect(snapshot).toMatchObject({
      connectionType: 'wifi',
      isOnline: true,
      isReconnecting: false,
      lastOnlineAt: '2026-06-23T10:00:00.000Z',
      syncState: SyncState.ONLINE,
    })
  })

  it('creates initial offline provider state from navigator.onLine', () => {
    const snapshot = createInitialNetworkSnapshot(
      createNavigatorMock({ onLine: false, type: 'wifi' }),
    )

    expect(snapshot).toMatchObject({
      connectionType: 'none',
      isOnline: false,
      isReconnecting: false,
      lastOnlineAt: null,
      syncState: SyncState.OFFLINE,
    })
  })

  it('handles offline and reconnect transitions', () => {
    const onlineSnapshot = createInitialNetworkSnapshot(
      createNavigatorMock({ onLine: true, type: 'wifi' }),
      () => new Date('2026-06-23T10:00:00.000Z'),
    )

    const offlineSnapshot = getNetworkSnapshotAfterOffline(onlineSnapshot)
    const restoredSnapshot = getNetworkSnapshotAfterOnline(
      offlineSnapshot,
      createNavigatorMock({ onLine: true, effectiveType: '4g' }),
      () => new Date('2026-06-23T10:05:00.000Z'),
    )

    expect(offlineSnapshot).toMatchObject({
      connectionType: 'none',
      isOnline: false,
      isReconnecting: false,
      syncState: SyncState.OFFLINE,
    })
    expect(restoredSnapshot).toMatchObject({
      connectionType: 'cellular',
      isOnline: true,
      isReconnecting: true,
      lastOnlineAt: '2026-06-23T10:05:00.000Z',
      syncState: SyncState.ONLINE,
    })
  })

  it('normalizes browser connection types for Web and Android webview', () => {
    expect(normalizeConnectionType('wifi')).toBe('wifi')
    expect(normalizeConnectionType('ethernet')).toBe('ethernet')
    expect(normalizeConnectionType('4g')).toBe('cellular')
    expect(normalizeConnectionType(undefined)).toBe('unknown')
  })

  it('maps Capacitor Network status into offline and restored snapshots', () => {
    const onlineSnapshot = createInitialNetworkSnapshot(
      createNavigatorMock({ onLine: true, type: 'wifi' }),
      () => new Date('2026-06-23T10:00:00.000Z'),
    )
    const offlineSnapshot = getNetworkSnapshotAfterStatus(onlineSnapshot, {
      connected: false,
      connectionType: 'none',
    })
    const restoredSnapshot = getNetworkSnapshotAfterStatus(
      offlineSnapshot,
      {
        connected: true,
        connectionType: 'wifi',
      },
      () => new Date('2026-06-23T10:10:00.000Z'),
    )

    expect(offlineSnapshot).toMatchObject({
      connectionType: 'none',
      isOnline: false,
      isReconnecting: false,
      syncState: SyncState.OFFLINE,
    })
    expect(restoredSnapshot).toMatchObject({
      connectionType: 'wifi',
      isOnline: true,
      isReconnecting: true,
      lastOnlineAt: '2026-06-23T10:10:00.000Z',
      syncState: SyncState.ONLINE,
    })
  })
})

describe('connection status banner view', () => {
  it('shows a persistent offline warning without implying offline saves work', () => {
    const view = getConnectionStatusBannerView({
      isOnline: false,
      isReconnecting: false,
      syncState: SyncState.OFFLINE,
    })

    expect(view).toMatchObject({
      persistent: true,
      title: 'Offline',
      tone: 'warning',
    })
    expect(view.description).toContain('Internet connection required.')
  })

  it('shows transient online and restored banners', () => {
    expect(
      getConnectionStatusBannerView({
        isOnline: true,
        isReconnecting: false,
        syncState: SyncState.ONLINE,
      }),
    ).toMatchObject({
      persistent: false,
      title: 'Online',
    })

    expect(
      getConnectionStatusBannerView({
        isOnline: true,
        isReconnecting: true,
        syncState: SyncState.ONLINE,
      }),
    ).toMatchObject({
      persistent: false,
      title: 'Connection restored',
    })
  })
})
