import type { FinanceDataSource } from '@/data/contracts'
import type { RecurringBillsRepositoryContract } from '@/data/contracts/recurring-bills-contract'
import type { RecurringTransactionsRepositoryContract } from '@/data/contracts/recurring-transactions-contract'
import { accountsRepository } from '@/data/repositories/accounts/accounts-repository'
import { billsRepository } from '@/data/repositories/bills/bills-repository'
import { budgetsRepository } from '@/data/repositories/budgets/budgets-repository'
import { categoriesRepository } from '@/data/repositories/categories/categories-repository'
import { goalsRepository } from '@/data/repositories/goals/goals-repository'
import { loansRepository } from '@/data/repositories/loans/loans-repository'
import { transactionsRepository } from '@/data/repositories/transactions/transactions-repository'
import {
  createSupabaseFinanceDataSource,
  supabaseFinanceDataSource,
} from '@/data/supabase/supabase-finance-data-source'

function rejectLegacyRecurringTransactions() {
  return Promise.reject(
    new Error('Recurring transactions are available only in cloud runtime.'),
  )
}

function rejectLegacyRecurringBills() {
  return Promise.reject(
    new Error('Recurring bills are available only in cloud runtime.'),
  )
}

const indexedDbRecurringBillsRepository = {
  getAll: rejectLegacyRecurringBills,
  getById: rejectLegacyRecurringBills,
  getDue: rejectLegacyRecurringBills,
  create: rejectLegacyRecurringBills,
  update: rejectLegacyRecurringBills,
  archive: rejectLegacyRecurringBills,
  deleteSoft: rejectLegacyRecurringBills,
  generateDue: rejectLegacyRecurringBills,
} satisfies RecurringBillsRepositoryContract

const indexedDbRecurringTransactionsRepository = {
  getAll: rejectLegacyRecurringTransactions,
  getById: rejectLegacyRecurringTransactions,
  getDue: rejectLegacyRecurringTransactions,
  create: rejectLegacyRecurringTransactions,
  update: rejectLegacyRecurringTransactions,
  archive: rejectLegacyRecurringTransactions,
  deleteSoft: rejectLegacyRecurringTransactions,
  generateDue: rejectLegacyRecurringTransactions,
} satisfies RecurringTransactionsRepositoryContract

/**
 * Legacy unused runtime implementation.
 *
 * IndexedDB repositories are retained for regression tests, old backup code,
 * and a later cleanup milestone. Cloud-only runtime code must use
 * `createSupabaseFinanceDataSource(...)` after authentication and household
 * bootstrap instead of this registry.
 */
export const indexedDbFinanceDataSource = {
  mode: 'indexeddb',
  accounts: accountsRepository,
  categories: categoriesRepository,
  transactions: transactionsRepository,
  bills: billsRepository,
  goals: goalsRepository,
  loans: loansRepository,
  budgets: budgetsRepository,
  recurringBills: indexedDbRecurringBillsRepository,
  recurringTransactions: indexedDbRecurringTransactionsRepository,
} satisfies FinanceDataSource

export { createSupabaseFinanceDataSource, supabaseFinanceDataSource }
