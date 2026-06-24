import type { FinanceDataSource } from '@/data/contracts'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'
import type { CloudHousehold } from '@/data/supabase/household-bootstrap'
import { createSupabaseFinanceDataSource } from '@/data/supabase/supabase-finance-data-source'
import type { SupabaseFinanceRepositoryContextInput } from '@/data/supabase/repositories/supabase-repository-context'
import { featureFlags } from '@/lib/feature-flags'
import { getLastKnownNetworkConnected } from '@/lib/network-status'

export type FinanceRepositoryRuntime = 'cloud'

type FinanceDataSourceFactoryLogger = Pick<Console, 'debug' | 'warn'>
type HydrateLocalSqlite = typeof import('@/data/local-sqlite/hydration')['hydrateSupabaseToLocalSqlite']
type InitializeLocalSqliteDriver = typeof import('@/data/local-sqlite/initialize-local-sqlite')['initializeLocalSqlite']
type CreateLocalSqliteFinanceDataSource = typeof import('@/data/local-sqlite/local-sqlite-finance-data-source')['createLocalSqliteFinanceDataSource']
type CreateOfflineLocalTransaction = typeof import('@/data/local-sqlite/sync')['createOfflineLocalTransaction']
type SyncPendingLocalSqliteOperations = typeof import('@/data/local-sqlite/sync')['syncPendingLocalSqliteOperations']
type LocalSyncPendingOperationsResult =
  import('@/data/local-sqlite/sync').LocalSyncPendingOperationsResult

export interface CreateFinanceDataSourceInput
  extends SupabaseFinanceRepositoryContextInput {
  runtime?: FinanceRepositoryRuntime
}

export interface CreateFinanceDataSourceForRuntimeInput
  extends CreateFinanceDataSourceInput {
  flags?: Pick<typeof featureFlags, 'localSqliteReadMode' | 'offlineMode'>
  createLocalSqliteDataSource?: CreateLocalSqliteFinanceDataSource
  createOfflineLocalTransaction?: CreateOfflineLocalTransaction
  hydrateLocalSqlite?: HydrateLocalSqlite
  initializeLocalSqliteDriver?: InitializeLocalSqliteDriver
  isOnline?: () => boolean
  logger?: FinanceDataSourceFactoryLogger
  supabaseDataSource?: FinanceDataSource
  syncPendingLocalOperations?: SyncPendingLocalSqliteOperations
}

export interface CreateCachedLocalReadRuntimeInput
  extends SupabaseFinanceRepositoryContextInput {
  createLocalSqliteDataSource?: CreateLocalSqliteFinanceDataSource
  createOfflineLocalTransaction?: CreateOfflineLocalTransaction
  flags?: Pick<typeof featureFlags, 'localSqliteReadMode' | 'offlineMode'>
  initializeLocalSqliteDriver?: InitializeLocalSqliteDriver
  isOnline?: () => boolean
  logger?: FinanceDataSourceFactoryLogger
  syncPendingLocalOperations?: SyncPendingLocalSqliteOperations
}

export type CachedLocalReadRuntimeResult = {
  dataSource: FinanceDataSource
  household: CloudHousehold
}

export const localReadModeOnlineRequiredMessage =
  'Online connection is required for changes. Offline writes are not implemented yet.'

export type LocalSqliteSyncCapableFinanceDataSource = FinanceDataSource & {
  syncPendingOperations?: () => Promise<LocalSyncPendingOperationsResult>
}

function getBrowserOnlineStatus() {
  return getLastKnownNetworkConnected()
}

export function createFinanceDataSource(
  input: CreateFinanceDataSourceInput,
): FinanceDataSource {
  if (featureFlags.offlineMode) {
    throw new Error('Offline repository runtime is not implemented yet.')
  }

  return createSupabaseFinanceDataSource(input)
}

function createDevLogger(
  logger: FinanceDataSourceFactoryLogger | undefined,
): FinanceDataSourceFactoryLogger {
  return {
    debug(...data: unknown[]) {
      if (import.meta.env.DEV) {
        logger?.debug(...data)
      }
    },
    warn(...data: unknown[]) {
      if (import.meta.env.DEV) {
        logger?.warn(...data)
      }
    },
  }
}

