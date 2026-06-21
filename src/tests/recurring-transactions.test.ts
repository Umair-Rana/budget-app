import { describe, expect, it } from 'vitest'

import {
  calculateNextRunDate,
  isRecurringTransactionDue,
  transactionInputFromRecurring,
  validateRecurringTransactionInput,
} from '@/data/domain/recurring-transactions'
import type { RecurringTransaction } from '@/data/models/recurring-transaction'

const baseRecurringTransaction: RecurringTransaction = {
  id: 'recurring-1',
  type: 'expense',
  name: 'Rent',
  amount: 45_000,
  categoryId: 'category-rent',
  fromAccountId: 'account-1',
  frequency: 'monthly',
  interval: 1,
  startDate: '2026-01-01',
  nextRunDate: '2026-01-31',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('recurring transaction domain logic', () => {
  it('calculates next run dates for supported frequencies', () => {
    expect(calculateNextRunDate('2026-01-01', 'daily', 2)).toBe(
      '2026-01-03',
    )
    expect(calculateNextRunDate('2026-01-01', 'weekly', 2)).toBe(
      '2026-01-15',
    )
    expect(calculateNextRunDate('2026-01-31', 'monthly', 1)).toBe(
      '2026-02-28',
    )
    expect(calculateNextRunDate('2024-02-29', 'yearly', 1)).toBe(
      '2025-02-28',
    )
  })

  it('detects due recurring transactions safely', () => {
    expect(isRecurringTransactionDue(baseRecurringTransaction, '2026-01-31')).toBe(
      true,
    )
    expect(isRecurringTransactionDue(baseRecurringTransaction, '2026-01-30')).toBe(
      false,
    )
    expect(
      isRecurringTransactionDue(
        {
          ...baseRecurringTransaction,
          isActive: false,
        },
        '2026-01-31',
      ),
    ).toBe(false)
    expect(
      isRecurringTransactionDue(
        {
          ...baseRecurringTransaction,
          endDate: '2026-01-15',
        },
        '2026-01-31',
      ),
    ).toBe(false)
  })

  it('validates required fields by transaction type', () => {
    expect(() =>
      validateRecurringTransactionInput({
        type: 'income',
        name: 'Salary',
        amount: 100_000,
        categoryId: 'category-income',
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-01-01',
        nextRunDate: '2026-01-31',
      }),
    ).toThrow('Destination account is required.')

    expect(() =>
      validateRecurringTransactionInput({
        type: 'transfer',
        name: 'Savings move',
        amount: 10_000,
        fromAccountId: 'account-1',
        toAccountId: 'account-1',
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-01-01',
        nextRunDate: '2026-01-31',
      }),
    ).toThrow('Transfer accounts must be different.')
  })

  it('builds normal transaction inputs from recurring schedules', () => {
    expect(
      transactionInputFromRecurring(baseRecurringTransaction, '2026-01-31'),
    ).toEqual({
      type: 'expense',
      amount: 45_000,
      categoryId: 'category-rent',
      fromAccountId: 'account-1',
      date: '2026-01-31',
      notes: 'Recurring: Rent',
    })
  })
})
