import type { TransactionsRepositoryContract } from '@/data/contracts'
import {
  createTransactionDateTime,
  normalizeTransactionTime,
} from '@/data/domain/transaction-datetime'
import { isLinkedTransaction } from '@/data/domain/linked-transaction'
import { createRecordId, createTimestamp } from '@/data/models/common'
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
} from '@/data/models/transaction'
import {
  RepositoryError,
  RepositoryRecordNotFoundError,
} from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import {
  fromSupabaseTransactionRow,
} from '@/data/supabase/mappers/transaction-mapper'
import { linkedSourceFromIds } from '@/data/supabase/mappers/mapper-utils'
import { throwInactiveSupabaseFinanceRepository } from '@/data/supabase/repositories/inactive-supabase-repository'
import { throwSupabaseRepositoryError } from '@/data/supabase/repositories/supabase-repository-errors'
import {
  requireSupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContextInput,
} from '@/data/supabase/repositories/supabase-repository-context'
import type { TransactionRow } from '@/data/supabase/supabase-finance-types'
import type { Database } from '@/lib/supabase/database.types'

type TransactionTableRow = Database['public']['Tables']['transactions']['Row']

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

function mapTransactionRow(row: TransactionTableRow): Transaction {
  return fromSupabaseTransactionRow(row as TransactionRow)
}

function assertEditableStandaloneTransaction(transaction: Transaction) {
  if (isLinkedTransaction(transaction)) {
    throw new RepositoryError(
      'Linked transactions cannot be changed from the Transactions page.',
    )
  }

  if (transaction.archivedAt || transaction.deletedAt) {
    throw new RepositoryError('Archived or deleted transactions cannot be edited.')
  }
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function sanitizeTransactionInput(
  input: CreateTransactionInput,
): CreateTransactionInput {
  const normalizedTime = normalizeTransactionTime(input.time)
  const base = {
    type: input.type,
    amount: input.amount,
    date: input.date,
    time: normalizedTime,
    transactionDateTime:
      createTransactionDateTime(input.date, normalizedTime) ??
      input.transactionDateTime,
    notes: normalizeNotes(input.notes),
    linkedBillId: input.linkedBillId,
    linkedGoalId: input.linkedGoalId,
    linkedLoanId: input.linkedLoanId,
    idempotencyKey: input.idempotencyKey,
  }

  if (input.type === 'income') {
    return {
      ...base,
      categoryId: input.categoryId,
      toAccountId: input.toAccountId,
    }
  }

  if (input.type === 'expense') {
    return {
      ...base,
      categoryId: input.categoryId,
      fromAccountId: input.fromAccountId,
    }
  }

  if (input.type === 'transfer') {
    return {
      ...base,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
    }
  }

  return {
    ...base,
    categoryId: input.categoryId,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
  }
}

function createTransactionRecord(
  input: CreateTransactionInput,
): Transaction {
  const now = createTimestamp()
  const sanitizedInput = sanitizeTransactionInput(input)

  return {
    id: createRecordId(),
    type: sanitizedInput.type,
    amount: sanitizedInput.amount,
    categoryId: sanitizedInput.categoryId,
    fromAccountId: sanitizedInput.fromAccountId,
    toAccountId: sanitizedInput.toAccountId,
    date: sanitizedInput.date,
    time: sanitizedInput.time,
    transactionDateTime: sanitizedInput.transactionDateTime,
    notes: sanitizedInput.notes,
    linkedBillId: sanitizedInput.linkedBillId,
    linkedGoalId: sanitizedInput.linkedGoalId,
    linkedLoanId: sanitizedInput.linkedLoanId,
    createdAt: now,
    updatedAt: now,
  }
}

function mergeTransactionInput(
  current: Transaction,
  input: UpdateTransactionInput,
): CreateTransactionInput {
  return {
    type: input.type ?? current.type,
    amount: input.amount ?? current.amount,
    categoryId: 'categoryId' in input ? input.categoryId : current.categoryId,
    fromAccountId:
      'fromAccountId' in input ? input.fromAccountId : current.fromAccountId,
    toAccountId: 'toAccountId' in input ? input.toAccountId : current.toAccountId,
    date: input.date ?? current.date,
    time: 'time' in input ? input.time : current.time,
    transactionDateTime:
      'transactionDateTime' in input
        ? input.transactionDateTime
        : current.transactionDateTime,
    notes: 'notes' in input ? input.notes : current.notes,
    linkedBillId:
      'linkedBillId' in input ? input.linkedBillId : current.linkedBillId,
    linkedGoalId:
      'linkedGoalId' in input ? input.linkedGoalId : current.linkedGoalId,
    linkedLoanId:
      'linkedLoanId' in input ? input.linkedLoanId : current.linkedLoanId,
  }
}

function updateTransactionRecord(
  current: Transaction,
  input: UpdateTransactionInput,
): Transaction {
  const mergedInput = mergeTransactionInput(current, input)
  const nextRecord = createTransactionRecord(mergedInput)

  return {
    ...current,
    type: nextRecord.type,
    amount: nextRecord.amount,
    categoryId: nextRecord.categoryId,
    fromAccountId: nextRecord.fromAccountId,
    toAccountId: nextRecord.toAccountId,
    date: nextRecord.date,
    time: nextRecord.time,
    transactionDateTime: nextRecord.transactionDateTime,
    notes: nextRecord.notes,
    linkedBillId: nextRecord.linkedBillId,
    linkedGoalId: nextRecord.linkedGoalId,
    linkedLoanId: nextRecord.linkedLoanId,
    updatedAt: createTimestamp(),
  }
}

async function getSupabaseTransactionById(
  context: SupabaseFinanceRepositoryContext,
  id: string,
  options?: RepositoryListOptions,
) {
  let query = context.client
    .from('transactions')
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
    throwSupabaseRepositoryError('transactions.getById', error)
  }

  return data ? mapTransactionRow(data) : undefined
}