function createHybridLocalReadDataSource({
  createOfflineLocalTransaction,
  hydrateLocalSqlite,
  isOnline,
  localDriver,
  localDataSource,
  logger,
  supabaseDataSource,
  syncPendingLocalOperations,
  householdId,
  userId,
}: {
  createOfflineLocalTransaction: CreateOfflineLocalTransaction
  hydrateLocalSqlite: HydrateLocalSqlite
  householdId: string
  isOnline: () => boolean
  localDataSource: FinanceDataSource
  localDriver: LocalSqliteDriver
  logger: FinanceDataSourceFactoryLogger
  supabaseDataSource: FinanceDataSource
  syncPendingLocalOperations: SyncPendingLocalSqliteOperations
  userId?: string | null
}): LocalSqliteSyncCapableFinanceDataSource {
  async function rehydrateAfterSupabaseWrite(operation: string) {
    logger.debug(
      `[local-sqlite-read] Supabase write completed; rehydrating after ${operation}.`,
    )

    try {
      const result = await hydrateLocalSqlite({
        dataSource: supabaseDataSource,
        householdId,
        localDriver,
        userId: userId ?? undefined,
      })

      if (result.errors.length > 0) {
        logger.warn(
          `[local-sqlite-read] Rehydration after ${operation} returned errors.`,
          result.errors,
        )
      }
    } catch (error) {
      logger.warn(
        `[local-sqlite-read] Rehydration after ${operation} failed; keeping Supabase write result.`,
        error,
      )
    }
  }

  async function runSupabaseWrite<T>(
    operation: string,
    work: () => Promise<T>,
  ) {
    if (!isOnline()) {
      throwLocalReadModeOnlineRequired()
    }

    const result = await work()
    await rehydrateAfterSupabaseWrite(operation)
    return result
  }

  async function createTransaction(input: Parameters<FinanceDataSource['transactions']['create']>[0]) {
    if (!isOnline()) {
      logger.debug('[local-sqlite-read] Routing transaction create to local SQLite.', {
        transactionType: input.type,
      })

      return createOfflineLocalTransaction({
        driver: localDriver,
        householdId,
        input,
        userId,
      })
    }

    logger.debug('[local-sqlite-read] Routing transaction create to Supabase.', {
      transactionType: input.type,
    })

    return runSupabaseWrite('transactions.create', () =>
      supabaseDataSource.transactions.create(input),
    )
  }

  return {
    mode: 'offline',
    syncPendingOperations: () =>
      syncPendingLocalOperations({
        driver: localDriver,
        householdId,
        hydrateLocalSqlite,
        supabaseDataSource,
        userId,
      }),
    accounts: {
      ...supabaseDataSource.accounts,
      getAll: localDataSource.accounts.getAll,
      getById: localDataSource.accounts.getById,
      create: (input) =>
        runSupabaseWrite('accounts.create', () =>
          supabaseDataSource.accounts.create(input),
        ),
      update: (id, input) =>
        runSupabaseWrite('accounts.update', () =>
          supabaseDataSource.accounts.update(id, input),
        ),
      archive: (id) =>
        runSupabaseWrite('accounts.archive', () =>
          supabaseDataSource.accounts.archive(id),
        ),
      deleteSoft: (id) =>
        runSupabaseWrite('accounts.deleteSoft', () =>
          supabaseDataSource.accounts.deleteSoft(id),
        ),
    },
    bills: {
      ...supabaseDataSource.bills,
      getAll: localDataSource.bills.getAll,
      getById: localDataSource.bills.getById,
      create: (input) =>
        runSupabaseWrite('bills.create', () =>
          supabaseDataSource.bills.create(input),
        ),
      update: (id, input) =>
        runSupabaseWrite('bills.update', () =>
          supabaseDataSource.bills.update(id, input),
        ),
      archive: (id) =>
        runSupabaseWrite('bills.archive', () =>
          supabaseDataSource.bills.archive(id),
        ),
      deleteSoft: (id) =>
        runSupabaseWrite('bills.deleteSoft', () =>
          supabaseDataSource.bills.deleteSoft(id),
        ),
      markPaid: (id, input) =>
        runSupabaseWrite('bills.markPaid', () =>
          supabaseDataSource.bills.markPaid(id, input),
        ),
      markUnpaid: (id) =>
        runSupabaseWrite('bills.markUnpaid', () =>
          supabaseDataSource.bills.markUnpaid(id),
        ),
    },
    budgets: {
      ...supabaseDataSource.budgets,
      getAll: localDataSource.budgets.getAll,
      getById: localDataSource.budgets.getById,
      getByMonth: localDataSource.budgets.getByMonth,
      create: (input) =>
        runSupabaseWrite('budgets.create', () =>
          supabaseDataSource.budgets.create(input),
        ),
      update: (id, input) =>
        runSupabaseWrite('budgets.update', () =>
          supabaseDataSource.budgets.update(id, input),
        ),
      archive: (id) =>
        runSupabaseWrite('budgets.archive', () =>
          supabaseDataSource.budgets.archive(id),
        ),
      deleteSoft: (id) =>
        runSupabaseWrite('budgets.deleteSoft', () =>
          supabaseDataSource.budgets.deleteSoft(id),
        ),
    },
    categories: {
      ...supabaseDataSource.categories,
      getAll: localDataSource.categories.getAll,
      getById: localDataSource.categories.getById,
      getByType: localDataSource.categories.getByType,
      create: (input) =>
        runSupabaseWrite('categories.create', () =>
          supabaseDataSource.categories.create(input),
        ),
      update: (id, input) =>
        runSupabaseWrite('categories.update', () =>
          supabaseDataSource.categories.update(id, input),
        ),
      archive: (id) =>
        runSupabaseWrite('categories.archive', () =>
          supabaseDataSource.categories.archive(id),
        ),
      deleteSoft: (id) =>
        runSupabaseWrite('categories.deleteSoft', () =>
          supabaseDataSource.categories.deleteSoft(id),
        ),
      seedDefaultsIfNeeded: () =>
        runSupabaseWrite('categories.seedDefaultsIfNeeded', () =>
          supabaseDataSource.categories.seedDefaultsIfNeeded(),
        ),
    },
    goals: {
      ...supabaseDataSource.goals,
      getAll: localDataSource.goals.getAll,
      getById: localDataSource.goals.getById,
      create: (input) =>
        runSupabaseWrite('goals.create', () =>
          supabaseDataSource.goals.create(input),
        ),
      update: (id, input) =>
        runSupabaseWrite('goals.update', () =>
          supabaseDataSource.goals.update(id, input),
        ),
      archive: (id) =>
        runSupabaseWrite('goals.archive', () =>
          supabaseDataSource.goals.archive(id),
        ),
      deleteSoft: (id) =>
        runSupabaseWrite('goals.deleteSoft', () =>
          supabaseDataSource.goals.deleteSoft(id),
        ),
      addContribution: (id, input) =>
        runSupabaseWrite('goals.addContribution', () =>
          supabaseDataSource.goals.addContribution(id, input),
        ),
      withdraw: (id, input) =>
        runSupabaseWrite('goals.withdraw', () =>
          supabaseDataSource.goals.withdraw(id, input),
        ),
    },
    loans: {
      ...supabaseDataSource.loans,
      getAll: localDataSource.loans.getAll,
      getById: localDataSource.loans.getById,
      create: (input) =>
        runSupabaseWrite('loans.create', () =>
          supabaseDataSource.loans.create(input),
        ),
      update: (id, input) =>
        runSupabaseWrite('loans.update', () =>
          supabaseDataSource.loans.update(id, input),
        ),
      archive: (id) =>
        runSupabaseWrite('loans.archive', () =>
          supabaseDataSource.loans.archive(id),
        ),
      deleteSoft: (id) =>
        runSupabaseWrite('loans.deleteSoft', () =>
          supabaseDataSource.loans.deleteSoft(id),
        ),
      recordPayment: (id, input) =>
        runSupabaseWrite('loans.recordPayment', () =>
          supabaseDataSource.loans.recordPayment(id, input),
        ),
    },
    recurringBills: {
      ...supabaseDataSource.recurringBills,
      getAll: localDataSource.recurringBills.getAll,
      getById: localDataSource.recurringBills.getById,
      getDue: localDataSource.recurringBills.getDue,
      create: (input) =>
        runSupabaseWrite('recurringBills.create', () =>
          supabaseDataSource.recurringBills.create(input),
        ),
      update: (id, input) =>
        runSupabaseWrite('recurringBills.update', () =>
          supabaseDataSource.recurringBills.update(id, input),
        ),
      archive: (id) =>
        runSupabaseWrite('recurringBills.archive', () =>
          supabaseDataSource.recurringBills.archive(id),
        ),
      deleteSoft: (id) =>
        runSupabaseWrite('recurringBills.deleteSoft', () =>
          supabaseDataSource.recurringBills.deleteSoft(id),
        ),
      generateDue: (asOfDate) =>
        runSupabaseWrite('recurringBills.generateDue', () =>
          supabaseDataSource.recurringBills.generateDue(asOfDate),
        ),
    },
    recurringTransactions: {
      ...supabaseDataSource.recurringTransactions,
      getAll: localDataSource.recurringTransactions.getAll,
      getById: localDataSource.recurringTransactions.getById,
      getDue: localDataSource.recurringTransactions.getDue,
      create: (input) =>
        runSupabaseWrite('recurringTransactions.create', () =>
          supabaseDataSource.recurringTransactions.create(input),
        ),
      update: (id, input) =>
        runSupabaseWrite('recurringTransactions.update', () =>
          supabaseDataSource.recurringTransactions.update(id, input),
        ),
      archive: (id) =>
        runSupabaseWrite('recurringTransactions.archive', () =>
          supabaseDataSource.recurringTransactions.archive(id),
        ),
      deleteSoft: (id) =>
        runSupabaseWrite('recurringTransactions.deleteSoft', () =>
          supabaseDataSource.recurringTransactions.deleteSoft(id),
        ),
      generateDue: (asOfDate) =>
        runSupabaseWrite('recurringTransactions.generateDue', () =>
          supabaseDataSource.recurringTransactions.generateDue(asOfDate),
        ),
    },
    transactions: {
      ...supabaseDataSource.transactions,
      getAll: localDataSource.transactions.getAll,
      getById: localDataSource.transactions.getById,
      getByType: localDataSource.transactions.getByType,
      create: createTransaction,
      update: (id, input) =>
        runSupabaseWrite('transactions.update', () =>
          supabaseDataSource.transactions.update(id, input),
        ),
      archive: (id) =>
        runSupabaseWrite('transactions.archive', () =>
          supabaseDataSource.transactions.archive(id),
        ),
      deleteSoft: (id) =>
        runSupabaseWrite('transactions.deleteSoft', () =>
          supabaseDataSource.transactions.deleteSoft(id),
        ),
    },
  }
}

