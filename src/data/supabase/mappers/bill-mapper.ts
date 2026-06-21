import type { Bill, UpdateBillInput } from '@/data/models/bill'
import type {
  BillInsertRow,
  BillRow,
  BillUpdateRow,
  SupabaseFinanceMapperContext,
} from '@/data/supabase/supabase-finance-types'
import {
  nullable,
  optional,
  toSupabaseRecordFields,
  toSupabaseUpdateMetadata,
} from '@/data/supabase/mappers/mapper-utils'

export function fromSupabaseBillRow(row: BillRow): Bill {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    categoryId: row.category_id,
    dueDate: row.due_date,
    status: row.status,
    frequency: row.frequency,
    nextDueDate: optional(row.next_due_date),
    lastGeneratedDate: optional(row.last_generated_date),
    paymentAccountId: optional(row.payment_account_id),
    linkedTransactionId: optional(row.linked_transaction_id),
    notes: optional(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: optional(row.archived_at),
    deletedAt: optional(row.deleted_at),
  }
}

export function toSupabaseBillInsert(
  bill: Bill,
  context: SupabaseFinanceMapperContext,
): BillInsertRow {
  return {
    ...toSupabaseRecordFields(bill, context),
    name: bill.name,
    amount: bill.amount,
    category_id: bill.categoryId,
    payment_account_id: nullable(bill.paymentAccountId),
    due_date: bill.dueDate,
    frequency: bill.frequency,
    status: bill.status,
    paid_at: null,
    next_due_date: nullable(bill.nextDueDate),
    last_generated_date: nullable(bill.lastGeneratedDate),
    linked_transaction_id: nullable(bill.linkedTransactionId),
    notes: nullable(bill.notes),
  }
}

export function toSupabaseBillUpdate(
  input: UpdateBillInput,
  context: Pick<SupabaseFinanceMapperContext, 'now' | 'userId'>,
): BillUpdateRow {
  const update: BillUpdateRow = toSupabaseUpdateMetadata(context)

  if ('name' in input) {
    update.name = input.name
  }

  if ('amount' in input) {
    update.amount = input.amount
  }

  if ('categoryId' in input) {
    update.category_id = input.categoryId
  }

  if ('dueDate' in input) {
    update.due_date = input.dueDate
  }

  if ('frequency' in input) {
    update.frequency = input.frequency
  }

  if ('notes' in input) {
    update.notes = nullable(input.notes)
  }

  return update
}
