import { describe, expect, it, vi } from 'vitest'

import type { FinanceDataSource } from '@/data/contracts'
import {
  createFinanceDataSourceForRuntime,
} from '@/data/data-source/finance-data-source-factory'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'
import { featureFlags } from '@/lib/feature-flags'

function createRepositoryStub(overrides: Record<string, unknown> = {}) {
  return {
    addContribution: vi.fn(),
    archive: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 'created-record' }),
    deleteSoft: vi.fn(),
    generateDue: vi.fn(),
    getAll: vi.fn().mockResolvedValue([{ id: 'local-record' }]),
    getById: vi.fn(),
    getByMonth: vi.fn(),
    getByType: vi.fn(),
    getDue: vi.fn(),
    markPaid: vi.fn(),
    markUnpaid: vi.fn(),
    recordPayment: vi.fn(),
    seedDefaultsIfNeeded: vi.fn(),
    update: vi.fn(),
    withdraw: vi.fn(),
    ...overrides,
  }
}

function createDataSourceStub(
  mode: FinanceDataSource['mode'] = 'supabase',
): FinanceDataSource {
  return {
    accounts: createRepositoryStub(),
    bills: createRepositoryStub(),
    budgets: createRepositoryStub(),
    categories: createRepositoryStub(),
    goals: createRepositoryStub(),
    loans: createRepositoryStub(),
    mode,
    recurringBills: createRepositoryStub(),
    recurringTransactions: createRepositoryStub(),
    transactions: createRepositoryStub(),
  } as unknown as FinanceDataSource
}

function createDriverStub(): LocalSqliteDriver & {
  close: ReturnType<typeof vi.fn>
} {
  return {
    close: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn(),
    query: vi.fn(),
    run: vi.fn(),
    transaction: vi.fn(),
  } as unknown as LocalSqliteDriver & { close: ReturnType<typeof vi.fn> }
}

describe('local SQLite read mode feature flag', () => {
  it('defaults localSqliteReadMode to false', () => {
    expect(featureFlags.localSqliteReadMode).toBe(false)
  })
})

