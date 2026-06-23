import type { QueryClient } from '@tanstack/react-query'

import { invalidateFinanceData } from '@/lib/query-invalidation'

export const financeRealtimeTables = [
  'accounts',
  'categories',
  'transactions',
  'bills',
  'goals',
  'loans',
  'budgets',
  'recurring_transactions',
  'recurring_bills',
  'household_members',
  'household_invites',
] as const

export type FinanceRealtimeTable = (typeof financeRealtimeTables)[number]

type RealtimePostgresChangesFilter = {
  event: '*'
  schema: 'public'
  table: FinanceRealtimeTable
  filter: string
}

type RealtimeChannel = {
  on(
    type: 'postgres_changes',
    filter: RealtimePostgresChangesFilter,
    callback: () => void,
  ): RealtimeChannel
  subscribe(callback?: (status: string) => void): RealtimeChannel
  unsubscribe?: () => Promise<unknown> | unknown
}

type RealtimeClient = {
  channel(topic: string): RealtimeChannel
}

type RealtimeClientWithRemoveChannel = RealtimeClient & {
  removeChannel?: (channel: RealtimeChannel) => Promise<unknown> | unknown
}

export interface SetupFinanceRealtimeInvalidationInput {
  client: RealtimeClient
  debounceMs?: number
  householdId: string
  queryClient: QueryClient
  userId: string
}

export interface FinanceRealtimeSubscription {
  cleanup: () => void
}

function createHouseholdFilter(householdId: string) {
  return `household_id=eq.${householdId}`
}

export function setupFinanceRealtimeInvalidation({
  client,
  debounceMs = 350,
  householdId,
  queryClient,
  userId,
}: SetupFinanceRealtimeInvalidationInput): FinanceRealtimeSubscription {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let cleanedUp = false

  function clearDebounceTimer() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  function invalidateSoon() {
    if (cleanedUp) {
      return
    }

    clearDebounceTimer()

    debounceTimer = setTimeout(() => {
      if (!cleanedUp) {
        void invalidateFinanceData(queryClient)
      }
    }, debounceMs)
  }

  const channel = client.channel(
    `finance-realtime:${householdId}:${userId}`,
  )

  for (const table of financeRealtimeTables) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        filter: createHouseholdFilter(householdId),
        schema: 'public',
        table,
      },
      invalidateSoon,
    )
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      invalidateSoon()
    }
  })

  return {
    cleanup() {
      cleanedUp = true
      clearDebounceTimer()

      const clientWithRemoveChannel = client as RealtimeClientWithRemoveChannel

      if (clientWithRemoveChannel.removeChannel) {
        void clientWithRemoveChannel.removeChannel(channel)
        return
      }

      void channel.unsubscribe?.()
    },
  }
}
