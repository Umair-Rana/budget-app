import { useContext } from 'react'

import { NetworkStatusContext } from '@/providers/network-context'

export function useNetworkStatus() {
  const context = useContext(NetworkStatusContext)

  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkProvider.')
  }

  return context
}