describe('finance data source runtime factory', () => {
  it('uses Supabase by default and does not initialize SQLite', async () => {
    const supabaseDataSource = createDataSourceStub('supabase')
    const initializeLocalSqliteDriver = vi.fn()

    const dataSource = await createFinanceDataSourceForRuntime({
      flags: {
        localSqliteReadMode: false,
        offlineMode: false,
      },
      householdId: 'household-1',
      initializeLocalSqliteDriver,
      supabaseDataSource,
      userId: 'user-1',
    })

    expect(dataSource).toBe(supabaseDataSource)
    expect(dataSource.mode).toBe('supabase')
    expect(initializeLocalSqliteDriver).not.toHaveBeenCalled()
  })

  it('initializes SQLite and hydrates before returning local read repositories', async () => {
    const order: string[] = []
    const driver = createDriverStub()
    const supabaseDataSource = createDataSourceStub('supabase')
    const localDataSource = createDataSourceStub('offline')
    const hydrateLocalSqlite = vi.fn().mockImplementation(async () => {
      order.push('hydrate')
      return {
        completedAt: '2026-06-24T10:00:00.000Z',
        errors: [],
        householdId: 'household-1',
        startedAt: '2026-06-24T10:00:00.000Z',
        tables: {},
      }
    })
    const initializeLocalSqliteDriver = vi.fn().mockImplementation(async () => {
      order.push('initialize')
      return driver
    })
    const createLocalSqliteDataSource = vi.fn().mockImplementation(() => {
      order.push('create-local-data-source')
      return localDataSource
    })

    const dataSource = await createFinanceDataSourceForRuntime({
      createLocalSqliteDataSource,
      flags: {
        localSqliteReadMode: true,
        offlineMode: false,
      },
      householdId: 'household-1',
      hydrateLocalSqlite,
      initializeLocalSqliteDriver,
      supabaseDataSource,
      userId: 'user-1',
    })

    await dataSource.accounts.getAll()

    expect(order).toEqual([
      'initialize',
      'hydrate',
      'create-local-data-source',
    ])
    expect(hydrateLocalSqlite).toHaveBeenCalledWith(
      expect.objectContaining({
        dataSource: supabaseDataSource,
        householdId: 'household-1',
        localDriver: driver,
        userId: 'user-1',
      }),
    )
    expect(localDataSource.accounts.getAll).toHaveBeenCalled()
    expect(supabaseDataSource.accounts.getAll).not.toHaveBeenCalled()
    expect(dataSource.mode).toBe('offline')
  })

  it('falls back to Supabase and closes SQLite when hydration returns errors', async () => {
    const driver = createDriverStub()
    const supabaseDataSource = createDataSourceStub('supabase')
    const createLocalSqliteDataSource = vi.fn()
    const hydrateLocalSqlite = vi.fn().mockResolvedValue({
      completedAt: '2026-06-24T10:00:00.000Z',
      errors: ['hydration failed'],
      householdId: 'household-1',
      startedAt: '2026-06-24T10:00:00.000Z',
      tables: {},
    })

    const dataSource = await createFinanceDataSourceForRuntime({
      createLocalSqliteDataSource,
      flags: {
        localSqliteReadMode: true,
        offlineMode: false,
      },
      householdId: 'household-1',
      hydrateLocalSqlite,
      initializeLocalSqliteDriver: vi.fn().mockResolvedValue(driver),
      supabaseDataSource,
      userId: 'user-1',
    })

    expect(dataSource).toBe(supabaseDataSource)
    expect(driver.close).toHaveBeenCalled()
    expect(createLocalSqliteDataSource).not.toHaveBeenCalled()
  })

  it('routes writes to Supabase and rehydrates best-effort in local read mode', async () => {
    const driver = createDriverStub()
    const supabaseDataSource = createDataSourceStub('supabase')
    const localDataSource = createDataSourceStub('offline')
    const hydrateLocalSqlite = vi.fn().mockResolvedValue({
      completedAt: '2026-06-24T10:00:00.000Z',
      errors: [],
      householdId: 'household-1',
      startedAt: '2026-06-24T10:00:00.000Z',
      tables: {},
    })

    const dataSource = await createFinanceDataSourceForRuntime({
      createLocalSqliteDataSource: vi.fn().mockReturnValue(localDataSource),
      flags: {
        localSqliteReadMode: true,
        offlineMode: false,
      },
      householdId: 'household-1',
      hydrateLocalSqlite,
      initializeLocalSqliteDriver: vi.fn().mockResolvedValue(driver),
      supabaseDataSource,
      userId: 'user-1',
    })

    const result = await dataSource.accounts.create({
      color: '#64748b',
      icon: 'Wallet',
      name: 'Cash',
      openingBalance: 0,
      type: 'cash',
    })

    expect(result).toEqual({ id: 'created-record' })
    expect(supabaseDataSource.accounts.create).toHaveBeenCalledWith({
      color: '#64748b',
      icon: 'Wallet',
      name: 'Cash',
      openingBalance: 0,
      type: 'cash',
    })
    expect(localDataSource.accounts.create).not.toHaveBeenCalled()
    expect(hydrateLocalSqlite).toHaveBeenCalledTimes(2)
  })

  it('keeps Supabase write results even if post-write rehydration fails', async () => {
    const driver = createDriverStub()
    const supabaseDataSource = createDataSourceStub('supabase')
    const localDataSource = createDataSourceStub('offline')
    const hydrateLocalSqlite = vi
      .fn()
      .mockResolvedValueOnce({
        completedAt: '2026-06-24T10:00:00.000Z',
        errors: [],
        householdId: 'household-1',
        startedAt: '2026-06-24T10:00:00.000Z',
        tables: {},
      })
      .mockRejectedValueOnce(new Error('post-write hydration failed'))

    const dataSource = await createFinanceDataSourceForRuntime({
      createLocalSqliteDataSource: vi.fn().mockReturnValue(localDataSource),
      flags: {
        localSqliteReadMode: true,
        offlineMode: false,
      },
      householdId: 'household-1',
      hydrateLocalSqlite,
      initializeLocalSqliteDriver: vi.fn().mockResolvedValue(driver),
      logger: {
        debug: vi.fn(),
        warn: vi.fn(),
      },
      supabaseDataSource,
      userId: 'user-1',
    })

    await expect(
      dataSource.accounts.create({
        color: '#64748b',
        icon: 'Wallet',
        name: 'Cash',
        openingBalance: 0,
        type: 'cash',
      }),
    ).resolves.toEqual({ id: 'created-record' })
  })
})
