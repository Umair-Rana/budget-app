import { describe, expect, it } from 'vitest'

import { fromSupabaseAccountRow } from '@/data/supabase/mappers/account-mapper'
import { fromSupabaseBillRow } from '@/data/supabase/mappers/bill-mapper'
import { fromSupabaseBudgetRow } from '@/data/supabase/mappers/budget-mapper'
import { fromSupabaseCategoryRow } from '@/data/supabase/mappers/category-mapper'
import { fromSupabaseGoalRow } from '@/data/supabase/mappers/goal-mapper'
import { fromSupabaseLoanRow } from '@/data/supabase/mappers/loan-mapper'
import { fromSupabaseRecurringTransactionRow } from '@/data/supabase/mappers/recurring-transaction-mapper'
import { fromSupabaseTransactionRow } from '@/data/supabase/mappers/transaction-mapper'
import type {
  AccountRow,
  BillRow,
  BudgetRow,
  CategoryRow,
  FinanceRecordRow,
  GoalRow,
  LoanRow,
  RecurringTransactionRow,
  TransactionRow,
} from '@/data/supabase/supabase-finance-types'

const baseRow: FinanceRecordRow = {
  id: 'record-1',
  household_id: 'household-1',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2026-01-01T08:00:00.000Z',
  updated_at: '2026-01-02T08:00:00.000Z',
  archived_at: null,
  deleted_at: null,
}

describe('Supabase finance mappers', () => {
  it('maps an account row to a domain account', () => {
    const row: AccountRow = {
      ...baseRow,
      name: 'Cash',
      type: 'cash',
      currency: 'PKR',
      opening_balance: 10_000,
      current_balance: 12_500,
      institution: null,
      color: '#16a34a',
      icon: 'Wallet',
      notes: 'Main cash wallet',
    }

    expect(fromSupabaseAccountRow(row)).toMatchObject({
      id: 'record-1',
      name: 'Cash',
      openingBalance: 10_000,
      currentBalance: 12_500,
      notes: 'Main cash wallet',
    })
  })

  it('maps a category row to a domain category', () => {
    const row: CategoryRow = {
      ...baseRow,
      name: 'Groceries',
      type: 'expense',
      icon: 'ShoppingBasket',
      color: '#f59e0b',
      is_default: true,
      default_key: 'expense-groceries',
    }

    expect(fromSupabaseCategoryRow(row)).toMatchObject({
      name: 'Groceries',
      type: 'expense',
      isDefault: true,
      defaultKey: 'expense-groceries',
    })
  })

  it('maps linked transaction fields correctly', () => {
    const row: TransactionRow = {
      ...baseRow,
      type: 'transfer',
      amount: 5_000,
      date: '2026-01-03',
      time: '14:30:00',
      transaction_datetime: '2026-01-03T09:30:00.000Z',
      category_id: 'category-1',
      from_account_id: 'account-1',
      to_account_id: 'account-2',
      payment_method: null,
      notes: 'Internet bill',
      tags: [],
      receipt_name: null,
      receipt_path: null,
      receipt_thumbnail: null,
      linked_bill_id: 'bill-1',
      linked_goal_id: 'goal-1',
      linked_loan_id: 'loan-1',
      linked_source_type: 'bill',
      linked_source_id: 'bill-1',
    }

    expect(fromSupabaseTransactionRow(row)).toMatchObject({
      type: 'transfer',
      amount: 5_000,
      date: '2026-01-03',
      time: '14:30:00',
      categoryId: 'category-1',
      fromAccountId: 'account-1',
      toAccountId: 'account-2',
      linkedBillId: 'bill-1',
      linkedGoalId: 'goal-1',
      linkedLoanId: 'loan-1',
      transactionDateTime: '2026-01-03T09:30:00.000Z',
    })
  })

  it('maps bill linked transaction id correctly', () => {
    const row: BillRow = {
      ...baseRow,
      name: 'Internet',
      amount: 4_500,
      category_id: 'category-1',
      payment_account_id: 'account-1',
      due_date: '2026-01-10',
      frequency: 'monthly',
      status: 'paid',
      paid_at: '2026-01-08T08:00:00.000Z',
      next_due_date: null,
      last_generated_date: null,
      linked_transaction_id: 'transaction-1',
      notes: null,
    }

    expect(fromSupabaseBillRow(row)).toMatchObject({
      name: 'Internet',
      amount: 4_500,
      dueDate: '2026-01-10',
      status: 'paid',
      paymentAccountId: 'account-1',
      linkedTransactionId: 'transaction-1',
    })
  })

  it('maps goal amounts and dates correctly', () => {
    const row: GoalRow = {
      ...baseRow,
      name: 'Emergency Fund',
      target_amount: 100_000,
      current_amount: 35_000,
      target_date: '2026-12-31',
      priority: 'high',
      status: 'active',
      icon: 'Shield',
      color: '#0ea5e9',
      notes: null,
    }

    expect(fromSupabaseGoalRow(row)).toMatchObject({
      id: 'record-1',
      name: 'Emergency Fund',
      targetAmount: 100_000,
      currentAmount: 35_000,
      targetDate: '2026-12-31',
    })
  })

  it('maps loan source and receiving account ids correctly', () => {
    const row: LoanRow = {
      ...baseRow,
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
      linked_transaction_id: 'transaction-2',
      notes: null,
    }

    expect(fromSupabaseLoanRow(row)).toMatchObject({
      id: 'record-1',
      name: 'Family Loan',
      principalAmount: 50_000,
      outstandingAmount: 25_000,
      sourceAccountId: 'account-source',
      receivingAccountId: undefined,
      linkedTransactionId: 'transaction-2',
    })
  })

  it('maps budget month, category, and planned amount correctly', () => {
    const row: BudgetRow = {
      ...baseRow,
      month: '2026-01',
      category_id: 'category-1',
      planned_amount: 30_000,
      group_name: 'needs',
      notes: null,
    }

    expect(fromSupabaseBudgetRow(row)).toMatchObject({
      id: 'record-1',
      month: '2026-01',
      categoryId: 'category-1',
      plannedAmount: 30_000,
      group: 'needs',
      notes: undefined,
    })
  })

  it('maps recurring transaction schedule fields correctly', () => {
    const row: RecurringTransactionRow = {
      ...baseRow,
      type: 'expense',
      name: 'Rent',
      amount: 45_000,
      category_id: 'category-rent',
      from_account_id: 'account-1',
      to_account_id: null,
      frequency: 'monthly',
      interval: 1,
      start_date: '2026-01-01',
      next_run_date: '2026-02-01',
      end_date: null,
      is_active: true,
      notes: 'Apartment rent',
      last_generated_at: '2026-01-01T08:00:00.000Z',
      last_generated_for_date: '2026-01-01',
    }

    expect(fromSupabaseRecurringTransactionRow(row)).toMatchObject({
      id: 'record-1',
      name: 'Rent',
      type: 'expense',
      amount: 45_000,
      categoryId: 'category-rent',
      fromAccountId: 'account-1',
      frequency: 'monthly',
      nextRunDate: '2026-02-01',
      lastGeneratedForDate: '2026-01-01',
    })
  })
})
