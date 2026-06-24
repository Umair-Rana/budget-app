import type {
  Transaction,
  UpdateTransactionInput,
} from '@/data/models/transaction'
import type {
  SupabaseFinanceMapperContext,
  TransactionInsertRow,
  TransactionRow,
  TransactionUpdateRow,
} from '@/data/supabase/supabase-finance-types'
import {
  linkedSourceFromIds,
  nullable,
  optional,
  toSupabaseRecordFields,
  toSupabaseUpdateMetadata,
} from '@/data/supabase/mappers/mapper-utils'

export function fromSupabaseTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    categoryId: optional(row.category_id),
    fromAccountId: optional(row.from_account_id),
    toAccountId: optional(row.to_account_id),
    paymentMethod: optional(row.payment_method),
    date: row.date,
    time: optional(row.time),
    transactionDateTime: optional(row.transaction_datetime),
    notes: optional(row.notes),
    tags: row.tags.length > 0 ? row.tags : undefined,
    receiptName: optional(row.receipt_name),
    receiptPath: optional(row.receipt_path),
    receiptThumbnail: optional(row.receipt_thumbnail),
    linkedBillId: optional(row.linked_bill_id),
    linkedGoalId: optional(row.linked_goal_id),
    linkedLoanId: optional(row.linked_loan_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: optional(row.archived_at),
    deletedAt: optional(row.deleted_at),
  }
}

export function toSupabaseTransactionInsert(
  transaction: Transaction,
  context: SupabaseFinanceMapperContext,
): TransactionInsertRow {
  const linkedSource = linkedSourceFromIds(transaction)

  return {
    ...toSupabaseRecordFields(transaction, context),
    type: transaction.type,
    amount: transaction.amount,
    date: transaction.date,
    time: nullable(transaction.time),
    transaction_datetime: nullable(transaction.transactionDateTime),
    category_id: nullable(transaction.categoryId),
    from_account_id: nullable(transaction.fromAccountId),
    to_account_id: nullable(transaction.toAccountId),
    idempotency_key: null,
    payment_method: nullable(transaction.paymentMethod),
    notes: nullable(transaction.notes),
    tags: transaction.tags ?? [],
    receipt_name: nullable(transaction.receiptName),
    receipt_path: nullable(transaction.receiptPath),
    receipt_thumbnail: nullable(transaction.receiptThumbnail),
    linked_bill_id: nullable(transaction.linkedBillId),
    linked_goal_id: nullable(transaction.linkedGoalId),
    linked_loan_id: nullable(transaction.linkedLoanId),
    linked_source_type: linkedSource.linked_source_type,
    linked_source_id: linkedSource.linked_source_id,
  }
}

export function toSupabaseTransactionUpdate(
  input: UpdateTransactionInput,
  context: Pick<SupabaseFinanceMapperContext, 'now' | 'userId'>,
): TransactionUpdateRow {
  const update: TransactionUpdateRow = toSupabaseUpdateMetadata(context)

  if ('type' in input) {
    update.type = input.type
  }

  if ('amount' in input) {
    update.amount = input.amount
  }

  if ('date' in input) {
    update.date = input.date
  }

  if ('time' in input) {
    update.time = nullable(input.time)
  }

  if ('transactionDateTime' in input) {
    update.transaction_datetime = nullable(input.transactionDateTime)
  }

  if ('categoryId' in input) {
    update.category_id = nullable(input.categoryId)
  }

  if ('fromAccountId' in input) {
    update.from_account_id = nullable(input.fromAccountId)
  }

  if ('toAccountId' in input) {
    update.to_account_id = nullable(input.toAccountId)
  }

  if ('notes' in input) {
    update.notes = nullable(input.notes)
  }

  if ('linkedBillId' in input) {
    update.linked_bill_id = nullable(input.linkedBillId)
  }

  if ('linkedGoalId' in input) {
    update.linked_goal_id = nullable(input.linkedGoalId)
  }

  if ('linkedLoanId' in input) {
    update.linked_loan_id = nullable(input.linkedLoanId)
  }

  if (
    'linkedBillId' in input ||
    'linkedGoalId' in input ||
    'linkedLoanId' in input
  ) {
    const linkedSource = linkedSourceFromIds(input)
    update.linked_source_type = linkedSource.linked_source_type
    update.linked_source_id = linkedSource.linked_source_id
  }

  return update
}
