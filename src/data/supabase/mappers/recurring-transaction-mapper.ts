import type {
  RecurringTransaction,
  UpdateRecurringTransactionInput,
} from '@/data/models/recurring-transaction'
import {
  nullable,
  optional,
  toSupabaseRecordFields,
  toSupabaseUpdateMetadata,
} from '@/data/supabase/mappers/mapper-utils'
import type {
  RecurringTransactionInsertRow,
  RecurringTransactionRow,
  RecurringTransactionUpdateRow,
  SupabaseFinanceMapperContext,
} from '@/data/supabase/supabase-finance-types'

export function fromSupabaseRecurringTransactionRow(
  row: RecurringTransactionRow,
): RecurringTransaction {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    amount: row.amount,
    categoryId: optional(row.category_id),
    fromAccountId: optional(row.from_account_id),
    toAccountId: optional(row.to_account_id),
    frequency: row.frequency,
    interval: row.interval,
    startDate: row.start_date,
    nextRunDate: row.next_run_date,
    endDate: optional(row.end_date),
    isActive: row.is_active,
    notes: optional(row.notes),
    lastGeneratedAt: optional(row.last_generated_at),
    lastGeneratedForDate: optional(row.last_generated_for_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: optional(row.archived_at),
    deletedAt: optional(row.deleted_at),
  }
}

export function toSupabaseRecurringTransactionInsert(
  recurringTransaction: RecurringTransaction,
  context: SupabaseFinanceMapperContext,
): RecurringTransactionInsertRow {
  return {
    ...toSupabaseRecordFields(recurringTransaction, context),
    type: recurringTransaction.type,
    name: recurringTransaction.name,
    amount: recurringTransaction.amount,
    category_id: nullable(recurringTransaction.categoryId),
    from_account_id: nullable(recurringTransaction.fromAccountId),
    to_account_id: nullable(recurringTransaction.toAccountId),
    frequency: recurringTransaction.frequency,
    interval: recurringTransaction.interval,
    start_date: recurringTransaction.startDate,
    next_run_date: recurringTransaction.nextRunDate,
    end_date: nullable(recurringTransaction.endDate),
    is_active: recurringTransaction.isActive,
    notes: nullable(recurringTransaction.notes),
    last_generated_at: nullable(recurringTransaction.lastGeneratedAt),
    last_generated_for_date: nullable(recurringTransaction.lastGeneratedForDate),
  }
}

export function toSupabaseRecurringTransactionUpdate(
  input: UpdateRecurringTransactionInput,
  context: Pick<SupabaseFinanceMapperContext, 'now' | 'userId'>,
): RecurringTransactionUpdateRow {
  const update: RecurringTransactionUpdateRow = toSupabaseUpdateMetadata(context)

  if ('type' in input) {
    update.type = input.type
  }

  if ('name' in input) {
    update.name = input.name
  }

  if ('amount' in input) {
    update.amount = input.amount
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

  if ('frequency' in input) {
    update.frequency = input.frequency
  }

  if ('interval' in input) {
    update.interval = input.interval
  }

  if ('startDate' in input) {
    update.start_date = input.startDate
  }

  if ('nextRunDate' in input) {
    update.next_run_date = input.nextRunDate
  }

  if ('endDate' in input) {
    update.end_date = nullable(input.endDate)
  }

  if ('isActive' in input) {
    update.is_active = input.isActive
  }

  if ('notes' in input) {
    update.notes = nullable(input.notes)
  }

  return update
}
