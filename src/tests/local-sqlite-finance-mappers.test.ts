import { describe, expect, it } from 'vitest'

import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'
import {
  createLocalAccountRepository,
  localSqliteWriteNotImplementedMessage,
} from '@/data/local-sqlite/repositories'
import { createLocalSqliteFinanceDataSource } from '@/data/local-sqlite/local-sqlite-finance-data-source'
import {
  fromLocalAccountRow,
  fromLocalBillRow,
  fromLocalBudgetRow,
  fromLocalCategoryRow,
  fromLocalGoalRow,
  fromLocalLoanRow,
  fromLocalNotificationRow,
  fromLocalRecurringBillRow,
  fromLocalRecurringTransactionRow,
  fromLocalTransactionRow,
} from '@/data/local-sqlite/mappers'
import type {
  LocalAccountRow,
  LocalBillRow,
  LocalBudgetRow,
  LocalCategoryRow,
  LocalFinanceRecordRow,
  LocalGoalRow,
  LocalLoanRow,
  LocalNotificationRow,
  LocalRecurringBillRow,
  LocalRecurringTransactionRow,
  LocalTransactionRow,
} from '@/data/local-sqlite/local-finance-row-types'

class MockLocalSqliteDriver implements LocalSqliteDriver {
  queries: Array<{ params?: readonly unknown[]; sql: string }> = []
  rows: unknown[] = []

  async exec() {
    return undefined
  }

  async query<T>(sql: string, params?: readonly unknown[]) {
    this.queries.push({ params, sql })
    return this.rows as T[]
  }

  async run() {
    return undefined
  }

  async transaction<T>(work: () => Promise<T>) {
    return work()
  }
}

const baseRecord = {
  archived_at: null,
  created_at: '2026-06-23T00:00:00.000Z',
  created_by: 'user-1',
  deleted_at: null,
  household_id: 'household-1',
  id: 'record-1',
  updated_at: '2026-06-23T01:00:00.000Z',
  updated_by: 'user-1',
} satisfies LocalFinanceRecordRow

