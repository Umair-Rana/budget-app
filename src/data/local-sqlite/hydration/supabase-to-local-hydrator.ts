import type { SupabaseClient } from '@supabase/supabase-js'

import type { FinanceDataSource } from '@/data/contracts'
import {
  toLocalAccountRow,
  toLocalBillRow,
  toLocalBudgetRow,
  toLocalCategoryRow,
  toLocalGoalRow,
  toLocalLoanRow,
  toLocalNotificationRow,
  toLocalRecurringBillRow,
  toLocalRecurringTransactionRow,
  toLocalTransactionRow,
} from '@/data/local-sqlite/mappers'
import type {
  LocalHouseholdMemberRow,
  LocalHouseholdRow,
} from '@/data/local-sqlite/local-finance-row-types'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'
import {
  createEmptyLocalHydrationTableCounts,
  createLocalHydrationResult,
  getLocalHydrationErrorMessage,
} from '@/data/local-sqlite/hydration/hydration-result'
import type {
  LocalHydrationHouseholdSnapshot,
  LocalHydrationResult,
  LocalHydrationSmokeTestInput,
  LocalHydrationTableCounts,
  SupabaseToLocalHydrationInput,
} from '@/data/local-sqlite/hydration/local-hydration-types'
import { localHydrationEntityTypes } from '@/data/local-sqlite/hydration/local-hydration-types'
import {
  markLocalHouseholdRowsDeleted,
  type LocalSqliteUpsertRow,
  upsertLocalSqliteRows,
  upsertLocalSyncMetadata,
} from '@/data/local-sqlite/hydration/local-upsert-helpers'
import { createNotifications } from '@/data/notifications/notification-selectors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import type { Database } from '@/lib/supabase/database.types'

const includeAllRows = {
  includeArchived: true,
  includeDeleted: true,
} satisfies RepositoryListOptions

const householdScopedSoftDeleteTables = [
  'household_members',
  'accounts',
  'categories',
  'transactions',
  'bills',
  'goals',
  'loans',
  'budgets',
  'recurring_transactions',
  'recurring_bills',
  'notifications',
] as const

type HouseholdMemberCloudRow =
  Database['public']['Tables']['household_members']['Row']
type HouseholdCloudRow = Database['public']['Tables']['households']['Row']

type CloudFinanceData = Awaited<ReturnType<typeof readCloudFinanceData>>

function mapHouseholdMemberRole(
  role: string,
): LocalHouseholdMemberRow['role'] {
  return role === 'owner' || role === 'viewer' ? role : 'member'
}

function mapCloudHouseholdRow(row: HouseholdCloudRow): LocalHouseholdRow {
  return {
    archived_at: row.archived_at,
    created_at: row.created_at,
    created_by: row.created_by,
    currency: row.currency,
    deleted_at: row.deleted_at,
    id: row.id,
    locale: row.locale,
    name: row.name,
    updated_at: row.updated_at,
  }
}

function mapCloudHouseholdMemberRow(
  row: HouseholdMemberCloudRow,
): LocalHouseholdMemberRow {
  return {
    created_at: row.created_at,
    deleted_at: null,
    household_id: row.household_id,
    id: row.id,
    role: mapHouseholdMemberRole(row.role),
    updated_at: row.updated_at,
    user_id: row.user_id,
  }
}

async function fetchHouseholdSnapshot({
  householdId,
  supabaseClient,
}: {
  householdId: string
  supabaseClient: SupabaseClient<Database>
}): Promise<LocalHydrationHouseholdSnapshot> {
  const [householdResult, membersResult] = await Promise.all([
    supabaseClient
      .from('households')
      .select('*')
      .eq('id', householdId)
      .maybeSingle(),
    supabaseClient
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true }),
  ])

  if (householdResult.error) {
    throw new Error(
      `Loading household for local hydration failed. ${householdResult.error.message}`,
    )
  }

  if (!householdResult.data) {
    throw new Error('Loading household for local hydration returned no row.')
  }

  if (membersResult.error) {
    throw new Error(
      `Loading household members for local hydration failed. ${membersResult.error.message}`,
    )
  }

  return {
    household: mapCloudHouseholdRow(householdResult.data),
    householdMembers: (membersResult.data ?? []).map(mapCloudHouseholdMemberRow),
  }
}

