import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import {
  createSupabaseFinanceDataSource,
  indexedDbFinanceDataSource,
  supabaseFinanceDataSource,
} from '@/data/data-source/finance-data-source'
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
import { inactiveSupabaseFinanceRepositoryMessage } from '@/data/supabase/repositories/inactive-supabase-repository'
import {
  createSupabaseLoansRepository,
  supabaseLoansRepository,
} from '@/data/supabase/repositories/supabase-loans-repository'
import {
  createSupabaseRecurringTransactionsRepository,
  supabaseRecurringTransactionsRepository,
} from '@/data/supabase/repositories/supabase-recurring-transactions-repository'
import { missingSupabaseFinanceContextMessage } from '@/data/supabase/repositories/supabase-repository-context'
import {
  createSupabaseTransactionsRepository,
  supabaseTransactionsRepository,
} from '@/data/supabase/repositories/supabase-transactions-repository'
import type { Database } from '@/lib/supabase/database.types'

const fakeClient = {} as SupabaseClient<Database>
type BillRow = Database['public']['Tables']['bills']['Row']
type BudgetRow = Database['public']['Tables']['budgets']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type GoalRow = Database['public']['Tables']['goals']['Row']
type LoanRow = Database['public']['Tables']['loans']['Row']
type RecurringTransactionRow =
  Database['public']['Tables']['recurring_transactions']['Row']
type TransactionRow = Database['public']['Tables']['transactions']['Row']

const billRow: BillRow = {
  id: 'bill-1',
  household_id: 'household-1',
  name: 'Internet',
  amount: 4_500,
  category_id: 'category-1',
  payment_account_id: 'account-1',
  due_date: '2026-01-15',
  frequency: 'monthly',
  status: 'paid',
  paid_at: '2026-01-10T00:00:00.000Z',
  next_due_date: null,
  last_generated_date: null,
  linked_transaction_id: 'transaction-1',
  notes: 'Fiber internet',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2026-01-01T08:00:00.000Z',
  updated_at: '2026-01-10T08:00:00.000Z',
  archived_at: null,
  deleted_at: null,
}

const budgetRow: BudgetRow = {
  id: 'budget-1',
  household_id: 'household-1',
  month: '2026-01',
  category_id: 'category-expense',
  planned_amount: 30_000,
  group_name: 'needs',
  notes: 'Monthly food plan',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2026-01-01T08:00:00.000Z',
  updated_at: '2026-01-10T08:00:00.000Z',
  archived_at: null,
  deleted_at: null,
}

const expenseCategoryRow: CategoryRow = {
  id: 'category-expense',
  household_id: 'household-1',
  name: 'Groceries',
  type: 'expense',
  icon: 'ShoppingBasket',
  color: '#f59e0b',
  is_default: true,
  default_key: 'expense-groceries',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2026-01-01T08:00:00.000Z',
  updated_at: '2026-01-10T08:00:00.000Z',
  archived_at: null,
  deleted_at: null,
}

const incomeCategoryRow: CategoryRow = {
  ...expenseCategoryRow,
  id: 'category-income',
  name: 'Salary',
  type: 'income',
  default_key: 'income-salary',
}

const transactionRow: TransactionRow = {
  id: 'transaction-1',
  household_id: 'household-1',
  type: 'income',
  amount: 1_000,
  date: '2026-01-10',
  time: '12:30:00',
  transaction_datetime: '2026-01-10T07:30:00.000Z',
  category_id: 'category-1',
  from_account_id: null,
  to_account_id: 'account-1',
  payment_method: null,
  notes: 'Salary',
  tags: [],
  receipt_name: null,
  receipt_path: null,
  receipt_thumbnail: null,
  linked_bill_id: null,
  linked_goal_id: null,
  linked_loan_id: null,
  linked_source_type: null,
  linked_source_id: null,
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2026-01-10T07:30:00.000Z',
  updated_at: '2026-01-10T07:30:00.000Z',
  archived_at: null,
  deleted_at: null,
}

const goalRow: GoalRow = {
  id: 'goal-1',
  household_id: 'household-1',
  name: 'Emergency Fund',
  target_amount: 100_000,
  current_amount: 25_000,
  target_date: '2026-12-31',
  priority: 'high',
  status: 'active',
  icon: 'shield',
  color: '#0ea5e9',
  notes: 'Safety net',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2026-01-01T08:00:00.000Z',
  updated_at: '2026-01-10T08:00:00.000Z',
  archived_at: null,
  deleted_at: null,
}

