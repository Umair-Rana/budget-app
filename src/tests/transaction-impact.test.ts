import { describe, expect, it } from 'vitest'

import type { Transaction } from '@/data/models/transaction'
import { buildTransactionImpactPlan } from '@/data/repositories/transactions/transaction-impact'

const baseTransaction: Omit<Transaction, 'type'> = {
  id: 'transaction-1',
  amount: 1_000,
  date: '2026-01-10',
  time: '12:00:00',
  transactionDateTime: '2026-01-10T07:00:00.000Z',
  createdAt: '2026-01-10T07:00:00.000Z',
  updatedAt: '2026-01-10T07:00:00.000Z',
}

describe('transaction balance impact plans', () => {
  it('increases the destination account for income', () => {
    const plan = buildTransactionImpactPlan({
      operation: 'create',
      transaction: {
        ...baseTransaction,
        type: 'income',
        toAccountId: 'account-income',
      },
    })

    expect(plan.apply).toEqual([
      {
        accountId: 'account-income',
        amount: 1_000,
        direction: 'increase',
        transactionId: 'transaction-1',
      },
    ])
  })

  it('decreases the source account for expenses', () => {
    const plan = buildTransactionImpactPlan({
      operation: 'create',
      transaction: {
        ...baseTransaction,
        type: 'expense',
        fromAccountId: 'account-expense',
      },
    })

    expect(plan.apply).toEqual([
      {
        accountId: 'account-expense',
        amount: 1_000,
        direction: 'decrease',
        transactionId: 'transaction-1',
      },
    ])
  })

  it('moves money between accounts for transfers', () => {
    const plan = buildTransactionImpactPlan({
      operation: 'create',
      transaction: {
        ...baseTransaction,
        type: 'transfer',
        fromAccountId: 'account-from',
        toAccountId: 'account-to',
      },
    })

    expect(plan.apply).toEqual([
      {
        accountId: 'account-from',
        amount: 1_000,
        direction: 'decrease',
        transactionId: 'transaction-1',
      },
      {
        accountId: 'account-to',
        amount: 1_000,
        direction: 'increase',
        transactionId: 'transaction-1',
      },
    ])
  })

  it('reverses the previous transaction and applies the updated transaction on edit', () => {
    const plan = buildTransactionImpactPlan({
      operation: 'edit',
      previousTransaction: {
        ...baseTransaction,
        type: 'adjustment',
        toAccountId: 'account-adjustment',
      },
      transaction: {
        ...baseTransaction,
        amount: 500,
        type: 'adjustment',
        fromAccountId: 'account-adjustment',
        toAccountId: undefined,
      },
    })

    expect(plan.reverse).toEqual([
      {
        accountId: 'account-adjustment',
        amount: 1_000,
        direction: 'decrease',
        transactionId: 'transaction-1',
      },
    ])
    expect(plan.apply).toEqual([
      {
        accountId: 'account-adjustment',
        amount: 500,
        direction: 'decrease',
        transactionId: 'transaction-1',
      },
    ])
  })
})
