import { SyncState } from '@/data/sync/sync-state'

export type BannerTone = 'error' | 'info' | 'success' | 'warning'

export type ConnectionStatusBannerView = {
  description?: string
  icon: 'check' | 'cloud' | 'loader' | 'warning'
  persistent: boolean
  title: string
  tone: BannerTone
}

export function getConnectionStatusBannerView({
  isOnline,
  isReconnecting,
  syncState,
}: {
  isOnline: boolean
  isReconnecting: boolean
  syncState: SyncState
}): ConnectionStatusBannerView {
  if (!isOnline) {
    return {
      description:
        'Changes cannot be synced until internet returns. Internet connection required.',
      icon: 'warning',
      persistent: true,
      title: 'Offline',
      tone: 'warning',
    }
  }

  if (isReconnecting) {
    return {
      icon: 'check',
      persistent: false,
      title: 'Connection restored',
      tone: 'success',
    }
  }

  if (syncState === SyncState.SYNCING) {
    return {
      icon: 'loader',
      persistent: true,
      title: 'Syncing',
      tone: 'info',
    }
  }

  if (syncState === SyncState.SYNCED) {
    return {
      icon: 'check',
      persistent: false,
      title: 'Synced',
      tone: 'success',
    }
  }

  if (syncState === SyncState.ERROR) {
    return {
      description: 'Some cloud updates could not be completed.',
      icon: 'warning',
      persistent: true,
      title: 'Sync error',
      tone: 'error',
    }
  }

  return {
    icon: 'check',
    persistent: false,
    title: 'Online',
    tone: 'success',
  }
}
