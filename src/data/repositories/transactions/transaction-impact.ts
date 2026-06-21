import type { EntityId } from '@/data/models/common'
import type { Transaction } from '@/data/models/transaction'
import { RepositoryError } from '@/data/repositories/common/repository-errors'

export type AccountBalanceImpactDirection = 'increase' | 'decrease'

export type AccountBalanceImpact = {
  accountId: EntityId
  amount: number
  direction: AccountBalanceImpactDirection
  transactionId?: EntityId
}

export type TransactionImpactOperation = 'create' | 'edit' | 'delete'

export type TransactionImpactPlan = {
  operation: TransactionImpactOperation
  apply: AccountBalanceImpact[]
  reverse: AccountBalanceImpact[]
}

export type BuildTransactionImpactPlanInput =
  | {
      operation: 'create'
      transaction: Transaction
    }
  | {
      operation: 'edit'
      previousTransaction: Transaction
      transaction: Transaction
    }
  | {
      operation: 'delete'
      previousTransaction: Transaction
    }

export type BuildTransactionImpactPlan = (
  input: BuildTransactionImpactPlanInput,
) => TransactionImpactPlan

export function createAccountBalanceImpact(
  impact: AccountBalanceImpact,
): AccountBalanceImpact {
  return impact
}

export function reverseAccountBalanceImpact(
  impact: AccountBalanceImpact,
): AccountBalanceImpact {
  return {
    ...impact,
    direction: impact.direction === 'increase' ? 'decrease' : 'increase',
  }
}

function requireAccountId(accountId: EntityId | undefined, label: string) {
  if (!accountId) {
    throw new RepositoryError(`${label} account is required.`)
  }

  return accountId
}

export function getTransactionAccountBalanceImpacts(
  transaction: Transaction,
): AccountBalanceImpact[] {
  if (transaction.type === 'income') {
    return [
      createAccountBalanceImpact({
        accountId: requireAccountId(transaction.toAccountId, 'Income destination'),
        amount: transaction.amount,
        direction: 'increase',
        transactionId: transaction.id,
      }),
    ]
  }

  if (transaction.type === 'expense') {
    return [
      createAccountBalanceImpact({
        accountId: requireAccountId(transaction.fromAccountId, 'Expense source'),
        amount: transaction.amount,
        direction: 'decrease',
        transactionId: transaction.id,
      }),
    ]
  }

  if (transaction.type === 'transfer') {
    if (transaction.linkedGoalId || transaction.linkedLoanId) {
      const impacts: AccountBalanceImpact[] = []

      if (transaction.fromAccountId) {
        impacts.push(
          createAccountBalanceImpact({
            accountId: transaction.fromAccountId,
            amount: transaction.amount,
            direction: 'decrease',
            transactionId: transaction.id,
          }),
        )
      }

      if (transaction.toAccountId) {
        impacts.push(
          createAccountBalanceImpact({
            accountId: transaction.toAccountId,
            amount: transaction.amount,
            direction: 'increase',
            transactionId: transaction.id,
          }),
        )
      }

      if (impacts.length === 0) {
        throw new RepositoryError('Linked movement account is required.')
      }

      return impacts
    }

    return [
      createAccountBalanceImpact({
        accountId: requireAccountId(transaction.fromAccountId, 'Transfer source'),
        amount: transaction.amount,
        direction: 'decrease',
        transactionId: transaction.id,
      }),
      createAccountBalanceImpact({
        accountId: requireAccountId(
          transaction.toAccountId,
          'Transfer destination',
        ),
        amount: transaction.amount,
        direction: 'increase',
        transactionId: transaction.id,
      }),
    ]
  }

  if (transaction.toAccountId) {
    return [
      createAccountBalanceImpact({
        accountId: transaction.toAccountId,
        amount: transaction.amount,
        direction: 'increase',
        transactionId: transaction.id,
      }),
    ]
  }

  return [
    createAccountBalanceImpact({
      accountId: requireAccountId(transaction.fromAccountId, 'Adjustment account'),
      amount: transaction.amount,
      direction: 'decrease',
      transactionId: transaction.id,
    }),
  ]
}

export const buildTransactionImpactPlan: BuildTransactionImpactPlan = (input) => {
  if (input.operation === 'create') {
    return {
      operation: input.operation,
      apply: getTransactionAccountBalanceImpacts(input.transaction),
      reverse: [],
    }
  }

  if (input.operation === 'edit') {
    const previousImpacts = getTransactionAccountBalanceImpacts(
      input.previousTransaction,
    )

    return {
      operation: input.operation,
      apply: getTransactionAccountBalanceImpacts(input.transaction),
      reverse: previousImpacts.map(reverseAccountBalanceImpact),
    }
  }

  const previousImpacts = getTransactionAccountBalanceImpacts(
    input.previousTransaction,
  )

  return {
    operation: input.operation,
    apply: [],
    reverse: previousImpacts.map(reverseAccountBalanceImpact),
  }
}
