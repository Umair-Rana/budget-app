import type { BillsRepositoryContract } from '@/data/contracts'
import type {
  Bill,
  CreateBillInput,
  MarkBillPaidInput,
  UpdateBillInput,
} from '@/data/models/bill'
import { createRecordId, createTimestamp } from '@/data/models/common'
import { RepositoryRecordNotFoundError } from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import { fromSupabaseBillRow } from '@/data/supabase/mappers/bill-mapper'
import { throwInactiveSupabaseFinanceRepository } from '@/data/supabase/repositories/inactive-supabase-repository'
import { throwSupabaseRepositoryError } from '@/data/supabase/repositories/supabase-repository-errors'
import {
  requireSupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContextInput,
} from '@/data/supabase/repositories/supabase-repository-context'
import type { BillRow } from '@/data/supabase/supabase-finance-types'
import type { Database } from '@/lib/supabase/database.types'

type BillTableRow = Database['public']['Tables']['bills']['Row']

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

function mapBillRow(row: BillTableRow): Bill {
  return withCurrentBillStatus(fromSupabaseBillRow(row as BillRow))
}

function todayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function daysFromToday(date: string) {
  const today = new Date(`${todayDateString()}T00:00:00`)
  const target = new Date(`${date}T00:00:00`)
  const dayMs = 24 * 60 * 60 * 1000

  return Math.floor((target.getTime() - today.getTime()) / dayMs)
}

function unpaidStatusForDueDate(dueDate: string): Bill['status'] {
  const daysUntilDue = daysFromToday(dueDate)

  if (daysUntilDue < 0) {
    return 'overdue'
  }

  if (daysUntilDue <= 2) {
    return 'pending'
  }

  return 'upcoming'
}

function withCurrentBillStatus(bill: Bill): Bill {
  if (bill.status === 'paid') {
    return bill
  }

  return {
    ...bill,
    status: unpaidStatusForDueDate(bill.dueDate),
  }
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function mergeBillInput(current: Bill, input: UpdateBillInput): CreateBillInput {
  return {
    name: input.name ?? current.name,
    amount: input.amount ?? current.amount,
    categoryId: input.categoryId ?? current.categoryId,
    dueDate: input.dueDate ?? current.dueDate,
    frequency: input.frequency ?? current.frequency,
    notes: 'notes' in input ? input.notes : current.notes,
  }
}

function normalizeRpcBillData(operation: string, data: unknown): BillTableRow {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') {
    throwSupabaseRepositoryError(operation, {
      message: 'No bill row was returned.',
    })
  }

  return row as BillTableRow
}

async function callBillRpc(
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

  return mapBillRow(normalizeRpcBillData(operation, data))
}

async function getSupabaseBillById(
  context: SupabaseFinanceRepositoryContext,
  id: string,
  options?: RepositoryListOptions,
) {
  let query = context.client
    .from('bills')
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
    throwSupabaseRepositoryError('bills.getById', error)
  }

  return data ? mapBillRow(data) : undefined
}

async function requireSupabaseBill(
  context: SupabaseFinanceRepositoryContext,
  id: string,
) {
  const bill = await getSupabaseBillById(context, id, {
    includeArchived: true,
    includeDeleted: true,
  })

  if (!bill) {
    throw new RepositoryRecordNotFoundError('Bill', id)
  }

  return bill
}

export const supabaseBillsRepository = {
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
  async markPaid() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async markUnpaid() {
    return throwInactiveSupabaseFinanceRepository()
  },
} satisfies BillsRepositoryContract

export function createSupabaseBillsRepository(
  input: SupabaseFinanceRepositoryContextInput,
): BillsRepositoryContract {
  const context = requireSupabaseFinanceRepositoryContext(input)

  return {
    async getAll(options?: RepositoryListOptions) {
      let query = context.client
        .from('bills')
        .select('*')
        .eq('household_id', context.householdId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query
        .order('due_date', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        throwSupabaseRepositoryError('bills.getAll', error)
      }

      return (data ?? []).map(mapBillRow)
    },

    async getById(id: string, options?: RepositoryListOptions) {
      return getSupabaseBillById(context, id, options)
    },

    async create(input: CreateBillInput) {
      const now = createTimestamp()

      return callBillRpc(context, 'bills.create', 'create_finance_bill', {
        p_household_id: context.householdId,
        p_bill_id: createRecordId(),
        p_name: input.name,
        p_amount: input.amount,
        p_category_id: input.categoryId,
        p_due_date: input.dueDate,
        p_frequency: input.frequency,
        p_notes: normalizeNotes(input.notes) ?? null,
        p_created_at: now,
        p_updated_at: now,
      })
    },

    async update(id: string, input: UpdateBillInput) {
      const current = await requireSupabaseBill(context, id)
      const merged = mergeBillInput(current, input)

      return callBillRpc(context, 'bills.update', 'update_finance_bill', {
        p_household_id: context.householdId,
        p_bill_id: id,
        p_name: merged.name,
        p_amount: merged.amount,
        p_category_id: merged.categoryId,
        p_due_date: merged.dueDate,
        p_frequency: merged.frequency,
        p_notes: normalizeNotes(merged.notes) ?? null,
        p_updated_at: createTimestamp(),
      })
    },

    async archive(id: string) {
      return callBillRpc(context, 'bills.archive', 'archive_finance_bill', {
        p_household_id: context.householdId,
        p_bill_id: id,
        p_updated_at: createTimestamp(),
      })
    },

    async deleteSoft(id: string) {
      return callBillRpc(
        context,
        'bills.deleteSoft',
        'delete_finance_bill_soft',
        {
          p_household_id: context.householdId,
          p_bill_id: id,
          p_updated_at: createTimestamp(),
        },
      )
    },

    async markPaid(id: string, input: MarkBillPaidInput) {
      return callBillRpc(context, 'bills.markPaid', 'mark_finance_bill_paid', {
        p_household_id: context.householdId,
        p_bill_id: id,
        p_transaction_id: createRecordId(),
        p_payment_account_id: input.paymentAccountId,
        p_payment_date: input.paymentDate,
        p_notes: normalizeNotes(input.notes) ?? null,
        p_updated_at: createTimestamp(),
      })
    },

    async markUnpaid(id: string) {
      return callBillRpc(
        context,
        'bills.markUnpaid',
        'mark_finance_bill_unpaid',
        {
          p_household_id: context.householdId,
          p_bill_id: id,
          p_updated_at: createTimestamp(),
        },
      )
    },
  }
}
