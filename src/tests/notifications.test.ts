import { describe, expect, it } from 'vitest'

import type { Bill } from '@/data/models/bill'
import type { BudgetAllocation } from '@/data/models/budget'
import type { Category } from '@/data/models/category'
import type { Goal } from '@/data/models/goal'
import type { Loan } from '@/data/models/loan'
import type { RecurringTransaction } from '@/data/models/recurring-transaction'
import type { Transaction } from '@/data/models/transaction'
import {
  dismissNotificationId,
  filterDismissedNotifications,
  getNotificationDismissalStorageKey,
  readDismissedNotificationIds,
} from '@/data/notifications/notification-dismissals'
import {
  createNotifications,
  type NotificationSourceData,
} from '@/data/notifications/notification-selectors'

const now = new Date(2026, 0, 10, 9, 0, 0)
const timestamp = '2026-01-01T00:00:00.000Z'

function baseRecord() {
  return {
    createdAt: timestamp,
    id: crypto.randomUUID(),
    updatedAt: timestamp,
  }
}

function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    ...baseRecord(),
    color: '#f59e0b',
    icon: 'ReceiptText',
    isDefault: false,
    name: 'Fuel',
    type: 'expense',
    ...overrides,
  }
}

function createBill(overrides: Partial<Bill> = {}): Bill {
  return {
    ...baseRecord(),
    amount: 5_000,
    categoryId: 'category-expense',
    dueDate: '2026-01-10',
    frequency: 'monthly',
    name: 'Electricity',
    status: 'pending',
    ...overrides,
  }
}

function createRecurringTransaction(
  overrides: Partial<RecurringTransaction> = {},
): RecurringTransaction {
  return {
    ...baseRecord(),
    amount: 100_000,
    categoryId: 'category-income',
    frequency: 'monthly',
    interval: 1,
    isActive: true,
    name: 'Salary',
    nextRunDate: '2026-01-10',
    startDate: '2026-01-01',
    toAccountId: 'account-1',
    type: 'income',
    ...overrides,
  }
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    ...baseRecord(),
    currentAmount: 100_000,
    name: 'Emergency Fund',
    priority: 'high',
    status: 'completed',
    targetAmount: 100_000,
    ...overrides,
  }
}

function createLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    ...baseRecord(),
    name: 'Family Loan',
    outstandingAmount: 0,
    principalAmount: 50_000,
    status: 'completed',
    type: 'given',
    ...overrides,
  }
}

function createBudget(overrides: Partial<BudgetAllocation> = {}): BudgetAllocation {
  return {
    ...baseRecord(),
    categoryId: 'category-expense',
    month: '2026-01',
    plannedAmount: 100_000,
    ...overrides,
  }
}

function createExpenseTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    ...baseRecord(),
    amount: 85_000,
    categoryId: 'category-expense',
    date: '2026-01-05',
    fromAccountId: 'account-1',
    type: 'expense',
    ...overrides,
  }
}

function createSource(
  overrides: Partial<NotificationSourceData> = {},
): NotificationSourceData {
  return {
    bills: [],
    budgets: [],
    categories: [
      createCategory({ id: 'category-expense' }),
      createCategory({
        id: 'category-income',
        name: 'Salary',
        type: 'income',
      }),
    ],
    goals: [],
    loans: [],
    recurringTransactions: [],
    transactions: [],
    ...overrides,
  }
}

