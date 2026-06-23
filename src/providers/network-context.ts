import { createContext } from 'react'

import type { SyncState } from '@/data/sync/sync-state'
import type { NetworkSnapshot } from '@/lib/network-status'

export type NetworkStatusContextValue = NetworkSnapshot & {
  setSyncState: (syncState: SyncState) => void
}

export const NetworkStatusContext = createContext<
  NetworkStatusContextValue | undefined
>(undefined)