const goalTransactionRow: TransactionRow = {
  ...transactionRow,
  id: 'transaction-goal-1',
  type: 'transfer',
  amount: 5_000,
  category_id: null,
  from_account_id: 'account-1',
  to_account_id: null,
  notes: 'Goal contribution to Emergency Fund',
  linked_goal_id: 'goal-1',
  linked_source_type: 'goal',
  linked_source_id: 'goal-1',
}

const loanRow: LoanRow = {
  id: 'loan-1',
  household_id: 'household-1',
  name: 'Family Loan',
  type: 'given',
  counterparty: 'Ali',
  principal_amount: 50_000,
  outstanding_amount: 25_000,
  interest_rate: null,
  due_date: '2026-06-30',
  status: 'partially_paid',
  source_account_id: 'account-source',
  receiving_account_id: null,
  linked_transaction_id: 'transaction-loan-opening',
  notes: 'Short term help',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2026-01-01T08:00:00.000Z',
  updated_at: '2026-01-10T08:00:00.000Z',
  archived_at: null,
  deleted_at: null,
}

const loanTransactionRow: TransactionRow = {
  ...transactionRow,
  id: 'transaction-loan-1',
  type: 'transfer',
  amount: 5_000,
  category_id: null,
  from_account_id: null,
  to_account_id: 'account-receiving',
  notes: 'Loan repayment received - Family Loan',
  linked_loan_id: 'loan-1',
  linked_source_type: 'loan',
  linked_source_id: 'loan-1',
}

const recurringTransactionRow: RecurringTransactionRow = {
  id: 'recurring-1',
  household_id: 'household-1',
  type: 'income',
  name: 'Salary',
  amount: 100_000,
  category_id: 'category-income',
  from_account_id: null,
  to_account_id: 'account-1',
  frequency: 'monthly',
  interval: 1,
  start_date: '2026-01-01',
  next_run_date: '2026-01-10',
  end_date: null,
  is_active: true,
  notes: 'Monthly salary',
  last_generated_at: null,
  last_generated_for_date: null,
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2026-01-01T08:00:00.000Z',
  updated_at: '2026-01-01T08:00:00.000Z',
  archived_at: null,
  deleted_at: null,
}

function createMockQuery(row: TransactionRow | null = transactionRow) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  }

  return query
}

function createMockSupabaseClient(row: TransactionRow | null = transactionRow) {
  const query = createMockQuery(row)
  const rpc = vi.fn().mockResolvedValue({ data: transactionRow, error: null })
  const from = vi.fn(() => query)

  return {
    client: { from, rpc } as unknown as SupabaseClient<Database>,
    from,
    query,
    rpc,
  }
}

function createMockBillQuery(row: BillRow | null = billRow) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  }

  return query
}

function createMockSupabaseBillClient(row: BillRow | null = billRow) {
  const query = createMockBillQuery(row)
  const rpc = vi.fn().mockResolvedValue({ data: billRow, error: null })
  const from = vi.fn(() => query)

  return {
    client: { from, rpc } as unknown as SupabaseClient<Database>,
    from,
    query,
    rpc,
  }
}

function createMockBudgetQuery(options?: {
  row?: BudgetRow | null
  rows?: BudgetRow[]
  duplicateRows?: Array<Pick<BudgetRow, 'id'>>
}) {
  const query = {
    data: options?.rows ?? [budgetRow],
    error: null,
    select: vi.fn((columns?: string) => {
      query.data =
        columns === 'id'
          ? ((options?.duplicateRows ?? []) as BudgetRow[])
          : (options?.rows ?? [budgetRow])
      return query
    }),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: options?.row ?? budgetRow, error: null }),
    single: vi
      .fn()
      .mockResolvedValue({ data: options?.row ?? budgetRow, error: null }),
  }

  return query
}

function createMockCategoryQuery(row: CategoryRow | null = expenseCategoryRow) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  }

  return query
}

