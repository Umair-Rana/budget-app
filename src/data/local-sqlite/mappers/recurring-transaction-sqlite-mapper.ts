import type { RecurringTransaction } from '@/data/models/recurring-transaction'
import type { LocalRecurringTransactionRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  fromLocalRecordRow,
  fromSqliteBoolean,
  nullable,
  optional,
  toLocalRecordRow,
  toSqliteBoolean,
} from '@/data/local-sqlite/mappers/mapper-utils'

export function fromLocalRecurringTransactionRow(
  row: LocalRecurringTransactionRow,
): RecurringTransaction {
  return {
    ...fromLocalRecordRow(row),
    amount: row.amount,
    categoryId: optional(row.category_id),
    endDate: optional(row.end_date),
    frequency: row.frequency,
    fromAccountId: optional(row.from_account_id),
    interval: row.interval,
    isActive: fromSqliteBoolean(row.is_active),
    lastGeneratedAt: optional(row.last_generated_at),
    lastGeneratedForDate: optional(row.last_generated_for_date),
    name: row.name,
    nextRunDate: row.next_run_date,
    notes: optional(row.notes),
    startDate: row.start_date,
    toAccountId: optional(row.to_account_id),
    type: row.type,
  }
}

export function toLocalRecurringTransactionRow(
  recurringTransaction: RecurringTransaction,
  context: { householdId: string; userId?: string },
): LocalRecurringTransactionRow {
  return {
    ...toLocalRecordRow(recurringTransaction, context),
    amount: recurringTransaction.amount,
    category_id: nullable(recurringTransaction.categoryId),
    end_date: nullable(recurringTransaction.endDate),
    frequency: recurringTransaction.frequency,
    from_account_id: nullable(recurringTransaction.fromAccountId),
    interval: recurringTransaction.interval,
    is_active: toSqliteBoolean(recurringTransaction.isActive),
    last_generated_at: nullable(recurringTransaction.lastGeneratedAt),
    last_generated_for_date: nullable(recurringTransaction.lastGeneratedForDate),
    name: recurringTransaction.name,
    next_run_date: recurringTransaction.nextRunDate,
    notes: nullable(recurringTransaction.notes),
    start_date: recurringTransaction.startDate,
    to_account_id: nullable(recurringTransaction.toAccountId),
    type: recurringTransaction.type,
  }
}
