import type { Bill } from '@/data/models/bill'
import type { LocalBillRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  fromLocalRecordRow,
  nullable,
  optional,
  toLocalRecordRow,
} from '@/data/local-sqlite/mappers/mapper-utils'

export function fromLocalBillRow(row: LocalBillRow): Bill {
  return {
    ...fromLocalRecordRow(row),
    amount: row.amount,
    categoryId: row.category_id,
    dueDate: row.due_date,
    frequency: row.frequency,
    lastGeneratedDate: optional(row.last_generated_date),
    linkedTransactionId: optional(row.linked_transaction_id),
    name: row.name,
    nextDueDate: optional(row.next_due_date),
    notes: optional(row.notes),
    paymentAccountId: optional(row.payment_account_id),
    status: row.status,
  }
}

export function toLocalBillRow(
  bill: Bill,
  context: { householdId: string; userId?: string },
): LocalBillRow {
  return {
    ...toLocalRecordRow(bill, context),
    amount: bill.amount,
    category_id: bill.categoryId,
    due_date: bill.dueDate,
    frequency: bill.frequency,
    last_generated_date: nullable(bill.lastGeneratedDate),
    linked_transaction_id: nullable(bill.linkedTransactionId),
    name: bill.name,
    next_due_date: nullable(bill.nextDueDate),
    notes: nullable(bill.notes),
    paid_at: null,
    payment_account_id: nullable(bill.paymentAccountId),
    status: bill.status,
  }
}