async function resolveHouseholdSnapshot({
  householdId,
  householdSnapshot,
  supabaseClient,
}: Pick<
  SupabaseToLocalHydrationInput,
  'householdId' | 'householdSnapshot' | 'supabaseClient'
>): Promise<LocalHydrationHouseholdSnapshot> {
  if (householdSnapshot) {
    return householdSnapshot
  }

  if (supabaseClient) {
    return fetchHouseholdSnapshot({ householdId, supabaseClient })
  }

  throw new Error(
    'Local hydration requires either a Supabase client or an explicit household snapshot.',
  )
}

async function readCloudFinanceData(dataSource: FinanceDataSource) {
  const [
    accounts,
    bills,
    budgets,
    categories,
    goals,
    loans,
    recurringBills,
    recurringTransactions,
    transactions,
  ] = await Promise.all([
    dataSource.accounts.getAll(includeAllRows),
    dataSource.bills.getAll(includeAllRows),
    dataSource.budgets.getAll(includeAllRows),
    dataSource.categories.getAll(includeAllRows),
    dataSource.goals.getAll(includeAllRows),
    dataSource.loans.getAll(includeAllRows),
    dataSource.recurringBills.getAll(includeAllRows),
    dataSource.recurringTransactions.getAll(includeAllRows),
    dataSource.transactions.getAll(includeAllRows),
  ])

  const notifications = createNotifications({
    bills,
    budgets,
    categories,
    goals,
    loans,
    recurringTransactions,
    transactions,
  })

  return {
    accounts,
    bills,
    budgets,
    categories,
    goals,
    loans,
    notifications,
    recurringBills,
    recurringTransactions,
    transactions,
  }
}

function createHydrationRows({
  cloudData,
  householdId,
  householdSnapshot,
  userId,
}: {
  cloudData: CloudFinanceData
  householdId: string
  householdSnapshot: LocalHydrationHouseholdSnapshot
  userId?: string
}) {
  const context = { householdId, userId }

  return {
    accounts: cloudData.accounts.map((record) =>
      toLocalAccountRow(record, context),
    ),
    bills: cloudData.bills.map((record) => toLocalBillRow(record, context)),
    budgets: cloudData.budgets.map((record) =>
      toLocalBudgetRow(record, context),
    ),
    categories: cloudData.categories.map((record) =>
      toLocalCategoryRow(record, context),
    ),
    goals: cloudData.goals.map((record) => toLocalGoalRow(record, context)),
    householdMembers: householdSnapshot.householdMembers,
    households: [householdSnapshot.household],
    loans: cloudData.loans.map((record) => toLocalLoanRow(record, context)),
    notifications: cloudData.notifications.map((record) =>
      toLocalNotificationRow(record, context),
    ),
    recurringBills: cloudData.recurringBills.map((record) =>
      toLocalRecurringBillRow(record, context),
    ),
    recurringTransactions: cloudData.recurringTransactions.map((record) =>
      toLocalRecurringTransactionRow(record, context),
    ),
    transactions: cloudData.transactions.map((record) =>
      toLocalTransactionRow(record, context),
    ),
  }
}

function countHydrationRows(
  rows: ReturnType<typeof createHydrationRows>,
): LocalHydrationTableCounts {
  return {
    accounts: rows.accounts.length,
    bills: rows.bills.length,
    budgets: rows.budgets.length,
    categories: rows.categories.length,
    goals: rows.goals.length,
    householdMembers: rows.householdMembers.length,
    households: rows.households.length,
    loans: rows.loans.length,
    notifications: rows.notifications.length,
    recurringBills: rows.recurringBills.length,
    recurringTransactions: rows.recurringTransactions.length,
    transactions: rows.transactions.length,
  }
}