function createMockSupabaseBudgetClient(options?: {
  budgetRow?: BudgetRow | null
  budgetRows?: BudgetRow[]
  categoryRow?: CategoryRow | null
  duplicateRows?: Array<Pick<BudgetRow, 'id'>>
}) {
  const budgetQuery = createMockBudgetQuery({
    row: options?.budgetRow ?? budgetRow,
    rows: options?.budgetRows ?? [budgetRow],
    duplicateRows: options?.duplicateRows,
  })
  const categoryQuery = createMockCategoryQuery(
    options?.categoryRow ?? expenseCategoryRow,
  )
  const from = vi.fn((table: string) =>
    table === 'categories' ? categoryQuery : budgetQuery,
  )

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    from,
    budgetQuery,
    categoryQuery,
  }
}

function createMockRecurringTransactionQuery(options?: {
  row?: RecurringTransactionRow | null
  rows?: RecurringTransactionRow[]
}) {
  const query = {
    data: options?.rows ?? [recurringTransactionRow],
    error: null,
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    lte: vi.fn(() => query),
    order: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({
        data: options?.row ?? recurringTransactionRow,
        error: null,
      }),
    single: vi
      .fn()
      .mockResolvedValue({
        data: options?.row ?? recurringTransactionRow,
        error: null,
      }),
  }

  return query
}

function createMockSupabaseRecurringClient(options?: {
  categoryRow?: CategoryRow | null
  recurringRow?: RecurringTransactionRow | null
  recurringRows?: RecurringTransactionRow[]
}) {
  const recurringQuery = createMockRecurringTransactionQuery({
    row: options?.recurringRow ?? recurringTransactionRow,
    rows: options?.recurringRows ?? [recurringTransactionRow],
  })
  const categoryQuery = createMockCategoryQuery(
    options?.categoryRow ?? incomeCategoryRow,
  )
  const from = vi.fn((table: string) =>
    table === 'categories' ? categoryQuery : recurringQuery,
  )
  const rpc = vi.fn().mockResolvedValue({
    data: transactionRow,
    error: null,
  })

  return {
    client: { from, rpc } as unknown as SupabaseClient<Database>,
    categoryQuery,
    from,
    recurringQuery,
    rpc,
  }
}

function createMockGoalQuery(row: GoalRow | null = goalRow) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  }

  return query
}

function createMockSupabaseGoalClient(row: GoalRow | null = goalRow) {
  const query = createMockGoalQuery(row)
  const rpc = vi.fn().mockImplementation((functionName: string) => {
    if (functionName === 'goal_contribute' || functionName === 'goal_withdraw') {
      return Promise.resolve({
        data: {
          goal: goalRow,
          transaction: goalTransactionRow,
        },
        error: null,
      })
    }

    return Promise.resolve({ data: goalRow, error: null })
  })
  const from = vi.fn(() => query)

  return {
    client: { from, rpc } as unknown as SupabaseClient<Database>,
    from,
    query,
    rpc,
  }
}

function createMockLoanQuery(row: LoanRow | null = loanRow) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  }

  return query
}

function createMockSupabaseLoanClient(row: LoanRow | null = loanRow) {
  const query = createMockLoanQuery(row)
  const rpc = vi.fn().mockImplementation((functionName: string) => {
    if (functionName === 'record_finance_loan_payment') {
      return Promise.resolve({
        data: {
          loan: loanRow,
          transaction: loanTransactionRow,
        },
        error: null,
      })
    }

    return Promise.resolve({ data: loanRow, error: null })
  })
  const from = vi.fn(() => query)

  return {
    client: { from, rpc } as unknown as SupabaseClient<Database>,
    from,
    query,
    rpc,
  }
}