function throwLocalReadModeOnlineRequired(): never {
  throw new Error(localReadModeOnlineRequiredMessage)
}

function createOfflineCachedLocalReadDataSource({
  createOfflineLocalTransaction,
  hydrateLocalSqlite,
  householdId,
  isOnline,
  localDataSource,
  localDriver,
  supabaseDataSource,
  syncPendingLocalOperations,
  userId,
}: {
  createOfflineLocalTransaction: CreateOfflineLocalTransaction
  householdId: string
  hydrateLocalSqlite?: HydrateLocalSqlite
  isOnline: () => boolean
  localDataSource: FinanceDataSource
  localDriver: LocalSqliteDriver
  supabaseDataSource?: FinanceDataSource
  syncPendingLocalOperations: SyncPendingLocalSqliteOperations
  userId?: string | null
}): LocalSqliteSyncCapableFinanceDataSource {
  async function runOnlineSupabaseWrite<T>(work: () => Promise<T>) {
    if (!isOnline() || !supabaseDataSource) {
      throwLocalReadModeOnlineRequired()
    }

    return work()
  }

  async function createTransaction(input: Parameters<FinanceDataSource['transactions']['create']>[0]) {
    if (!isOnline()) {
      if (import.meta.env.DEV) {
        console.debug(
          '[local-sqlite-read] Routing cached transaction create to local SQLite.',
          { transactionType: input.type },
        )
      }

      return createOfflineLocalTransaction({
        driver: localDriver,
        householdId,
        input,
        userId,
      })
    }

    if (!supabaseDataSource) {
      throwLocalReadModeOnlineRequired()
    }

    if (import.meta.env.DEV) {
      console.debug(
        '[local-sqlite-read] Routing cached transaction create to Supabase.',
        { transactionType: input.type },
      )
    }

    return supabaseDataSource.transactions.create(input)
  }

  return {
    mode: 'offline',
    syncPendingOperations:
      supabaseDataSource
        ? async () => {
            const resolvedHydrateLocalSqlite =
              hydrateLocalSqlite ??
              (await import('@/data/local-sqlite/hydration').then(
                (module) => module.hydrateSupabaseToLocalSqlite,
              ))

            return syncPendingLocalOperations({
              driver: localDriver,
              householdId,
              hydrateLocalSqlite: resolvedHydrateLocalSqlite,
              supabaseDataSource,
              userId,
            })
          }
        : undefined,
    accounts: {
      ...localDataSource.accounts,
      create: (input) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.accounts.create(input)),
      update: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.accounts.update(id, input),
        ),
      archive: (id) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.accounts.archive(id)),
      deleteSoft: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.accounts.deleteSoft(id),
        ),
    },
    bills: {
      ...localDataSource.bills,
      create: (input) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.bills.create(input)),
      update: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.bills.update(id, input),
        ),
      archive: (id) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.bills.archive(id)),
      deleteSoft: (id) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.bills.deleteSoft(id)),
      markPaid: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.bills.markPaid(id, input),
        ),
      markUnpaid: (id) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.bills.markUnpaid(id)),
    },
    budgets: {
      ...localDataSource.budgets,
      create: (input) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.budgets.create(input)),
      update: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.budgets.update(id, input),
        ),
      archive: (id) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.budgets.archive(id)),
      deleteSoft: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.budgets.deleteSoft(id),
        ),
    },
    categories: {
      ...localDataSource.categories,
      create: (input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.categories.create(input),
        ),
      update: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.categories.update(id, input),
        ),
      archive: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.categories.archive(id),
        ),
      deleteSoft: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.categories.deleteSoft(id),
        ),
      seedDefaultsIfNeeded: async () => ({
        createdCount: 0,
        seeded: false,
        updatedCount: 0,
      }),
    },
    goals: {
      ...localDataSource.goals,
      create: (input) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.goals.create(input)),
      update: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.goals.update(id, input),
        ),
      archive: (id) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.goals.archive(id)),
      deleteSoft: (id) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.goals.deleteSoft(id)),
      addContribution: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.goals.addContribution(id, input),
        ),
      withdraw: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.goals.withdraw(id, input),
        ),
    },
    loans: {
      ...localDataSource.loans,
      create: (input) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.loans.create(input)),
      update: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.loans.update(id, input),
        ),
      archive: (id) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.loans.archive(id)),
      deleteSoft: (id) =>
        runOnlineSupabaseWrite(() => supabaseDataSource!.loans.deleteSoft(id)),
      recordPayment: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.loans.recordPayment(id, input),
        ),
    },
    recurringBills: {
      ...localDataSource.recurringBills,
      create: (input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringBills.create(input),
        ),
      update: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringBills.update(id, input),
        ),
      archive: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringBills.archive(id),
        ),
      deleteSoft: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringBills.deleteSoft(id),
        ),
      generateDue: (asOfDate) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringBills.generateDue(asOfDate),
        ),
    },
    recurringTransactions: {
      ...localDataSource.recurringTransactions,
      create: (input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringTransactions.create(input),
        ),
      update: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringTransactions.update(id, input),
        ),
      archive: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringTransactions.archive(id),
        ),
      deleteSoft: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringTransactions.deleteSoft(id),
        ),
      generateDue: (asOfDate) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.recurringTransactions.generateDue(asOfDate),
        ),
    },
    transactions: {
      ...localDataSource.transactions,
      create: createTransaction,
      update: (id, input) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.transactions.update(id, input),
        ),
      archive: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.transactions.archive(id),
        ),
      deleteSoft: (id) =>
        runOnlineSupabaseWrite(() =>
          supabaseDataSource!.transactions.deleteSoft(id),
        ),
    },
  }
}

