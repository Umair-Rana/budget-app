import type {
  LoanPaymentResult,
  LoansRepositoryContract,
} from '@/data/contracts'
import { withCurrentLoanStatus } from '@/data/domain/loan-calculations'
import type {
  CreateLoanInput,
  Loan,
  RecordLoanPaymentInput,
  UpdateLoanInput,
} from '@/data/models/loan'
import { createRecordId, createTimestamp } from '@/data/models/common'
import { RepositoryRecordNotFoundError } from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import { fromSupabaseLoanRow } from '@/data/supabase/mappers/loan-mapper'
import { fromSupabaseTransactionRow } from '@/data/supabase/mappers/transaction-mapper'
import { throwInactiveSupabaseFinanceRepository } from '@/data/supabase/repositories/inactive-supabase-repository'
import { throwSupabaseRepositoryError } from '@/data/supabase/repositories/supabase-repository-errors'
import {
  requireSupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContextInput,
} from '@/data/supabase/repositories/supabase-repository-context'
import type {
  LoanRow,
  TransactionRow,
} from '@/data/supabase/supabase-finance-types'
import type { Database } from '@/lib/supabase/database.types'

type LoanTableRow = Database['public']['Tables']['loans']['Row']

type SupabaseRpcResult = {
  data: unknown
  error: unknown
}

type SupabaseRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<SupabaseRpcResult>
}

type LoanPaymentRpcPayload = {
  loan?: unknown
  transaction?: unknown
}

function mapLoanRow(row: LoanTableRow): Loan {
  return withCurrentLoanStatus(fromSupabaseLoanRow(row as LoanRow))
}

function todayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function normalizeOptional(value: string | undefined) {
  const normalized = value?.trim()

  return normalized ? normalized : undefined
}

function mergeLoanInput(current: Loan, input: UpdateLoanInput): CreateLoanInput {
  return {
    name: input.name ?? current.name,
    type: input.type ?? current.type,
    counterparty:
      'counterparty' in input ? input.counterparty : current.counterparty,
    principalAmount: input.principalAmount ?? current.principalAmount,
    interestRate:
      'interestRate' in input ? input.interestRate : current.interestRate,
    dueDate: 'dueDate' in input ? input.dueDate : current.dueDate,
    sourceAccountId:
      'sourceAccountId' in input
        ? input.sourceAccountId
        : current.sourceAccountId,
    receivingAccountId:
      'receivingAccountId' in input
        ? input.receivingAccountId
        : current.receivingAccountId,
    notes: 'notes' in input ? input.notes : current.notes,
  }
}

function normalizeRpcLoanData(operation: string, data: unknown): LoanTableRow {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') {
    throwSupabaseRepositoryError(operation, {
      message: 'No loan row was returned.',
    })
  }

  return row as LoanTableRow
}

function normalizeRpcLoanPaymentData(
  operation: string,
  data: unknown,
): LoanPaymentResult {
  const payload = data as LoanPaymentRpcPayload

  if (
    !payload ||
    typeof payload !== 'object' ||
    !payload.loan ||
    !payload.transaction
  ) {
    throwSupabaseRepositoryError(operation, {
      message: 'No loan payment payload was returned.',
    })
  }

  return {
    loan: mapLoanRow(payload.loan as LoanTableRow),
    transaction: fromSupabaseTransactionRow(
      payload.transaction as TransactionRow,
    ),
  }
}

async function callLoanRpc(
  context: SupabaseFinanceRepositoryContext,
  operation: string,
  functionName: string,
  args: Record<string, unknown>,
) {
  const rpcClient = context.client as unknown as SupabaseRpcClient
  const { data, error } = await rpcClient.rpc(functionName, args)

  if (error) {
    throwSupabaseRepositoryError(operation, error)
  }

  return mapLoanRow(normalizeRpcLoanData(operation, data))
}

async function callLoanPaymentRpc(
  context: SupabaseFinanceRepositoryContext,
  operation: string,
  functionName: string,
  args: Record<string, unknown>,
) {
  const rpcClient = context.client as unknown as SupabaseRpcClient
  const { data, error } = await rpcClient.rpc(functionName, args)

  if (error) {
    throwSupabaseRepositoryError(operation, error)
  }

  return normalizeRpcLoanPaymentData(operation, data)
}