describe('Supabase finance repositories', () => {
  it('requires explicit Supabase context for account repositories', () => {
    expect(() =>
      createSupabaseAccountsRepository({
        client: fakeClient,
        householdId: null,
        userId: 'user-1',
      }),
    ).toThrow(missingSupabaseFinanceContextMessage)
  })

  it('requires explicit Supabase context for category repositories', () => {
    expect(() =>
      createSupabaseCategoriesRepository({
        client: null,
        householdId: 'household-1',
        userId: 'user-1',
      }),
    ).toThrow(missingSupabaseFinanceContextMessage)
  })

  it('requires explicit Supabase context for bill repositories', () => {
    expect(() =>
      createSupabaseBillsRepository({
        client: fakeClient,
        householdId: undefined,
        userId: 'user-1',
      }),
    ).toThrow(missingSupabaseFinanceContextMessage)
  })

  it('requires explicit Supabase context for budget repositories', () => {
    expect(() =>
      createSupabaseBudgetsRepository({
        client: fakeClient,
        householdId: 'household-1',
        userId: null,
      }),
    ).toThrow(missingSupabaseFinanceContextMessage)
  })

  it('requires explicit Supabase context for goal repositories', () => {
    expect(() =>
      createSupabaseGoalsRepository({
        client: fakeClient,
        householdId: 'household-1',
        userId: null,
      }),
    ).toThrow(missingSupabaseFinanceContextMessage)
  })

  it('requires explicit Supabase context for loan repositories', () => {
    expect(() =>
      createSupabaseLoansRepository({
        client: fakeClient,
        householdId: 'household-1',
        userId: null,
      }),
    ).toThrow(missingSupabaseFinanceContextMessage)
  })

  it('requires explicit Supabase context for transaction repositories', () => {
    expect(() =>
      createSupabaseTransactionsRepository({
        client: fakeClient,
        householdId: 'household-1',
        userId: undefined,
      }),
    ).toThrow(missingSupabaseFinanceContextMessage)
  })

  it('requires explicit Supabase context for recurring transaction repositories', () => {
    expect(() =>
      createSupabaseRecurringTransactionsRepository({
        client: fakeClient,
        householdId: 'household-1',
        userId: null,
      }),
    ).toThrow(missingSupabaseFinanceContextMessage)
  })

  it('can create an opt-in Supabase data source without switching the active source', () => {
    const dataSource = createSupabaseFinanceDataSource({
      client: fakeClient,
      householdId: 'household-1',
      userId: 'user-1',
    })

    expect(dataSource.mode).toBe('supabase')
    expect(dataSource.accounts.getAll).toEqual(expect.any(Function))
    expect(dataSource.categories.seedDefaultsIfNeeded).toEqual(
      expect.any(Function),
    )
    expect(dataSource.transactions.create).toEqual(expect.any(Function))
    expect(dataSource.transactions).not.toBe(supabaseTransactionsRepository)
    expect(dataSource.bills.markPaid).toEqual(expect.any(Function))
    expect(dataSource.bills).not.toBe(supabaseBillsRepository)
    expect(dataSource.budgets.getByMonth).toEqual(expect.any(Function))
    expect(dataSource.budgets).not.toBe(supabaseBudgetsRepository)
    expect(dataSource.recurringTransactions.generateDue).toEqual(
      expect.any(Function),
    )
    expect(dataSource.recurringTransactions).not.toBe(
      supabaseRecurringTransactionsRepository,
    )
    expect(dataSource.goals.addContribution).toEqual(expect.any(Function))
    expect(dataSource.goals).not.toBe(supabaseGoalsRepository)
    expect(dataSource.loans.recordPayment).toEqual(expect.any(Function))
    expect(dataSource.loans).not.toBe(supabaseLoansRepository)
    expect(dataSource).not.toBe(indexedDbFinanceDataSource)
  })

  it('keeps the default Supabase data source inactive until explicitly configured', async () => {
    expect(supabaseFinanceDataSource.accounts).toBe(supabaseAccountsRepository)
    expect(supabaseFinanceDataSource.categories).toBe(
      supabaseCategoriesRepository,
    )
    expect(supabaseFinanceDataSource.transactions).toBe(
      supabaseTransactionsRepository,
    )
    expect(supabaseFinanceDataSource.bills).toBe(supabaseBillsRepository)
    expect(supabaseFinanceDataSource.budgets).toBe(supabaseBudgetsRepository)
    expect(supabaseFinanceDataSource.recurringTransactions).toBe(
      supabaseRecurringTransactionsRepository,
    )
    expect(supabaseFinanceDataSource.goals).toBe(supabaseGoalsRepository)
    expect(supabaseFinanceDataSource.loans).toBe(supabaseLoansRepository)

    await expect(supabaseFinanceDataSource.accounts.getAll()).rejects.toThrow(
      inactiveSupabaseFinanceRepositoryMessage,
    )
  })

  it('uses the create transaction RPC for Supabase transaction creation', async () => {
    const { client, rpc } = createMockSupabaseClient()
    const repository = createSupabaseTransactionsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await repository.create({
      type: 'income',
      amount: 1_000,
      date: '2026-01-10',
      time: '12:30:00',
      categoryId: 'category-1',
      toAccountId: 'account-1',
      notes: 'Salary',
    })

    expect(rpc).toHaveBeenCalledWith(
      'create_finance_transaction',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_type: 'income',
        p_amount: 1_000,
        p_category_id: 'category-1',
        p_to_account_id: 'account-1',
      }),
    )
  })

  it('uses the update transaction RPC after loading the existing row', async () => {
    const { client, rpc } = createMockSupabaseClient()
    const repository = createSupabaseTransactionsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await repository.update('transaction-1', {
      amount: 1_500,
      notes: 'Updated salary',
    })

    expect(rpc).toHaveBeenCalledWith(
      'update_finance_transaction',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_transaction_id: 'transaction-1',
        p_type: 'income',
        p_amount: 1_500,
        p_allow_linked: false,
      }),
    )
  })

  it('uses archive and soft-delete transaction RPCs', async () => {
    const { client, rpc } = createMockSupabaseClient()
    const repository = createSupabaseTransactionsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await repository.archive('transaction-1')
    await repository.deleteSoft('transaction-1')

    expect(rpc).toHaveBeenCalledWith(
      'archive_finance_transaction',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_transaction_id: 'transaction-1',
        p_allow_linked: false,
      }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'delete_finance_transaction_soft',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_transaction_id: 'transaction-1',
        p_allow_linked: false,
      }),
    )
  })

  it('keeps linked transaction updates guarded before calling RPC', async () => {
    const { client, rpc } = createMockSupabaseClient({
      ...transactionRow,
      linked_bill_id: 'bill-1',
    })
    const repository = createSupabaseTransactionsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await expect(
      repository.update('transaction-1', { amount: 1_500 }),
    ).rejects.toThrow(
      'Linked transactions cannot be changed from the Transactions page.',
    )
    expect(rpc).not.toHaveBeenCalled()
  })

  it('queries due Supabase recurring transactions by household and date', async () => {
    const { client, from, recurringQuery } = createMockSupabaseRecurringClient()
    const repository = createSupabaseRecurringTransactionsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    const recurringTransactions = await repository.getDue('2026-01-10')

    expect(recurringTransactions).toHaveLength(1)
    expect(recurringTransactions[0]).toMatchObject({
      id: 'recurring-1',
      name: 'Salary',
      nextRunDate: '2026-01-10',
    })
    expect(from).toHaveBeenCalledWith('recurring_transactions')
    expect(recurringQuery.eq).toHaveBeenCalledWith(
      'household_id',
      'household-1',
    )
    expect(recurringQuery.lte).toHaveBeenCalledWith(
      'next_run_date',
      '2026-01-10',
    )
  })

  it('creates Supabase recurring transactions after category validation', async () => {
    const { client, categoryQuery, recurringQuery } =
      createMockSupabaseRecurringClient()
    const repository = createSupabaseRecurringTransactionsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await repository.create({
      type: 'income',
      name: 'Salary',
      amount: 100_000,
      categoryId: 'category-income',
      toAccountId: 'account-1',
      frequency: 'monthly',
      interval: 1,
      startDate: '2026-01-01',
      nextRunDate: '2026-01-10',
    })

    expect(categoryQuery.eq).toHaveBeenCalledWith('id', 'category-income')
    expect(recurringQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: 'household-1',
        type: 'income',
        name: 'Salary',
        amount: 100_000,
        category_id: 'category-income',
        to_account_id: 'account-1',
        frequency: 'monthly',
        interval: 1,
      }),
    )
  })

  it('generates due recurring transactions through the transaction RPC path', async () => {
    const { client, recurringQuery, rpc } = createMockSupabaseRecurringClient()
    const repository = createSupabaseRecurringTransactionsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    const result = await repository.generateDue('2026-01-10')

    expect(result.generatedCount).toBe(1)
    expect(result.failedCount).toBe(0)
    expect(rpc).toHaveBeenCalledWith(
      'create_finance_transaction',
      expect.objectContaining({
        p_type: 'income',
        p_amount: 100_000,
        p_category_id: 'category-income',
        p_to_account_id: 'account-1',
        p_date: '2026-01-10',
      }),
    )
    expect(recurringQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        next_run_date: '2026-02-10',
        last_generated_for_date: '2026-01-10',
      }),
    )
  })

  it('skips duplicate recurring generation for the same scheduled date', async () => {
    const { client, recurringQuery, rpc } = createMockSupabaseRecurringClient({
      recurringRows: [
        {
          ...recurringTransactionRow,
          last_generated_for_date: '2026-01-10',
        },
      ],
    })
    const repository = createSupabaseRecurringTransactionsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    const result = await repository.generateDue('2026-01-10')

    expect(result.generatedCount).toBe(0)
    expect(result.skippedCount).toBe(1)
    expect(rpc).not.toHaveBeenCalled()
    expect(recurringQuery.update).not.toHaveBeenCalled()
  })

  it('queries Supabase budgets by scoped month', async () => {
    const { client, from, budgetQuery } = createMockSupabaseBudgetClient()
    const repository = createSupabaseBudgetsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    const budgets = await repository.getByMonth('2026-01')

    expect(budgets).toHaveLength(1)
    expect(budgets[0]).toMatchObject({
      month: '2026-01',
      categoryId: 'category-expense',
      plannedAmount: 30_000,
    })
    expect(from).toHaveBeenCalledWith('budgets')
    expect(budgetQuery.eq).toHaveBeenCalledWith('household_id', 'household-1')
    expect(budgetQuery.eq).toHaveBeenCalledWith('month', '2026-01')
  })

  it('blocks duplicate active Supabase budget allocations before create', async () => {
    const { client, budgetQuery } = createMockSupabaseBudgetClient({
      duplicateRows: [{ id: 'budget-other' }],
    })
    const repository = createSupabaseBudgetsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await expect(
      repository.create({
        month: '2026-01',
        categoryId: 'category-expense',
        plannedAmount: 30_000,
        group: 'needs',
      }),
    ).rejects.toThrow(
      'Budget allocation with this month and category already exists.',
    )
    expect(budgetQuery.insert).not.toHaveBeenCalled()
  })

  it('ignores itself during Supabase budget duplicate checks on update', async () => {
    const { client, budgetQuery, categoryQuery } = createMockSupabaseBudgetClient({
      duplicateRows: [{ id: 'budget-1' }],
    })
    const repository = createSupabaseBudgetsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    const budget = await repository.update('budget-1', {
      plannedAmount: 35_000,
      notes: 'Adjusted grocery plan',
    })

    expect(budget.plannedAmount).toBe(30_000)
    expect(categoryQuery.eq).toHaveBeenCalledWith('id', 'category-expense')
    expect(budgetQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        planned_amount: 35_000,
        notes: 'Adjusted grocery plan',
      }),
    )
    expect(budgetQuery.eq).toHaveBeenCalledWith('household_id', 'household-1')
    expect(budgetQuery.eq).toHaveBeenCalledWith('id', 'budget-1')
  })

  it('uses scoped updates for Supabase budget archive and soft delete', async () => {
    const { client, budgetQuery } = createMockSupabaseBudgetClient()
    const repository = createSupabaseBudgetsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await repository.archive('budget-1')
    await repository.deleteSoft('budget-1')

    expect(budgetQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ archived_at: expect.any(String) }),
    )
    expect(budgetQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    )
    expect(budgetQuery.eq).toHaveBeenCalledWith('household_id', 'household-1')
    expect(budgetQuery.eq).toHaveBeenCalledWith('id', 'budget-1')
  })

  it('uses bill RPCs for Supabase bill mutations', async () => {
    const { client, rpc } = createMockSupabaseBillClient()
    const repository = createSupabaseBillsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await repository.create({
      name: 'Internet',
      amount: 4_500,
      categoryId: 'category-1',
      dueDate: '2026-01-15',
      frequency: 'monthly',
      notes: 'Fiber internet',
    })
    await repository.update('bill-1', { amount: 4_750 })
    await repository.archive('bill-1')
    await repository.deleteSoft('bill-1')
    await repository.markPaid('bill-1', {
      paymentAccountId: 'account-1',
      paymentDate: '2026-01-10',
    })
    await repository.markUnpaid('bill-1')

    expect(rpc).toHaveBeenCalledWith(
      'create_finance_bill',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_name: 'Internet',
        p_amount: 4_500,
        p_category_id: 'category-1',
      }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'update_finance_bill',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_bill_id: 'bill-1',
        p_amount: 4_750,
      }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'archive_finance_bill',
      expect.objectContaining({ p_bill_id: 'bill-1' }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'delete_finance_bill_soft',
      expect.objectContaining({ p_bill_id: 'bill-1' }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'mark_finance_bill_paid',
      expect.objectContaining({
        p_bill_id: 'bill-1',
        p_payment_account_id: 'account-1',
        p_payment_date: '2026-01-10',
      }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'mark_finance_bill_unpaid',
      expect.objectContaining({ p_bill_id: 'bill-1' }),
    )
  })

  it('uses goal RPCs for Supabase goal mutations and movements', async () => {
    const { client, rpc } = createMockSupabaseGoalClient()
    const repository = createSupabaseGoalsRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await repository.create({
      name: 'Emergency Fund',
      targetAmount: 100_000,
      currentAmount: 25_000,
      targetDate: '2026-12-31',
      priority: 'high',
      icon: 'shield',
      color: '#0ea5e9',
      notes: 'Safety net',
    })
    await repository.update('goal-1', { currentAmount: 30_000 })
    await repository.archive('goal-1')
    await repository.deleteSoft('goal-1')
    const contribution = await repository.addContribution('goal-1', {
      amount: 5_000,
      sourceAccountId: 'account-1',
      date: '2026-01-10',
      notes: 'Monthly save',
    })
    const withdrawal = await repository.withdraw('goal-1', {
      amount: 2_000,
      destinationAccountId: 'account-2',
      date: '2026-01-11',
      notes: 'Emergency use',
    })

    expect(contribution.goal.currentAmount).toBe(25_000)
    expect(contribution.transaction.linkedGoalId).toBe('goal-1')
    expect(withdrawal.transaction.linkedGoalId).toBe('goal-1')
    expect(rpc).toHaveBeenCalledWith(
      'create_finance_goal',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_name: 'Emergency Fund',
        p_target_amount: 100_000,
        p_current_amount: 25_000,
      }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'update_finance_goal',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_goal_id: 'goal-1',
        p_current_amount: 30_000,
      }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'archive_finance_goal',
      expect.objectContaining({ p_goal_id: 'goal-1' }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'delete_finance_goal_soft',
      expect.objectContaining({ p_goal_id: 'goal-1' }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'goal_contribute',
      expect.objectContaining({
        p_goal_id: 'goal-1',
        p_amount: 5_000,
        p_source_account_id: 'account-1',
      }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'goal_withdraw',
      expect.objectContaining({
        p_goal_id: 'goal-1',
        p_amount: 2_000,
        p_destination_account_id: 'account-2',
      }),
    )
  })

  it('uses loan RPCs for Supabase loan mutations and repayments', async () => {
    const { client, rpc } = createMockSupabaseLoanClient()
    const repository = createSupabaseLoansRepository({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })

    await repository.create({
      name: 'Family Loan',
      type: 'given',
      counterparty: 'Ali',
      principalAmount: 50_000,
      interestRate: 0,
      dueDate: '2026-06-30',
      sourceAccountId: 'account-source',
      notes: 'Short term help',
    })
    await repository.update('loan-1', { counterparty: 'Ahmed' })
    await repository.archive('loan-1')
    await repository.deleteSoft('loan-1')
    const payment = await repository.recordPayment('loan-1', {
      amount: 5_000,
      accountId: 'account-receiving',
      date: '2026-01-15',
      notes: 'First repayment',
    })

    expect(payment.loan.outstandingAmount).toBe(25_000)
    expect(payment.transaction.linkedLoanId).toBe('loan-1')
    expect(payment.transaction.toAccountId).toBe('account-receiving')
    expect(rpc).toHaveBeenCalledWith(
      'create_finance_loan',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_name: 'Family Loan',
        p_type: 'given',
        p_principal_amount: 50_000,
        p_source_account_id: 'account-source',
      }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'update_finance_loan',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_loan_id: 'loan-1',
        p_counterparty: 'Ahmed',
      }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'archive_finance_loan',
      expect.objectContaining({ p_loan_id: 'loan-1' }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'delete_finance_loan_soft',
      expect.objectContaining({ p_loan_id: 'loan-1' }),
    )
    expect(rpc).toHaveBeenCalledWith(
      'record_finance_loan_payment',
      expect.objectContaining({
        p_loan_id: 'loan-1',
        p_amount: 5_000,
        p_account_id: 'account-receiving',
        p_date: '2026-01-15',
      }),
    )
  })
})