async function loadLocalSqliteReadModeDependencies({
  createLocalSqliteDataSource,
  createOfflineLocalTransaction,
  hydrateLocalSqlite,
  initializeLocalSqliteDriver,
  syncPendingLocalOperations,
}: Pick<
  CreateFinanceDataSourceForRuntimeInput,
  | 'createLocalSqliteDataSource'
  | 'createOfflineLocalTransaction'
  | 'hydrateLocalSqlite'
  | 'initializeLocalSqliteDriver'
  | 'syncPendingLocalOperations'
>) {
  const [
    resolvedHydrate,
    resolvedInitialize,
    resolvedCreateLocalDataSource,
    resolvedCreateOfflineTransaction,
    resolvedSyncPendingOperations,
  ] = await Promise.all([
      hydrateLocalSqlite
        ? Promise.resolve(hydrateLocalSqlite)
        : import('@/data/local-sqlite/hydration').then(
            (module) => module.hydrateSupabaseToLocalSqlite,
          ),
      initializeLocalSqliteDriver
        ? Promise.resolve(initializeLocalSqliteDriver)
        : import('@/data/local-sqlite/initialize-local-sqlite').then(
            (module) => module.initializeLocalSqlite,
          ),
      createLocalSqliteDataSource
        ? Promise.resolve(createLocalSqliteDataSource)
        : import('@/data/local-sqlite/local-sqlite-finance-data-source').then(
            (module) => module.createLocalSqliteFinanceDataSource,
          ),
      createOfflineLocalTransaction
        ? Promise.resolve(createOfflineLocalTransaction)
        : import('@/data/local-sqlite/sync').then(
            (module) => module.createOfflineLocalTransaction,
          ),
      syncPendingLocalOperations
        ? Promise.resolve(syncPendingLocalOperations)
        : import('@/data/local-sqlite/sync').then(
            (module) => module.syncPendingLocalSqliteOperations,
          ),
    ])

  return {
    createLocalSqliteDataSource: resolvedCreateLocalDataSource,
    createOfflineLocalTransaction: resolvedCreateOfflineTransaction,
    hydrateLocalSqlite: resolvedHydrate,
    initializeLocalSqliteDriver: resolvedInitialize,
    syncPendingLocalOperations: resolvedSyncPendingOperations,
  }
}

