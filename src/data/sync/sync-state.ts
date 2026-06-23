export const SyncState = {
  ERROR: 'ERROR',
  OFFLINE: 'OFFLINE',
  ONLINE: 'ONLINE',
  SYNCED: 'SYNCED',
  SYNCING: 'SYNCING',
} as const

export type SyncState = (typeof SyncState)[keyof typeof SyncState]