describe('local SQLite finance mappers', () => {
  it('maps account row to domain', () => {
    const row = {
      ...baseRecord,
      color: '#111111',
      currency: 'PKR',
      current_balance: 125,
      icon: 'Wallet',
      institution: null,
      name: 'Cash',
      notes: 'Daily cash',
      opening_balance: 100,
      type: 'cash',
    } satisfies LocalAccountRow

    expect(fromLocalAccountRow(row)).toMatchObject({
      color: '#111111',
      currentBalance: 125,
      id: 'record-1',
      name: 'Cash',
      openingBalance: 100,
      type: 'cash',
    })
  })

  it('maps category row to domain', () => {
    const row = {
      ...baseRecord,
      color: null,
      default_key: 'food',
      icon: null,
      is_default: 1,
      name: 'Food',
      type: 'expense',
    } satisfies LocalCategoryRow

    expect(fromLocalCategoryRow(row)).toMatchObject({
      color: '#64748b',
      defaultKey: 'food',
      icon: 'Circle',
      isDefault: true,
      name: 'Food',
      type: 'expense',
    })
  })

  it('maps transaction row to domain', () => {
    const row = {
      ...baseRecord,
      amount: 25,
      category_id: 'category-1',
      date: '2026-06-23',
      from_account_id: 'account-1',
      linked_bill_id: null,
      linked_goal_id: null,
      linked_loan_id: null,
      linked_source_id: null,
      linked_source_type: null,
      notes: 'Lunch',
      payment_method: null,
      receipt_name: null,
      receipt_path: null,
      receipt_thumbnail: null,
      tags_json: '["food","work"]',
      time: '12:00',
      to_account_id: null,
      transaction_datetime: '2026-06-23T12:00:00.000Z',
      type: 'expense',
    } satisfies LocalTransactionRow

    expect(fromLocalTransactionRow(row)).toMatchObject({
      amount: 25,
      categoryId: 'category-1',
      fromAccountId: 'account-1',
      notes: 'Lunch',
      tags: ['food', 'work'],
      type: 'expense',
    })
  })

  it('maps bill row to domain', () => {
    const row = {
      ...baseRecord,
      amount: 55,
      category_id: 'category-1',
      due_date: '2026-06-25',
      frequency: 'monthly',
      last_generated_date: null,
      linked_transaction_id: 'transaction-1',
      name: 'Internet',
      next_due_date: '2026-07-25',
      notes: null,
      paid_at: null,
      payment_account_id: 'account-1',
      status: 'pending',
    } satisfies LocalBillRow

    expect(fromLocalBillRow(row)).toMatchObject({
      amount: 55,
      categoryId: 'category-1',
      dueDate: '2026-06-25',
      linkedTransactionId: 'transaction-1',
      name: 'Internet',
    })
  })

  it('maps goal row to domain', () => {
    const row = {
      ...baseRecord,
      color: '#00ff00',
      current_amount: 200,
      icon: 'Target',
      name: 'Emergency',
      notes: null,
      priority: 'high',
      status: 'active',
      target_amount: 1000,
      target_date: '2026-12-31',
    } satisfies LocalGoalRow

    expect(fromLocalGoalRow(row)).toMatchObject({
      currentAmount: 200,
      name: 'Emergency',
      priority: 'high',
      targetAmount: 1000,
      targetDate: '2026-12-31',
    })
  })

  it('maps loan row to domain', () => {
    const row = {
      ...baseRecord,
      counterparty: 'Ali',
      due_date: '2026-08-01',
      interest_rate: 0,
      linked_transaction_id: 'transaction-1',
      name: 'Loan',
      notes: null,
      outstanding_amount: 400,
      principal_amount: 500,
      receiving_account_id: null,
      source_account_id: 'account-1',
      status: 'active',
      type: 'given',
    } satisfies LocalLoanRow

    expect(fromLocalLoanRow(row)).toMatchObject({
      counterparty: 'Ali',
      outstandingAmount: 400,
      principalAmount: 500,
      sourceAccountId: 'account-1',
      type: 'given',
    })
  })

  it('maps budget row to domain', () => {
    const row = {
      ...baseRecord,
      category_id: 'category-1',
      group_name: 'needs',
      month: '2026-06',
      notes: null,
      planned_amount: 300,
    } satisfies LocalBudgetRow

    expect(fromLocalBudgetRow(row)).toMatchObject({
      categoryId: 'category-1',
      group: 'needs',
      month: '2026-06',
      plannedAmount: 300,
    })
  })

  it('maps recurring transaction row to domain', () => {
    const row = {
      ...baseRecord,
      amount: 100,
      category_id: 'category-1',
      end_date: null,
      frequency: 'monthly',
      from_account_id: 'account-1',
      interval: 1,
      is_active: 1,
      last_generated_at: null,
      last_generated_for_date: null,
      name: 'Salary',
      next_run_date: '2026-07-01',
      notes: null,
      start_date: '2026-06-01',
      to_account_id: null,
      type: 'income',
    } satisfies LocalRecurringTransactionRow

    expect(fromLocalRecurringTransactionRow(row)).toMatchObject({
      isActive: true,
      name: 'Salary',
      nextRunDate: '2026-07-01',
      type: 'income',
    })
  })

  it('maps recurring bill row to domain', () => {
    const row = {
      ...baseRecord,
      amount: 80,
      auto_generate_days_before_due: 3,
      category_id: 'category-1',
      end_date: null,
      frequency: 'monthly',
      interval: 1,
      is_active: 1,
      last_generated_at: null,
      last_generated_for_date: null,
      name: 'Rent',
      next_due_date: '2026-07-01',
      notes: null,
      start_date: '2026-06-01',
    } satisfies LocalRecurringBillRow

    expect(fromLocalRecurringBillRow(row)).toMatchObject({
      autoGenerateDaysBeforeDue: 3,
      isActive: true,
      name: 'Rent',
      nextDueDate: '2026-07-01',
    })
  })

  it('maps notification row to domain with safe defaults', () => {
    const row = {
      created_at: '2026-06-23T00:00:00.000Z',
      deleted_at: null,
      dismissed_at: null,
      entity_id: null,
      entity_type: null,
      household_id: 'household-1',
      id: 'notification-1',
      message: 'Bill is due today.',
      read_at: null,
      title: 'Bill due',
      type: 'bill-due-today',
      updated_at: '2026-06-23T00:00:00.000Z',
      user_id: 'user-1',
    } satisfies LocalNotificationRow

    expect(fromLocalNotificationRow(row)).toMatchObject({
      actionLabel: 'Open',
      actionRoute: '/',
      dismissible: true,
      message: 'Bill is due today.',
      priority: 0,
      severity: 'info',
      title: 'Bill due',
    })
  })
})

describe('local SQLite read-only repositories', () => {
  it('filters read queries by household_id and excludes deleted rows by default', async () => {
    const driver = new MockLocalSqliteDriver()
    driver.rows = []
    const repository = createLocalAccountRepository({
      driver,
      householdId: 'household-1',
    })

    await repository.getAll()

    expect(driver.queries[0]).toEqual({
      params: ['household-1'],
      sql: 'select * from accounts where household_id = ? and deleted_at is null and archived_at is null order by name',
    })
  })

  it('allows deleted rows only when explicitly requested', async () => {
    const driver = new MockLocalSqliteDriver()
    const repository = createLocalAccountRepository({
      driver,
      householdId: 'household-1',
    })

    await repository.getAll({ includeDeleted: true })

    expect(driver.queries[0].sql).not.toContain('deleted_at is null')
    expect(driver.queries[0].sql).toContain('archived_at is null')
  })

  it('throws clearly for unimplemented write methods', async () => {
    const repository = createLocalAccountRepository({
      driver: new MockLocalSqliteDriver(),
      householdId: 'household-1',
    })

    expect(() =>
      repository.create({
        color: '#111111',
        icon: 'Wallet',
        name: 'Cash',
        openingBalance: 0,
        type: 'cash',
      }),
    ).toThrow(localSqliteWriteNotImplementedMessage)
  })

  it('creates an offline-mode local finance data source scaffold', () => {
    const dataSource = createLocalSqliteFinanceDataSource({
      driver: new MockLocalSqliteDriver(),
      householdId: 'household-1',
    })

    expect(dataSource.mode).toBe('offline')
    expect(dataSource.accounts).toBeDefined()
    expect(dataSource.notifications).toBeDefined()
    expect(dataSource.household).toBeDefined()
  })
})