async function loadCachedLocalReadModeDependencies({
  createLocalSqliteDataSource,
  createOfflineLocalTransaction,
  initializeLocalSqliteDriver,
  syncPendingLocalOperations,
}: Pick<
  CreateFinanceDataSourceForRuntimeInput,
  | 'createLocalSqliteDataSource'
  | 'createOfflineLocalTransaction'
  | 'initializeLocalSqliteDriver'
  | 'syncPendingLocalOperations'
>) {
  const [
    resolvedInitialize,
    resolvedCreateLocalDataSource,
    resolvedCreateOfflineTransaction,
    resolvedSyncPendingOperations,
  ] = await Promise.all([
      initializeLocalSqliteDriver
        ? Promise.resolve(initializeLocalSqliteDriver)
        : import('@/data/local-sqlite/initialize-local-sqlite').then(
            (module) => module.initializeLocalSqlite,
          ),
      createLocalSqliteDataSource
        ? Promise.resolve(createLocalSqliteDataSource)
        : import('@/data/local-sqlite/local-sqlite-finance-data-source').then(
            (module) => module.createLocalSqliteFinanceDataSource,
          ),
      createOfflineLocalTransaction
        ? Promise.resolve(createOfflineLocalTransaction)
        : import('@/data/local-sqlite/sync').then(
            (module) => module.createOfflineLocalTransaction,
          ),
      syncPendingLocalOperations
        ? Promise.resolve(syncPendingLocalOperations)
        : import('@/data/local-sqlite/sync').then(
            (module) => module.syncPendingLocalSqliteOperations,
          ),
    ])

  return {
    createLocalSqliteDataSource: resolvedCreateLocalDataSource,
    createOfflineLocalTransaction: resolvedCreateOfflineTransaction,
    initializeLocalSqliteDriver: resolvedInitialize,
    syncPendingLocalOperations: resolvedSyncPendingOperations,
  }
}

