import type { Transaction } from '@/data/models/transaction'
import type { LocalTransactionRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  fromLocalRecordRow,
  nullable,
  optional,
  parseJsonArray,
  stringifyJsonArray,
  toLocalRecordRow,
} from '@/data/local-sqlite/mappers/mapper-utils'

export function fromLocalTransactionRow(row: LocalTransactionRow): Transaction {
  return {
    ...fromLocalRecordRow(row),
    amount: row.amount,
    categoryId: optional(row.category_id),
    date: row.date,
    fromAccountId: optional(row.from_account_id),
    linkedBillId: optional(row.linked_bill_id),
    linkedGoalId: optional(row.linked_goal_id),
    linkedLoanId: optional(row.linked_loan_id),
    notes: optional(row.notes),
    paymentMethod: optional(row.payment_method),
    receiptName: optional(row.receipt_name),
    receiptPath: optional(row.receipt_path),
    receiptThumbnail: optional(row.receipt_thumbnail),
    tags: parseJsonArray(row.tags_json),
    time: optional(row.time),
    toAccountId: optional(row.to_account_id),
    transactionDateTime: optional(row.transaction_datetime),
    type: row.type,
  }
}

export function toLocalTransactionRow(
  transaction: Transaction,
  context: { householdId: string; userId?: string },
): LocalTransactionRow {
  return {
    ...toLocalRecordRow(transaction, context),
    amount: transaction.amount,
    category_id: nullable(transaction.categoryId),
    date: transaction.date,
    from_account_id: nullable(transaction.fromAccountId),
    linked_bill_id: nullable(transaction.linkedBillId),
    linked_goal_id: nullable(transaction.linkedGoalId),
    linked_loan_id: nullable(transaction.linkedLoanId),
    linked_source_id:
      transaction.linkedBillId ??
      transaction.linkedGoalId ??
      transaction.linkedLoanId ??
      null,
    linked_source_type: transaction.linkedBillId
      ? 'bill'
      : transaction.linkedGoalId
        ? 'goal'
        : transaction.linkedLoanId
          ? 'loan'
          : null,
    notes: nullable(transaction.notes),
    payment_method: nullable(transaction.paymentMethod),
    receipt_name: nullable(transaction.receiptName),
    receipt_path: nullable(transaction.receiptPath),
    receipt_thumbnail: nullable(transaction.receiptThumbnail),
    tags_json: stringifyJsonArray(transaction.tags),
    time: nullable(transaction.time),
    to_account_id: nullable(transaction.toAccountId),
    transaction_datetime: nullable(transaction.transactionDateTime),
    type: transaction.type,
  }
}
