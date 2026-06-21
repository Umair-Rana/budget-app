import type { AccountsRepositoryContract } from '@/data/contracts/accounts-contract'
import type { BillsRepositoryContract } from '@/data/contracts/bills-contract'
import type { BudgetsRepositoryContract } from '@/data/contracts/budgets-contract'
import type { CategoriesRepositoryContract } from '@/data/contracts/categories-contract'
import type { GoalsRepositoryContract } from '@/data/contracts/goals-contract'
import type { LoansRepositoryContract } from '@/data/contracts/loans-contract'
import type { RecurringTransactionsRepositoryContract } from '@/data/contracts/recurring-transactions-contract'
import type { TransactionsRepositoryContract } from '@/data/contracts/transactions-contract'

export type FinanceDataSourceMode = 'indexeddb' | 'supabase'

export interface FinanceDataSource {
  mode: FinanceDataSourceMode
  accounts: AccountsRepositoryContract
  categories: CategoriesRepositoryContract
  transactions: TransactionsRepositoryContract
  bills: BillsRepositoryContract
  goals: GoalsRepositoryContract
  loans: LoansRepositoryContract
  budgets: BudgetsRepositoryContract
  recurringTransactions: RecurringTransactionsRepositoryContract
}