type LocalHydratedHouseholdMemberLookupRow = {
  household_id: string
}

type LocalHydratedHouseholdLookupRow = {
  currency: string
  id: string
  locale: string
  name: string
}

async function findHydratedHouseholdForUser({
  driver,
  userId,
}: {
  driver: LocalSqliteDriver
  userId: string
}) {
  const members = await driver.query<LocalHydratedHouseholdMemberLookupRow>(
    [
      'select household_id',
      'from household_members',
      'where user_id = ? and deleted_at is null',
      'order by case role when "owner" then 0 when "member" then 1 else 2 end, created_at',
      'limit 1',
    ].join(' '),
    [userId],
  )
  const householdId = members[0]?.household_id

  if (!householdId) {
    return undefined
  }

  const households = await driver.query<LocalHydratedHouseholdLookupRow>(
    [
      'select id, name, currency, locale',
      'from households',
      'where id = ? and deleted_at is null',
      'limit 1',
    ].join(' '),
    [householdId],
  )
  const household = households[0]

  if (!household) {
    return undefined
  }

  return {
    currency: household.currency,
    id: household.id,
    locale: household.locale,
    name: household.name,
  } satisfies CloudHousehold
}

export async function createFinanceDataSourceForRuntime({
  createLocalSqliteDataSource,
  createOfflineLocalTransaction,
  flags = featureFlags,
  hydrateLocalSqlite,
  initializeLocalSqliteDriver,
  isOnline = getBrowserOnlineStatus,
  logger,
  supabaseDataSource,
  syncPendingLocalOperations,
  ...input
}: CreateFinanceDataSourceForRuntimeInput): Promise<FinanceDataSource> {
  if (flags.offlineMode) {
    throw new Error('Offline repository runtime is not implemented yet.')
  }

  const diagnostics = createDevLogger(logger ?? console)

  diagnostics.debug('[finance-runtime] localSqliteReadMode enabled:', {
    localSqliteReadMode: flags.localSqliteReadMode,
  })

  const cloudDataSource = supabaseDataSource ?? createSupabaseFinanceDataSource(input)

  if (!flags.localSqliteReadMode) {
    return cloudDataSource
  }

  if (!input.householdId) {
    diagnostics.warn(
      '[local-sqlite-read] Missing householdId; falling back to Supabase.',
    )
    return cloudDataSource
  }

  try {
    const localReadDependencies = await loadLocalSqliteReadModeDependencies({
      createLocalSqliteDataSource,
      createOfflineLocalTransaction,
      hydrateLocalSqlite,
      initializeLocalSqliteDriver,
      syncPendingLocalOperations,
    })

    diagnostics.debug('[local-sqlite-read] SQLite initialization started.')
    const localDriver = await localReadDependencies.initializeLocalSqliteDriver()
    diagnostics.debug('[local-sqlite-read] SQLite initialized.')
    diagnostics.debug('[local-sqlite-read] Hydration started.')

    const hydrationResult = await localReadDependencies.hydrateLocalSqlite({
      dataSource: cloudDataSource,
      householdId: input.householdId,
      localDriver,
      supabaseClient: input.client ?? undefined,
      userId: input.userId ?? undefined,
    })

    if (hydrationResult.errors.length > 0) {
      diagnostics.warn(
        '[local-sqlite-read] Hydration failed; falling back to Supabase.',
        hydrationResult.errors,
      )
      await localDriver.close?.()
      return cloudDataSource
    }

    diagnostics.debug('[local-sqlite-read] Hydration completed.', hydrationResult)

    return createHybridLocalReadDataSource({
      createOfflineLocalTransaction:
        localReadDependencies.createOfflineLocalTransaction,
      hydrateLocalSqlite: localReadDependencies.hydrateLocalSqlite,
      householdId: input.householdId,
      isOnline,
      localDataSource: localReadDependencies.createLocalSqliteDataSource({
        driver: localDriver,
        householdId: input.householdId,
      }),
      localDriver,
      logger: diagnostics,
      supabaseDataSource: cloudDataSource,
      syncPendingLocalOperations:
        localReadDependencies.syncPendingLocalOperations,
      userId: input.userId,
    })
  } catch (error) {
    diagnostics.warn(
      '[local-sqlite-read] SQLite read mode failed; falling back to Supabase.',
      error,
    )
    return cloudDataSource
  }
}