async function requireSupabaseTransaction(
  context: SupabaseFinanceRepositoryContext,
  id: string,
) {
  const transaction = await getSupabaseTransactionById(context, id, {
    includeArchived: true,
    includeDeleted: true,
  })

  if (!transaction) {
    throw new RepositoryRecordNotFoundError('Transaction', id)
  }

  return transaction
}

function normalizeRpcTransactionData(
  operation: string,
  data: unknown,
): TransactionTableRow {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') {
    throwSupabaseRepositoryError(operation, {
      message: 'No transaction row was returned.',
    })
  }

  return row as TransactionTableRow
}

async function callTransactionRpc(
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

  return mapTransactionRow(normalizeRpcTransactionData(operation, data))
}

function transactionRpcArgs(
  context: SupabaseFinanceRepositoryContext,
  transaction: Transaction,
) {
  const linkedSource = linkedSourceFromIds(transaction)

  return {
    p_household_id: context.householdId,
    p_transaction_id: transaction.id,
    p_type: transaction.type,
    p_amount: transaction.amount,
    p_date: transaction.date,
    p_time: transaction.time ?? null,
    p_transaction_datetime: transaction.transactionDateTime ?? null,
    p_category_id: transaction.categoryId ?? null,
    p_from_account_id: transaction.fromAccountId ?? null,
    p_to_account_id: transaction.toAccountId ?? null,
    p_notes: transaction.notes ?? null,
    p_linked_bill_id: transaction.linkedBillId ?? null,
    p_linked_goal_id: transaction.linkedGoalId ?? null,
    p_linked_loan_id: transaction.linkedLoanId ?? null,
    p_linked_source_type: linkedSource.linked_source_type,
    p_linked_source_id: linkedSource.linked_source_id,
  }
}

export const supabaseTransactionsRepository = {
  async getAll() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getById() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getByType() {
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
} satisfies TransactionsRepositoryContract

export function createSupabaseTransactionsRepository(
  input: SupabaseFinanceRepositoryContextInput,
): TransactionsRepositoryContract {
  const context = requireSupabaseFinanceRepositoryContext(input)

  return {
    async getAll(options?: RepositoryListOptions) {
      let query = context.client
        .from('transactions')
        .select('*')
        .eq('household_id', context.householdId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query
        .order('transaction_datetime', {
          ascending: false,
          nullsFirst: false,
        })
        .order('date', { ascending: false })
        .order('time', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {
        throwSupabaseRepositoryError('transactions.getAll', error)
      }

      return (data ?? []).map(mapTransactionRow)
    },

    async getById(id: string, options?: RepositoryListOptions) {
      return getSupabaseTransactionById(context, id, options)
    },

    async getByType(type: TransactionType, options?: RepositoryListOptions) {
      let query = context.client
        .from('transactions')
        .select('*')
        .eq('household_id', context.householdId)
        .eq('type', type)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query
        .order('transaction_datetime', {
          ascending: false,
          nullsFirst: false,
        })
        .order('date', { ascending: false })
        .order('time', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {
        throwSupabaseRepositoryError('transactions.getByType', error)
      }

      return (data ?? []).map(mapTransactionRow)
    },

    async create(input: CreateTransactionInput) {
      const transaction = createTransactionRecord(input)

      return callTransactionRpc(
        context,
        'transactions.create',
        'create_finance_transaction',
        {
          ...transactionRpcArgs(context, transaction),
          p_created_at: transaction.createdAt,
          p_updated_at: transaction.updatedAt,
          p_idempotency_key: input.idempotencyKey ?? null,
        },
      )
    },

    async update(id: string, input: UpdateTransactionInput) {
      const current = await requireSupabaseTransaction(context, id)
      const updated = updateTransactionRecord(current, input)

      assertEditableStandaloneTransaction(current)

      return callTransactionRpc(
        context,
        'transactions.update',
        'update_finance_transaction',
        {
          ...transactionRpcArgs(context, updated),
          p_allow_linked: false,
          p_updated_at: updated.updatedAt,
        },
      )
    },

    async archive(id: string) {
      const now = createTimestamp()

      return callTransactionRpc(
        context,
        'transactions.archive',
        'archive_finance_transaction',
        {
          p_household_id: context.householdId,
          p_transaction_id: id,
          p_allow_linked: false,
          p_updated_at: now,
        },
      )
    },

    async deleteSoft(id: string) {
      const now = createTimestamp()

      return callTransactionRpc(
        context,
        'transactions.deleteSoft',
        'delete_finance_transaction_soft',
        {
          p_household_id: context.householdId,
          p_transaction_id: id,
          p_allow_linked: false,
          p_updated_at: now,
        },
      )
    },
  }
}
