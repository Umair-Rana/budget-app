import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  createCloudBackup,
  createCloudBackupFileName,
  serializeCloudBackup,
} from '@/data/backup/cloud-backup-export'
import { CloudBackupError } from '@/data/backup/cloud-backup-types'
import type { Database } from '@/lib/supabase/database.types'

type TableRecords = Record<string, Array<Record<string, unknown>>>

function createMockSupabaseClient({
  errorTables = new Set<string>(),
  records,
}: {
  errorTables?: Set<string>
  records: TableRecords
}) {
  const from = vi.fn((tableName: string) => ({
    select: vi.fn(() => {
      const filters: Record<string, string> = {}
      const builder = {
        eq: vi.fn((column: string, value: string) => {
          filters[column] = value

          return builder
        }),
        maybeSingle: vi.fn(async () => {
          if (errorTables.has(tableName)) {
            return {
              data: null,
              error: { message: `${tableName} failed` },
            }
          }

          const row =
            records[tableName]?.find((record) =>
              Object.entries(filters).every(
                ([column, value]) => record[column] === value,
              ),
            ) ?? null

          return { data: row, error: null }
        }),
        order: vi.fn(async () => {
          if (errorTables.has(tableName)) {
            return {
              data: null,
              error: { message: `${tableName} failed` },
            }
          }

          const rows =
            records[tableName]?.filter((record) =>
              Object.entries(filters).every(
                ([column, value]) => record[column] === value,
              ),
            ) ?? []

          return { data: rows, error: null }
        }),
      }

      return builder
    }),
  }))

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    from,
  }
}

function createRecords() {
  return {
    households: [
      {
        id: 'household-1',
        name: 'My Household',
        currency: 'PKR',
        locale: 'en-PK',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        created_by: 'user-1',
        archived_at: null,
        deleted_at: null,
      },
    ],
    household_members: [
      {
        id: 'member-1',
        household_id: 'household-1',
        user_id: 'user-1',
        role: 'owner',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    accounts: [
      {
        id: 'account-1',
        household_id: 'household-1',
        name: 'Wallet',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    categories: [
      {
        id: 'category-1',
        household_id: 'household-1',
        name: 'Salary',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    transactions: [
      {
        id: 'transaction-1',
        household_id: 'household-1',
        amount: 1000,
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ],
    recurring_transactions: [
      {
        id: 'recurring-1',
        household_id: 'household-1',
        name: 'Salary',
        amount: 1000,
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ],
    recurring_bills: [
      {
        id: 'recurring-bill-1',
        household_id: 'household-1',
        name: 'Electricity',
        amount: 8000,
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ],
    bills: [],
    goals: [],
    loans: [],
    budgets: [],
    audit_history: [],
  }
}

describe('cloud backup export', () => {
  it('creates the expected backup shape from household-scoped Supabase rows', async () => {
    const { client, from } = createMockSupabaseClient({
      records: createRecords(),
    })
    const backup = await createCloudBackup({
      client,
      householdId: 'household-1',
      now: new Date('2026-01-02T03:04:00.000Z'),
    })

    expect(backup).toMatchObject({
      app: 'Household Finance',
      backupVersion: 2,
      source: 'supabase',
      exportedAt: '2026-01-02T03:04:00.000Z',
      household: {
        id: 'household-1',
        name: 'My Household',
      },
    })
    expect(backup.stores.household_members).toHaveLength(1)
    expect(backup.stores.accounts).toHaveLength(1)
    expect(backup.stores.categories).toHaveLength(1)
    expect(backup.stores.transactions).toHaveLength(1)
    expect(backup.stores.recurring_transactions).toHaveLength(1)
    expect(backup.stores.recurring_bills).toHaveLength(1)
    expect(backup.stores.bills).toEqual([])
    expect(backup.stores.goals).toEqual([])
    expect(backup.stores.loans).toEqual([])
    expect(backup.stores.budgets).toEqual([])
    expect(backup.stores.audit_history).toEqual([])
    expect(from).toHaveBeenCalledWith('households')
    expect(from).toHaveBeenCalledWith('household_members')
    expect(from).toHaveBeenCalledWith('recurring_transactions')
    expect(from).toHaveBeenCalledWith('recurring_bills')
  })

  it('generates the cloud backup filename with local date parts', () => {
    const filename = createCloudBackupFileName(new Date(2026, 0, 2, 3, 4))

    expect(filename).toBe('household-finance-cloud-backup-2026-01-02-03-04.json')
  })

  it('does not serialize auth secrets or credentials', async () => {
    const { client } = createMockSupabaseClient({
      records: createRecords(),
    })
    const backup = await createCloudBackup({
      client,
      householdId: 'household-1',
      now: new Date('2026-01-02T03:04:00.000Z'),
    })
    const serialized = serializeCloudBackup(backup)

    expect(serialized).not.toMatch(
      /access_token|refresh_token|service_role|password/i,
    )
  })

  it('fails safely when cloud backup context is missing', async () => {
    await expect(
      createCloudBackup({
        client: null,
        householdId: 'household-1',
      }),
    ).rejects.toBeInstanceOf(CloudBackupError)

    await expect(
      createCloudBackup({
        client: {} as SupabaseClient<Database>,
        householdId: null,
      }),
    ).rejects.toThrow('Cloud backup requires a loaded household')
  })

  it('omits optional audit history if that table cannot be exported', async () => {
    const { client } = createMockSupabaseClient({
      errorTables: new Set(['audit_history']),
      records: createRecords(),
    })
    const backup = await createCloudBackup({
      client,
      householdId: 'household-1',
      now: new Date('2026-01-02T03:04:00.000Z'),
    })

    expect(backup.stores.audit_history).toBeUndefined()
    expect(backup.stores.accounts).toHaveLength(1)
  })
})
