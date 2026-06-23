import type { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  financeRealtimeTables,
  setupFinanceRealtimeInvalidation,
} from '@/lib/finance-realtime-invalidation'

type ChangeHandler = () => void

function createRealtimeClientMock(options?: { subscribeStatus?: string }) {
  const changeHandlers: ChangeHandler[] = []
  const channel = {
    on: vi.fn((_type, _filter, callback: ChangeHandler) => {
      changeHandlers.push(callback)
      return channel
    }),
    subscribe: vi.fn((callback?: (status: string) => void) => {
      if (callback && options?.subscribeStatus) {
        callback(options.subscribeStatus)
      }

      return channel
    }),
    unsubscribe: vi.fn(),
  }
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  }

  return { changeHandlers, channel, client }
}

function createQueryClientMock() {
  return {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  } as unknown as QueryClient
}

afterEach(() => {
  vi.useRealTimers()
})

describe('finance realtime invalidation', () => {
  it('subscribes to household-filtered finance tables', () => {
    const { channel, client } = createRealtimeClientMock()

    setupFinanceRealtimeInvalidation({
      client,
      householdId: 'household-1',
      queryClient: createQueryClientMock(),
      userId: 'user-1',
    })

    expect(client.channel).toHaveBeenCalledWith(
      'finance-realtime:household-1:user-1',
    )
    expect(channel.on).toHaveBeenCalledTimes(financeRealtimeTables.length)

    for (const table of financeRealtimeTables) {
      expect(channel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          filter: 'household_id=eq.household-1',
          schema: 'public',
          table,
        },
        expect.any(Function),
      )
    }
  })

  it('debounces bursts of table events into one finance invalidation', async () => {
    vi.useFakeTimers()
    const { changeHandlers, client } = createRealtimeClientMock()
    const queryClient = createQueryClientMock()

    setupFinanceRealtimeInvalidation({
      client,
      debounceMs: 300,
      householdId: 'household-1',
      queryClient,
      userId: 'user-1',
    })

    changeHandlers[0]()
    changeHandlers[1]()
    changeHandlers[2]()

    await vi.advanceTimersByTimeAsync(299)
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(queryClient.invalidateQueries).toHaveBeenCalled()
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(11)
  })

  it('invalidates once after channel subscription so reconnects catch missed events', async () => {
    vi.useFakeTimers()
    const { client } = createRealtimeClientMock({ subscribeStatus: 'SUBSCRIBED' })
    const queryClient = createQueryClientMock()

    setupFinanceRealtimeInvalidation({
      client,
      debounceMs: 250,
      householdId: 'household-1',
      queryClient,
      userId: 'user-1',
    })

    await vi.advanceTimersByTimeAsync(250)

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(11)
  })

  it('cleans up debounce timers and removes the realtime channel', async () => {
    vi.useFakeTimers()
    const { changeHandlers, channel, client } = createRealtimeClientMock()
    const queryClient = createQueryClientMock()

    const subscription = setupFinanceRealtimeInvalidation({
      client,
      debounceMs: 250,
      householdId: 'household-1',
      queryClient,
      userId: 'user-1',
    })

    changeHandlers[0]()
    subscription.cleanup()
    await vi.advanceTimersByTimeAsync(250)

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(client.removeChannel).toHaveBeenCalledWith(channel)
  })
})
