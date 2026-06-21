import type { Loan, UpdateLoanInput } from '@/data/models/loan'
import type {
  LoanInsertRow,
  LoanRow,
  LoanUpdateRow,
  SupabaseFinanceMapperContext,
} from '@/data/supabase/supabase-finance-types'
import {
  nullable,
  optional,
  toSupabaseRecordFields,
  toSupabaseUpdateMetadata,
} from '@/data/supabase/mappers/mapper-utils'

export function fromSupabaseLoanRow(row: LoanRow): Loan {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    counterparty: optional(row.counterparty),
    principalAmount: row.principal_amount,
    outstandingAmount: row.outstanding_amount,
    interestRate: optional(row.interest_rate),
    dueDate: optional(row.due_date),
    status: row.status,
    sourceAccountId: optional(row.source_account_id),
    receivingAccountId: optional(row.receiving_account_id),
    linkedTransactionId: optional(row.linked_transaction_id),
    notes: optional(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: optional(row.archived_at),
    deletedAt: optional(row.deleted_at),
  }
}

export function toSupabaseLoanInsert(
  loan: Loan,
  context: SupabaseFinanceMapperContext,
): LoanInsertRow {
  return {
    ...toSupabaseRecordFields(loan, context),
    name: loan.name,
    type: loan.type,
    counterparty: nullable(loan.counterparty),
    principal_amount: loan.principalAmount,
    outstanding_amount: loan.outstandingAmount,
    interest_rate: nullable(loan.interestRate),
    due_date: nullable(loan.dueDate),
    status: loan.status,
    source_account_id: nullable(loan.sourceAccountId),
    receiving_account_id: nullable(loan.receivingAccountId),
    linked_transaction_id: nullable(loan.linkedTransactionId),
    notes: nullable(loan.notes),
  }
}

export function toSupabaseLoanUpdate(
  input: UpdateLoanInput,
  context: Pick<SupabaseFinanceMapperContext, 'now' | 'userId'>,
): LoanUpdateRow {
  const update: LoanUpdateRow = toSupabaseUpdateMetadata(context)

  if ('name' in input) {
    update.name = input.name
  }

  if ('type' in input) {
    update.type = input.type
  }

  if ('counterparty' in input) {
    update.counterparty = nullable(input.counterparty)
  }

  if ('principalAmount' in input) {
    update.principal_amount = input.principalAmount
  }

  if ('interestRate' in input) {
    update.interest_rate = nullable(input.interestRate)
  }

  if ('dueDate' in input) {
    update.due_date = nullable(input.dueDate)
  }

  if ('sourceAccountId' in input) {
    update.source_account_id = nullable(input.sourceAccountId)
  }

  if ('receivingAccountId' in input) {
    update.receiving_account_id = nullable(input.receivingAccountId)
  }

  if ('notes' in input) {
    update.notes = nullable(input.notes)
  }

  return update
}