function createMemoryStorage() {
  const values = new Map<string, string>()

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('notification selectors', () => {
  it('generates bill due today, due tomorrow, and overdue notifications', () => {
    const notifications = createNotifications(
      createSource({
        bills: [
          createBill({ dueDate: '2026-01-09', id: 'bill-overdue' }),
          createBill({ dueDate: '2026-01-10', id: 'bill-today' }),
          createBill({ dueDate: '2026-01-11', id: 'bill-tomorrow' }),
          createBill({
            dueDate: '2026-01-08',
            id: 'bill-paid',
            status: 'paid',
          }),
        ],
      }),
      now,
    )

    expect(notifications.map((notification) => notification.type)).toEqual([
      'bill-overdue',
      'bill-due-today',
      'bill-due-tomorrow',
    ])
    expect(notifications[0].severity).toBe('danger')
    expect(notifications[1].severity).toBe('warning')
    expect(notifications[2].severity).toBe('info')
  })

  it('generates recurring due and overdue notifications', () => {
    const notifications = createNotifications(
      createSource({
        recurringTransactions: [
          createRecurringTransaction({
            id: 'recurring-overdue',
            nextRunDate: '2026-01-09',
          }),
          createRecurringTransaction({
            id: 'recurring-today',
            nextRunDate: '2026-01-10',
          }),
          createRecurringTransaction({
            id: 'recurring-generated',
            lastGeneratedForDate: '2026-01-10',
            nextRunDate: '2026-01-10',
          }),
        ],
      }),
      now,
    )

    expect(notifications.map((notification) => notification.type)).toEqual([
      'recurring-overdue',
      'recurring-due-today',
    ])
  })

  it('generates goal and loan completion notifications', () => {
    const notifications = createNotifications(
      createSource({
        goals: [
          createGoal({ id: 'goal-complete' }),
          createGoal({
            currentAmount: 125_000,
            id: 'goal-exceeded',
            targetAmount: 100_000,
          }),
        ],
        loans: [createLoan({ id: 'loan-complete' })],
      }),
      now,
    )

    expect(notifications.map((notification) => notification.type)).toEqual([
      'goal-complete',
      'goal-exceeded',
      'loan-complete',
    ])
    expect(notifications.every((notification) => notification.severity === 'success')).toBe(
      true,
    )
  })

  it('generates budget threshold notifications at 80 and 100 percent', () => {
    const warningNotifications = createNotifications(
      createSource({
        budgets: [createBudget({ id: 'budget-warning' })],
        transactions: [
          createExpenseTransaction({
            amount: 85_000,
            id: 'transaction-warning',
          }),
        ],
      }),
      now,
    )
    const dangerNotifications = createNotifications(
      createSource({
        budgets: [createBudget({ id: 'budget-danger' })],
        transactions: [
          createExpenseTransaction({
            amount: 125_000,
            id: 'transaction-danger',
          }),
        ],
      }),
      now,
    )

    expect(warningNotifications).toMatchObject([
      {
        severity: 'warning',
        type: 'budget-warning',
      },
    ])
    expect(dangerNotifications).toMatchObject([
      {
        severity: 'danger',
        type: 'budget-danger',
      },
    ])
  })

  it('prioritizes overdue bills before over-budget and due-today items', () => {
    const notifications = createNotifications(
      createSource({
        bills: [
          createBill({ dueDate: '2026-01-09', id: 'bill-overdue' }),
          createBill({ dueDate: '2026-01-10', id: 'bill-today' }),
        ],
        budgets: [createBudget({ id: 'budget-danger' })],
        transactions: [
          createExpenseTransaction({
            amount: 125_000,
            id: 'transaction-danger',
          }),
        ],
      }),
      now,
    )

    expect(notifications.map((notification) => notification.type)).toEqual([
      'bill-overdue',
      'budget-danger',
      'bill-due-today',
    ])
  })

  it('persists dismissed notification ids without changing source data', () => {
    const storage = createMemoryStorage()
    const storageKey = getNotificationDismissalStorageKey('household-1')
    const notifications = createNotifications(
      createSource({
        bills: [createBill({ dueDate: '2026-01-09', id: 'bill-overdue' })],
      }),
      now,
    )
    const notificationId = notifications[0].id

    const dismissedIds = dismissNotificationId(
      storageKey,
      notificationId,
      storage,
    )

    expect(readDismissedNotificationIds(storageKey, storage).has(notificationId)).toBe(
      true,
    )
    expect(filterDismissedNotifications(notifications, dismissedIds)).toEqual([])
  })
})