async function getSupabaseLoanById(
  context: SupabaseFinanceRepositoryContext,
  id: string,
  options?: RepositoryListOptions,
) {
  let query = context.client
    .from('loans')
    .select('*')
    .eq('household_id', context.householdId)
    .eq('id', id)

  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null)
  }

  if (!options?.includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throwSupabaseRepositoryError('loans.getById', error)
  }

  return data ? mapLoanRow(data) : undefined
}

async function requireSupabaseLoan(
  context: SupabaseFinanceRepositoryContext,
  id: string,
) {
  const loan = await getSupabaseLoanById(context, id, {
    includeArchived: true,
    includeDeleted: true,
  })

  if (!loan) {
    throw new RepositoryRecordNotFoundError('Loan', id)
  }

  return loan
}

export const supabaseLoansRepository = {
  async getAll() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getById() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async create() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async update() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async archive() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async deleteSoft() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async recordPayment() {
    return throwInactiveSupabaseFinanceRepository()
  },
} satisfies LoansRepositoryContract

export function createSupabaseLoansRepository(
  input: SupabaseFinanceRepositoryContextInput,
): LoansRepositoryContract {
  const context = requireSupabaseFinanceRepositoryContext(input)

  return {
    async getAll(options?: RepositoryListOptions) {
      let query = context.client
        .from('loans')
        .select('*')
        .eq('household_id', context.householdId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })

      if (error) {
        throwSupabaseRepositoryError('loans.getAll', error)
      }

      return (data ?? []).map(mapLoanRow)
    },

    async getById(id: string, options?: RepositoryListOptions) {
      return getSupabaseLoanById(context, id, options)
    },

    async create(input: CreateLoanInput) {
      const now = createTimestamp()

      return callLoanRpc(context, 'loans.create', 'create_finance_loan', {
        p_household_id: context.householdId,
        p_loan_id: createRecordId(),
        p_transaction_id: createRecordId(),
        p_name: input.name,
        p_type: input.type,
        p_counterparty: normalizeOptional(input.counterparty) ?? null,
        p_principal_amount: input.principalAmount,
        p_interest_rate: input.interestRate ?? null,
        p_due_date: normalizeOptional(input.dueDate) ?? null,
        p_source_account_id:
          input.type === 'given' ? input.sourceAccountId : null,
        p_receiving_account_id:
          input.type === 'taken' ? input.receivingAccountId : null,
        p_notes: normalizeNotes(input.notes) ?? null,
        p_opened_date: todayInputValue(),
        p_created_at: now,
        p_updated_at: now,
      })
    },

    async update(id: string, input: UpdateLoanInput) {
      const current = await requireSupabaseLoan(context, id)
      const merged = mergeLoanInput(current, input)

      return callLoanRpc(context, 'loans.update', 'update_finance_loan', {
        p_household_id: context.householdId,
        p_loan_id: id,
        p_name: merged.name,
        p_type: merged.type,
        p_counterparty: normalizeOptional(merged.counterparty) ?? null,
        p_principal_amount: merged.principalAmount,
        p_interest_rate: merged.interestRate ?? null,
        p_due_date: normalizeOptional(merged.dueDate) ?? null,
        p_source_account_id:
          merged.type === 'given' ? merged.sourceAccountId : null,
        p_receiving_account_id:
          merged.type === 'taken' ? merged.receivingAccountId : null,
        p_notes: normalizeNotes(merged.notes) ?? null,
        p_updated_at: createTimestamp(),
      })
    },

    async archive(id: string) {
      return callLoanRpc(context, 'loans.archive', 'archive_finance_loan', {
        p_household_id: context.householdId,
        p_loan_id: id,
        p_updated_at: createTimestamp(),
      })
    },

    async deleteSoft(id: string) {
      return callLoanRpc(
        context,
        'loans.deleteSoft',
        'delete_finance_loan_soft',
        {
          p_household_id: context.householdId,
          p_loan_id: id,
          p_updated_at: createTimestamp(),
        },
      )
    },

    async recordPayment(id: string, input: RecordLoanPaymentInput) {
      return callLoanPaymentRpc(
        context,
        'loans.recordPayment',
        'record_finance_loan_payment',
        {
          p_household_id: context.householdId,
          p_loan_id: id,
          p_transaction_id: createRecordId(),
          p_amount: input.amount,
          p_account_id: input.accountId,
          p_date: input.date,
          p_notes: normalizeNotes(input.notes) ?? null,
          p_updated_at: createTimestamp(),
        },
      )
    },
  }
}
