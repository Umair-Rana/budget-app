import type { FinanceDataSource } from '@/data/contracts'
import {
  createSupabaseAccountsRepository,
  supabaseAccountsRepository,
} from '@/data/supabase/repositories/supabase-accounts-repository'
import {
  createSupabaseBillsRepository,
  supabaseBillsRepository,
} from '@/data/supabase/repositories/supabase-bills-repository'
import {
  createSupabaseBudgetsRepository,
  supabaseBudgetsRepository,
} from '@/data/supabase/repositories/supabase-budgets-repository'
import {
  createSupabaseCategoriesRepository,
  supabaseCategoriesRepository,
} from '@/data/supabase/repositories/supabase-categories-repository'
import {
  createSupabaseGoalsRepository,
  supabaseGoalsRepository,
} from '@/data/supabase/repositories/supabase-goals-repository'
import {
  createSupabaseLoansRepository,
  supabaseLoansRepository,
} from '@/data/supabase/repositories/supabase-loans-repository'
import {
  createSupabaseRecurringTransactionsRepository,
  supabaseRecurringTransactionsRepository,
} from '@/data/supabase/repositories/supabase-recurring-transactions-repository'
import type { SupabaseFinanceRepositoryContextInput } from '@/data/supabase/repositories/supabase-repository-context'
import {
  createSupabaseTransactionsRepository,
  supabaseTransactionsRepository,
} from '@/data/supabase/repositories/supabase-transactions-repository'

export const supabaseFinanceDataSource = {
  mode: 'supabase',
  accounts: supabaseAccountsRepository,
  categories: supabaseCategoriesRepository,
  transactions: supabaseTransactionsRepository,
  bills: supabaseBillsRepository,
  goals: supabaseGoalsRepository,
  loans: supabaseLoansRepository,
  budgets: supabaseBudgetsRepository,
  recurringTransactions: supabaseRecurringTransactionsRepository,
} satisfies FinanceDataSource

export function createSupabaseFinanceDataSource(
  input: SupabaseFinanceRepositoryContextInput,
): FinanceDataSource {
  return {
    mode: 'supabase',
    accounts: createSupabaseAccountsRepository(input),
    categories: createSupabaseCategoriesRepository(input),
    transactions: createSupabaseTransactionsRepository(input),
    bills: createSupabaseBillsRepository(input),
    goals: createSupabaseGoalsRepository(input),
    loans: createSupabaseLoansRepository(input),
    budgets: createSupabaseBudgetsRepository(input),
    recurringTransactions: createSupabaseRecurringTransactionsRepository(input),
  }
}
