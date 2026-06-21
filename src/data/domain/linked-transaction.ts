import type { Transaction } from '@/data/models/transaction'

export function isLinkedTransaction(transaction: Transaction) {
  return Boolean(
    transaction.linkedBillId ||
      transaction.linkedGoalId ||
      transaction.linkedLoanId,
  )
}
