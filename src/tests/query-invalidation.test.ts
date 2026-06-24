import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { QueryClient as RealQueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  invalidateBillMutationData,
  invalidateRecurringBillData,
  invalidateRecurringTransactionGenerationData,
  invalidateTransactionMutationData,
  invalidateTransactionMutationDataForDataSource,
} from '@/lib/query-invalidation'
import { setLastKnownNetworkConnected } from '@/lib/network-status'

function createQueryClientMock() {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined)
  const queryClient = { invalidateQueries } as unknown as QueryClient

  return { invalidateQueries, queryClient }
}

function getInvalidatedKeys(invalidateQueries: ReturnType<typeof vi.fn>) {
  return invalidateQueries.mock.calls.map(([input]) => input.queryKey)
}

function getInvalidationOptions(invalidateQueries: ReturnType<typeof vi.fn>) {
  return invalidateQueries.mock.calls.map(([input]) => input)
}

function expectKeysToContain(
  invalidatedKeys: readonly QueryKey[],
  expectedKeys: readonly QueryKey[],
) {
  for (const expectedKey of expectedKeys) {
    expect(invalidatedKeys).toContainEqual(expectedKey)
  }
}

describe('finance query invalidation helpers', () => {
  afterEach(() => {
    setLastKnownNetworkConnected(null)
  })

  it('invalidates transaction lists and derived financial summaries after transaction mutations', async () => {
    const { invalidateQueries, queryClient } = createQueryClientMock()

    await invalidateTransactionMutationData(queryClient)

    expectKeysToContain(getInvalidatedKeys(invalidateQueries), [
      ['accounts'],
      ['dashboard'],
      ['notifications'],
      ['planner'],
      ['reports'],
      ['transactions'],
    ])
    expect(getInvalidationOptions(invalidateQueries)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ queryKey: ['reports'], refetchType: 'all' }),
      ]),
    )
  })

  it('refetches matching inactive derived queries when mutations happen after leaving a page', async () => {
    const queryClient = new RealQueryClient({
      defaultOptions: {
        queries: {
          refetchOnMount: false,
          refetchOnReconnect: false,
          refetchOnWindowFocus: false,
          retry: false,
          staleTime: 5 * 60 * 1000,
        },
      },
    })
    let reportFetchCount = 0

    await queryClient.prefetchQuery({
      queryKey: ['reports', '2026-06', 'supabase:household-1'],
      queryFn: async () => {
        reportFetchCount += 1
        return { version: reportFetchCount }
      },
    })

    expect(reportFetchCount).toBe(1)

    await invalidateTransactionMutationData(queryClient)

    expect(reportFetchCount).toBe(2)
  })

  it('does not await refetch completion for offline local transaction mutations', async () => {
    const invalidateQueries = vi.fn(
      () => new Promise<undefined>(() => undefined),
    )
    const queryClient = { invalidateQueries } as unknown as QueryClient

    setLastKnownNetworkConnected(false)

    await expect(
      invalidateTransactionMutationDataForDataSource(queryClient, {
        mode: 'offline',
      }),
    ).resolves.toBeUndefined()
    expect(invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['transactions'],
        refetchType: 'active',
      }),
    )
  })

  it('continues awaiting full invalidation for online transaction mutations', async () => {
    const { invalidateQueries, queryClient } = createQueryClientMock()

    setLastKnownNetworkConnected(true)

    await invalidateTransactionMutationDataForDataSource(queryClient, {
      mode: 'offline',
    })

    expect(invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['transactions'],
        refetchType: 'all',
      }),
    )
  })

  it('invalidates account balances, bill data, and derived summaries after bill payment mutations', async () => {
    const { invalidateQueries, queryClient } = createQueryClientMock()

    await invalidateBillMutationData(queryClient)

    expectKeysToContain(getInvalidatedKeys(invalidateQueries), [
      ['accounts'],
      ['bills'],
      ['dashboard'],
      ['notifications'],
      ['planner'],
      ['reports'],
      ['transactions'],
    ])
  })

  it('invalidates generated transactions and derived summaries after recurring transaction generation', async () => {
    const { invalidateQueries, queryClient } = createQueryClientMock()

    await invalidateRecurringTransactionGenerationData(queryClient)

    expectKeysToContain(getInvalidatedKeys(invalidateQueries), [
      ['accounts'],
      ['dashboard'],
      ['notifications'],
      ['planner'],
      ['recurring-transactions'],
      ['reports'],
      ['transactions'],
    ])
  })

  it('invalidates generated bills, notifications, dashboard, and reports after recurring bill generation', async () => {
    const { invalidateQueries, queryClient } = createQueryClientMock()

    await invalidateRecurringBillData(queryClient)

    expectKeysToContain(getInvalidatedKeys(invalidateQueries), [
      ['bills'],
      ['dashboard'],
      ['notifications'],
      ['recurring-bills'],
      ['reports'],
    ])
  })
})
