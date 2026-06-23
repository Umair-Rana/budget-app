import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import {
  setupFinanceRealtimeInvalidation,
  type SetupFinanceRealtimeInvalidationInput,
} from '@/lib/finance-realtime-invalidation'

type FinanceRealtimeClient = SetupFinanceRealtimeInvalidationInput['client']

export interface UseFinanceRealtimeInvalidationInput {
  client?: FinanceRealtimeClient | null
  enabled: boolean
  householdId?: string | null
  queryClient: QueryClient
  userId?: string | null
}

export function useFinanceRealtimeInvalidation({
  client,
  enabled,
  householdId,
  queryClient,
  userId,
}: UseFinanceRealtimeInvalidationInput) {
  useEffect(() => {
    if (!enabled || !client || !householdId || !userId) {
      return undefined
    }

    const subscription = setupFinanceRealtimeInvalidation({
      client,
      householdId,
      queryClient,
      userId,
    })

    return () => subscription.cleanup()
  }, [client, enabled, householdId, queryClient, userId])
}