async function softDeleteExistingLocalProjection({
  deletedAt,
  driver,
  householdId,
}: {
  deletedAt: string
  driver: LocalSqliteDriver
  householdId: string
}) {
  for (const tableName of householdScopedSoftDeleteTables) {
    await markLocalHouseholdRowsDeleted({
      deletedAt,
      driver,
      householdId,
      tableName,
    })
  }
}

async function upsertHydrationRows({
  driver,
  rows,
}: {
  driver: LocalSqliteDriver
  rows: ReturnType<typeof createHydrationRows>
}) {
  await upsertLocalSqliteRows({
    driver,
    rows: rows.households as unknown as LocalSqliteUpsertRow[],
    tableName: 'households',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.householdMembers as unknown as LocalSqliteUpsertRow[],
    tableName: 'household_members',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.accounts as unknown as LocalSqliteUpsertRow[],
    tableName: 'accounts',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.categories as unknown as LocalSqliteUpsertRow[],
    tableName: 'categories',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.transactions as unknown as LocalSqliteUpsertRow[],
    tableName: 'transactions',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.bills as unknown as LocalSqliteUpsertRow[],
    tableName: 'bills',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.goals as unknown as LocalSqliteUpsertRow[],
    tableName: 'goals',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.loans as unknown as LocalSqliteUpsertRow[],
    tableName: 'loans',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.budgets as unknown as LocalSqliteUpsertRow[],
    tableName: 'budgets',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.recurringTransactions as unknown as LocalSqliteUpsertRow[],
    tableName: 'recurring_transactions',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.recurringBills as unknown as LocalSqliteUpsertRow[],
    tableName: 'recurring_bills',
  })
  await upsertLocalSqliteRows({
    driver,
    rows: rows.notifications as unknown as LocalSqliteUpsertRow[],
    tableName: 'notifications',
  })
}

async function updateHydrationMetadata({
  driver,
  householdId,
  pulledAt,
}: {
  driver: LocalSqliteDriver
  householdId: string
  pulledAt: string
}) {
  for (const entityType of localHydrationEntityTypes) {
    await upsertLocalSyncMetadata({
      driver,
      entityType,
      householdId,
      pulledAt,
    })
  }
}

export async function hydrateSupabaseToLocalSqlite({
  dataSource,
  householdId,
  householdSnapshot,
  localDriver,
  now = new Date(),
  supabaseClient,
  userId,
}: SupabaseToLocalHydrationInput): Promise<LocalHydrationResult> {
  const startedAt = now.toISOString()

  try {
    const [resolvedHouseholdSnapshot, cloudData] = await Promise.all([
      resolveHouseholdSnapshot({
        householdId,
        householdSnapshot,
        supabaseClient,
      }),
      readCloudFinanceData(dataSource),
    ])
    const rows = createHydrationRows({
      cloudData,
      householdId,
      householdSnapshot: resolvedHouseholdSnapshot,
      userId,
    })
    const counts = countHydrationRows(rows)

    await localDriver.transaction(async () => {
      await softDeleteExistingLocalProjection({
        deletedAt: startedAt,
        driver: localDriver,
        householdId,
      })
      await upsertHydrationRows({ driver: localDriver, rows })
      await updateHydrationMetadata({
        driver: localDriver,
        householdId,
        pulledAt: startedAt,
      })
    })

    return createLocalHydrationResult({
      completedAt: now.toISOString(),
      householdId,
      startedAt,
      tables: counts,
    })
  } catch (error) {
    return createLocalHydrationResult({
      completedAt: now.toISOString(),
      errors: [getLocalHydrationErrorMessage(error)],
      householdId,
      startedAt,
      tables: createEmptyLocalHydrationTableCounts(),
    })
  }
}

export async function runLocalHydrationSmokeTest(
  input: LocalHydrationSmokeTestInput,
) {
  if (!import.meta.env.DEV) {
    throw new Error('Local hydration smoke test is available only in development.')
  }

  return hydrateSupabaseToLocalSqlite(input)
}
