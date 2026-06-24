import type { FinanceDataSource } from '@/data/contracts'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'
import {
  createLocalAccountRepository,
  createLocalBillRepository,
  createLocalBudgetRepository,
  createLocalCategoryRepository,
  createLocalGoalRepository,
  createLocalHouseholdRepository,
  createLocalLoanRepository,
  createLocalNotificationRepository,
  createLocalRecurringBillRepository,
  createLocalRecurringTransactionRepository,
  createLocalTransactionRepository,
  type LocalHouseholdRepository,
  type LocalNotificationRepository,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories'

export type LocalSqliteFinanceDataSource = FinanceDataSource & {
  household: LocalHouseholdRepository
  notifications: LocalNotificationRepository
}

export function createLocalSqliteFinanceDataSource({
  driver,
  householdId,
}: {
  driver: LocalSqliteDriver
  householdId: string
}): LocalSqliteFinanceDataSource {
  const context: LocalSqliteRepositoryContext = {
    driver,
    householdId,
  }

  return {
    accounts: createLocalAccountRepository(context),
    bills: createLocalBillRepository(context),
    budgets: createLocalBudgetRepository(context),
    categories: createLocalCategoryRepository(context),
    goals: createLocalGoalRepository(context),
    household: createLocalHouseholdRepository(driver),
    loans: createLocalLoanRepository(context),
    mode: 'offline',
    notifications: createLocalNotificationRepository(context),
    recurringBills: createLocalRecurringBillRepository(context),
    recurringTransactions: createLocalRecurringTransactionRepository(context),
    transactions: createLocalTransactionRepository(context),
  }
}
