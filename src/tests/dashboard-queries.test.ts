import { afterEach, describe, expect, it, vi } from 'vitest'

import { getOverviewDashboardSourceData } from '@/data/dashboard/dashboard-queries'
import type { FinanceDataSource } from '@/data/contracts'
import { setLastKnownNetworkConnected } from '@/lib/network-status'

function createRepositoryStub(records: unknown[] = []) {
  return {
    getAll: vi.fn().mockResolvedValue(records),
    seedDefaultsIfNeeded: vi.fn().mockResolvedValue({
      createdCount: 0,
      seeded: false,
      updatedCount: 0,
    }),
  }
}

function createDashboardDataSource(mode: FinanceDataSource['mode']) {
  return {
    accounts: createRepositoryStub(),
    bills: createRepositoryStub(),
    budgets: createRepositoryStub(),
    categories: createRepositoryStub(),
    goals: createRepositoryStub(),
    loans: createRepositoryStub(),
    mode,
    transactions: createRepositoryStub(),
  } as unknown as FinanceDataSource
}

describe('overview dashboard queries', () => {
  afterEach(() => {
    setLastKnownNetworkConnected(null)
  })

  it('skips cloud default-category seeding while using offline local data', async () => {
    const dataSource = createDashboardDataSource('offline')

    setLastKnownNetworkConnected(false)

    await getOverviewDashboardSourceData(dataSource)

    expect(dataSource.categories.seedDefaultsIfNeeded).not.toHaveBeenCalled()
    expect(dataSource.transactions.getAll).toHaveBeenCalled()
  })

  it('keeps default-category seeding for online dashboard reads', async () => {
    const dataSource = createDashboardDataSource('offline')

    setLastKnownNetworkConnected(true)

    await getOverviewDashboardSourceData(dataSource)

    expect(dataSource.categories.seedDefaultsIfNeeded).toHaveBeenCalled()
  })
})
