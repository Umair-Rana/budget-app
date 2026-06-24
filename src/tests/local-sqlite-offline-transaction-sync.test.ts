import { describe, expect, it, vi } from 'vitest'

import type { FinanceDataSource } from '@/data/contracts'
import type { Transaction } from '@/data/models/transaction'
import {
  createOfflineLocalTransaction,
  syncPendingLocalSqliteOperations,
  unsupportedOfflineTransactionTypeMessage,
} from '@/data/local-sqlite/sync'
import type {
  LocalSqliteDriver,
  LocalSqliteStatementParams,
} from '@/data/local-sqlite/local-sqlite-types'
import type { LocalOperationQueueRow } from '@/data/local-sqlite/sync'

class RecordingSqliteDriver implements LocalSqliteDriver {
  queries: Array<{ params?: LocalSqliteStatementParams; sql: string }> = []
  queryRows: unknown[] = []
  runs: Array<{ params?: LocalSqliteStatementParams; sql: string }> = []
  transactionCalls = 0

  async exec() {
    return undefined
  }

  async query<T>(sql: string, params?: LocalSqliteStatementParams) {
    this.queries.push({ params, sql })
    return this.queryRows as T[]
  }

  async run(sql: string, params?: LocalSqliteStatementParams) {
    this.runs.push({ params, sql })
  }

  async transaction<T>(work: () => Promise<T>) {
    this.transactionCalls += 1
    return work()
  }
}

function createSupabaseDataSourceStub() {
  return {
    transactions: {
      create: vi.fn().mockResolvedValue(createRemoteTransaction()),
    },
  } as unknown as FinanceDataSource
}

function createRemoteTransaction(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    amount: 30,
    createdAt: '2026-06-24T10:00:00.000Z',
    date: '2026-06-24',
    fromAccountId: 'account-1',
    id: 'remote-transaction-1',
    type: 'expense',
    updatedAt: '2026-06-24T10:00:00.000Z',
    ...overrides,
  }
}

function createOperationRow(
  overrides: Partial<LocalOperationQueueRow> = {},
): LocalOperationQueueRow {
  return {
    attempt_count: 0,
    created_at: '2026-06-24T10:00:00.000Z',
    entity_id: 'local-transaction-1',
    entity_type: 'transaction',
    household_id: 'household-1',
    id: 'operation-1',
    idempotency_key: 'transaction:local-transaction-1:create',
    last_error: null,
    next_retry_at: null,
    operation_type: 'CREATE_EXPENSE_TRANSACTION',
    payload_json: JSON.stringify({
      input: {
        amount: 30,
        date: '2026-06-24',
        fromAccountId: 'account-1',
        type: 'expense',
      },
      localTransactionId: 'local-transaction-1',
    }),
    status: 'pending',
    updated_at: '2026-06-24T10:00:00.000Z',
    ...overrides,
  }
}

describe('offline local transaction writes', () => {
  it('creates an offline expense, subtracts account balance, and queues an operation', async () => {
    const driver = new RecordingSqliteDriver()
    driver.queryRows = [{ current_balance: 100 }]

    const transaction = await createOfflineLocalTransaction({
      driver,
      householdId: 'household-1',
      input: {
        amount: 30,
        date: '2026-06-24',
        fromAccountId: 'account-1',
        type: 'expense',
      },
      userId: 'user-1',
    })

    expect(transaction).toMatchObject({
      amount: 30,
      fromAccountId: 'account-1',
      type: 'expense',
    })
    expect(driver.transactionCalls).toBe(1)
    expect(driver.runs.some((run) => run.sql.includes('insert into transactions'))).toBe(
      true,
    )
    expect(driver.runs).toContainEqual(
      expect.objectContaining({
        params: [70, transaction.updatedAt, 'household-1', 'account-1'],
        sql: expect.stringContaining('update accounts'),
      }),
    )
    expect(driver.runs).toContainEqual(
      expect.objectContaining({
        params: expect.arrayContaining([
          'household-1',
          'CREATE_EXPENSE_TRANSACTION',
          'transaction',
          transaction.id,
          'pending',
          `transaction:${transaction.id}:create`,
        ]),
        sql: expect.stringContaining('insert into operation_queue'),
      }),
    )
  })

  it('creates an offline income and adds account balance', async () => {
    const driver = new RecordingSqliteDriver()
    driver.queryRows = [{ current_balance: 100 }]

    const transaction = await createOfflineLocalTransaction({
      driver,
      householdId: 'household-1',
      input: {
        amount: 25,
        date: '2026-06-24',
        toAccountId: 'account-1',
        type: 'income',
      },
      userId: 'user-1',
    })

    expect(transaction).toMatchObject({
      amount: 25,
      toAccountId: 'account-1',
      type: 'income',
    })
    expect(driver.runs).toContainEqual(
      expect.objectContaining({
        params: [125, transaction.updatedAt, 'household-1', 'account-1'],
        sql: expect.stringContaining('update accounts'),
      }),
    )
    expect(driver.runs).toContainEqual(
      expect.objectContaining({
        params: expect.arrayContaining(['CREATE_INCOME_TRANSACTION']),
        sql: expect.stringContaining('insert into operation_queue'),
      }),
    )
  })

  it('blocks unsupported offline transaction types', async () => {
    const driver = new RecordingSqliteDriver()

    await expect(
      createOfflineLocalTransaction({
        driver,
        householdId: 'household-1',
        input: {
          amount: 25,
          date: '2026-06-24',
          fromAccountId: 'account-1',
          toAccountId: 'account-2',
          type: 'transfer',
        },
        userId: 'user-1',
      }),
    ).rejects.toThrow(unsupportedOfflineTransactionTypeMessage)
    expect(driver.transactionCalls).toBe(0)
  })
})