export async function createCachedLocalReadRuntime({
  client,
  createLocalSqliteDataSource,
  createOfflineLocalTransaction,
  flags = featureFlags,
  initializeLocalSqliteDriver,
  isOnline = getBrowserOnlineStatus,
  logger,
  syncPendingLocalOperations,
  userId,
}: CreateCachedLocalReadRuntimeInput): Promise<
  CachedLocalReadRuntimeResult | null
> {
  if (flags.offlineMode) {
    throw new Error('Offline repository runtime is not implemented yet.')
  }

  if (!flags.localSqliteReadMode || !userId) {
    return null
  }

  const diagnostics = createDevLogger(logger ?? console)

  try {
    diagnostics.debug(
      '[local-sqlite-read] Offline startup requested; initializing SQLite.',
    )
    const localReadDependencies = await loadCachedLocalReadModeDependencies({
      createLocalSqliteDataSource,
      createOfflineLocalTransaction,
      initializeLocalSqliteDriver,
      syncPendingLocalOperations,
    })
    const localDriver = await localReadDependencies.initializeLocalSqliteDriver()
    diagnostics.debug('[local-sqlite-read] SQLite initialized.')
    diagnostics.debug(
      '[local-sqlite-read] Hydration skipped because offline; reading cached local SQLite data.',
    )

    const household = await findHydratedHouseholdForUser({
      driver: localDriver,
      userId,
    })

    if (!household) {
      diagnostics.warn(
        '[local-sqlite-read] No hydrated local household found; cannot start from SQLite cache.',
      )
      await localDriver.close?.()
      return null
    }

    diagnostics.debug('[local-sqlite-read] Reading from local SQLite.', {
      householdId: household.id,
    })

    const supabaseDataSource =
      client && userId
        ? createSupabaseFinanceDataSource({
            client,
            householdId: household.id,
            userId,
          })
        : undefined

    return {
      dataSource: createOfflineCachedLocalReadDataSource({
        createOfflineLocalTransaction:
          localReadDependencies.createOfflineLocalTransaction,
        householdId: household.id,
        hydrateLocalSqlite: undefined,
        isOnline,
        localDataSource: localReadDependencies.createLocalSqliteDataSource({
          driver: localDriver,
          householdId: household.id,
        }),
        localDriver,
        supabaseDataSource,
        syncPendingLocalOperations:
          localReadDependencies.syncPendingLocalOperations,
        userId,
      }),
      household,
    }
  } catch (error) {
    diagnostics.warn(
      '[local-sqlite-read] Local SQLite read failed during offline startup.',
      error,
    )
    return null
  }
}
