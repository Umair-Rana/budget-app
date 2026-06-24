import type { FinanceDataSource } from '@/data/contracts'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'
import { createSupabaseFinanceDataSource } from '@/data/supabase/supabase-finance-data-source'
import type { SupabaseFinanceRepositoryContextInput } from '@/data/supabase/repositories/supabase-repository-context'
import { featureFlags } from '@/lib/feature-flags'

export type FinanceRepositoryRuntime = 'cloud'

type FinanceDataSourceFactoryLogger = Pick<Console, 'debug' | 'warn'>
type HydrateLocalSqlite = typeof import('@/data/local-sqlite/hydration')['hydrateSupabaseToLocalSqlite']
type InitializeLocalSqliteDriver = typeof import('@/data/local-sqlite/initialize-local-sqlite')['initializeLocalSqlite']
type CreateLocalSqliteFinanceDataSource = typeof import('@/data/local-sqlite/local-sqlite-finance-data-source')['createLocalSqliteFinanceDataSource']

export interface CreateFinanceDataSourceInput
  extends SupabaseFinanceRepositoryContextInput {
  runtime?: FinanceRepositoryRuntime
}

export interface CreateFinanceDataSourceForRuntimeInput
  extends CreateFinanceDataSourceInput {
  flags?: Pick<typeof featureFlags, 'localSqliteReadMode' | 'offlineMode'>
  createLocalSqliteDataSource?: CreateLocalSqliteFinanceDataSource
  hydrateLocalSqlite?: HydrateLocalSqlite
  initializeLocalSqliteDriver?: InitializeLocalSqliteDriver
  logger?: FinanceDataSourceFactoryLogger
  supabaseDataSource?: FinanceDataSource
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
  hydrateLocalSqlite,
  localDriver,
  localDataSource,
  logger,
  supabaseDataSource,
  householdId,
  userId,
}: {
  hydrateLocalSqlite: HydrateLocalSqlite
  householdId: string
  localDataSource: FinanceDataSource
  localDriver: LocalSqliteDriver
  logger: FinanceDataSourceFactoryLogger
  supabaseDataSource: FinanceDataSource
  userId?: string | null
}): FinanceDataSource {
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
    const result = await work()
    await rehydrateAfterSupabaseWrite(operation)
    return result
  }

  return {
    mode: 'offline',
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
      create: (input) =>
        runSupabaseWrite('transactions.create', () =>
          supabaseDataSource.transactions.create(input),
        ),
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

async function loadLocalSqliteReadModeDependencies({
  createLocalSqliteDataSource,
  hydrateLocalSqlite,
  initializeLocalSqliteDriver,
}: Pick<
  CreateFinanceDataSourceForRuntimeInput,
  | 'createLocalSqliteDataSource'
  | 'hydrateLocalSqlite'
  | 'initializeLocalSqliteDriver'
>) {
  const [resolvedHydrate, resolvedInitialize, resolvedCreateLocalDataSource] =
    await Promise.all([
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
    ])

  return {
    createLocalSqliteDataSource: resolvedCreateLocalDataSource,
    hydrateLocalSqlite: resolvedHydrate,
    initializeLocalSqliteDriver: resolvedInitialize,
  }
}

export async function createFinanceDataSourceForRuntime({
  createLocalSqliteDataSource,
  flags = featureFlags,
  hydrateLocalSqlite,
  initializeLocalSqliteDriver,
  logger,
  supabaseDataSource,
  ...input
}: CreateFinanceDataSourceForRuntimeInput): Promise<FinanceDataSource> {
  if (flags.offlineMode) {
    throw new Error('Offline repository runtime is not implemented yet.')
  }

  const cloudDataSource = supabaseDataSource ?? createSupabaseFinanceDataSource(input)

  if (!flags.localSqliteReadMode) {
    return cloudDataSource
  }

  const diagnostics = createDevLogger(logger ?? console)

  if (!input.householdId) {
    diagnostics.warn(
      '[local-sqlite-read] Missing householdId; falling back to Supabase.',
    )
    return cloudDataSource
  }

  try {
    const localReadDependencies = await loadLocalSqliteReadModeDependencies({
      createLocalSqliteDataSource,
      hydrateLocalSqlite,
      initializeLocalSqliteDriver,
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
      hydrateLocalSqlite: localReadDependencies.hydrateLocalSqlite,
      householdId: input.householdId,
      localDataSource: localReadDependencies.createLocalSqliteDataSource({
        driver: localDriver,
        householdId: input.householdId,
      }),
      localDriver,
      logger: diagnostics,
      supabaseDataSource: cloudDataSource,
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