describe('local SQLite pending operation sync', () => {
  it('replays a pending transaction operation, marks it synced, and hydrates', async () => {
    const driver = new RecordingSqliteDriver()
    driver.queryRows = [createOperationRow()]
    const supabaseDataSource = createSupabaseDataSourceStub()
    const hydrateLocalSqlite = vi.fn().mockResolvedValue({ errors: [] })

    const result = await syncPendingLocalSqliteOperations({
      driver,
      householdId: 'household-1',
      hydrateLocalSqlite,
      now: () => new Date('2026-06-24T10:00:00.000Z'),
      supabaseDataSource,
      userId: 'user-1',
    })

    expect(supabaseDataSource.transactions.create).toHaveBeenCalledWith({
      amount: 30,
      date: '2026-06-24',
      fromAccountId: 'account-1',
      idempotencyKey: 'transaction:local-transaction-1:create',
      type: 'expense',
    })
    expect(driver.runs).toContainEqual(
      expect.objectContaining({
        params: ['synced', null, '2026-06-24T10:00:00.000Z', null, 'operation-1'],
        sql: expect.stringContaining('update operation_queue'),
      }),
    )
    expect(hydrateLocalSqlite).toHaveBeenCalled()
    expect(result).toMatchObject({
      failedCount: 0,
      syncedCount: 1,
      totalCount: 1,
    })
  })

  it('marks duplicate-safe replay success as synced', async () => {
    const driver = new RecordingSqliteDriver()
    driver.queryRows = [createOperationRow()]
    const supabaseDataSource = createSupabaseDataSourceStub()
    const hydrateLocalSqlite = vi.fn().mockResolvedValue({ errors: [] })

    vi.mocked(supabaseDataSource.transactions.create).mockResolvedValueOnce(
      createRemoteTransaction({ id: 'existing-remote-transaction' }),
    )

    const result = await syncPendingLocalSqliteOperations({
      driver,
      householdId: 'household-1',
      hydrateLocalSqlite,
      now: () => new Date('2026-06-24T10:00:00.000Z'),
      supabaseDataSource,
      userId: 'user-1',
    })

    expect(supabaseDataSource.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'transaction:local-transaction-1:create',
      }),
    )
    expect(driver.runs).toContainEqual(
      expect.objectContaining({
        params: ['synced', null, '2026-06-24T10:00:00.000Z', null, 'operation-1'],
        sql: expect.stringContaining('update operation_queue'),
      }),
    )
    expect(result).toMatchObject({
      failedCount: 0,
      syncedCount: 1,
      totalCount: 1,
    })
  })

  it('marks failed replay attempts retryable with an error', async () => {
    const driver = new RecordingSqliteDriver()
    driver.queryRows = [createOperationRow()]
    const supabaseDataSource = createSupabaseDataSourceStub()

    vi.mocked(supabaseDataSource.transactions.create).mockRejectedValueOnce(
      new Error('network failed'),
    )

    const result = await syncPendingLocalSqliteOperations({
      driver,
      householdId: 'household-1',
      hydrateLocalSqlite: vi.fn(),
      now: () => new Date('2026-06-24T10:00:00.000Z'),
      supabaseDataSource,
      userId: 'user-1',
    })

    expect(driver.runs).toContainEqual(
      expect.objectContaining({
        params: [
          'failed',
          'network failed',
          '2026-06-24T10:00:00.000Z',
          '2026-06-24T10:01:00.000Z',
          'operation-1',
        ],
        sql: expect.stringContaining('attempt_count = attempt_count + 1'),
      }),
    )
    expect(result).toMatchObject({
      failedCount: 1,
      syncedCount: 0,
      totalCount: 1,
    })
  })

  it('does not run duplicate concurrent replay for the same household', async () => {
    const driver = new RecordingSqliteDriver()
    let resolveQuery: ((rows: LocalOperationQueueRow[]) => void) | undefined
    driver.query = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve as (rows: LocalOperationQueueRow[]) => void
        }),
    ) as RecordingSqliteDriver['query']
    const supabaseDataSource = createSupabaseDataSourceStub()

    const firstSync = syncPendingLocalSqliteOperations({
      driver,
      householdId: 'household-1',
      hydrateLocalSqlite: vi.fn(),
      supabaseDataSource,
    })
    const secondSync = syncPendingLocalSqliteOperations({
      driver,
      householdId: 'household-1',
      hydrateLocalSqlite: vi.fn(),
      supabaseDataSource,
    })

    resolveQuery?.([])

    await expect(Promise.all([firstSync, secondSync])).resolves.toEqual([
      {
        failedCount: 0,
        skippedCount: 0,
        syncedCount: 0,
        totalCount: 0,
      },
      {
        failedCount: 0,
        skippedCount: 0,
        syncedCount: 0,
        totalCount: 0,
      },
    ])
    expect(driver.query).toHaveBeenCalledTimes(1)
  })
})
