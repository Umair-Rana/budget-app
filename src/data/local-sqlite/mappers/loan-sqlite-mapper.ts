import type { Loan } from '@/data/models/loan'
import type { LocalLoanRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  fromLocalRecordRow,
  nullable,
  optional,
  toLocalRecordRow,
} from '@/data/local-sqlite/mappers/mapper-utils'

export function fromLocalLoanRow(row: LocalLoanRow): Loan {
  return {
    ...fromLocalRecordRow(row),
    counterparty: optional(row.counterparty),
    dueDate: optional(row.due_date),
    interestRate: optional(row.interest_rate),
    linkedTransactionId: optional(row.linked_transaction_id),
    name: row.name,
    notes: optional(row.notes),
    outstandingAmount: row.outstanding_amount,
    principalAmount: row.principal_amount,
    receivingAccountId: optional(row.receiving_account_id),
    sourceAccountId: optional(row.source_account_id),
    status: row.status,
    type: row.type,
  }
}

export function toLocalLoanRow(
  loan: Loan,
  context: { householdId: string; userId?: string },
): LocalLoanRow {
  return {
    ...toLocalRecordRow(loan, context),
    counterparty: nullable(loan.counterparty),
    due_date: nullable(loan.dueDate),
    interest_rate: nullable(loan.interestRate),
    linked_transaction_id: nullable(loan.linkedTransactionId),
    name: loan.name,
    notes: nullable(loan.notes),
    outstanding_amount: loan.outstandingAmount,
    principal_amount: loan.principalAmount,
    receiving_account_id: nullable(loan.receivingAccountId),
    source_account_id: nullable(loan.sourceAccountId),
    status: loan.status,
    type: loan.type,
  }
}
