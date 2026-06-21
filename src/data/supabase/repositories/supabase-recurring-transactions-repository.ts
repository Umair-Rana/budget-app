import type { RecurringTransactionsRepositoryContract } from '@/data/contracts'
import {
  calculateNextRunDate,
  getTodayDateString,
  isRecurringTransactionDue,
  mergeRecurringTransactionInput,
  sanitizeRecurringTransactionInput,
  transactionInputFromRecurring,
  validateRecurringTransactionInput,
} from '@/data/domain/recurring-transactions'
import { createRecordId, createTimestamp } from '@/data/models/common'
import type {
  CreateRecurringTransactionInput,
  GenerateRecurringTransactionsResult,
  RecurringTransaction,
  UpdateRecurringTransactionInput,
} from '@/data/models/recurring-transaction'
import {
  RepositoryError,
  RepositoryRecordNotFoundError,
} from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import {
  fromSupabaseRecurringTransactionRow,
  toSupabaseRecurringTransactionInsert,
  toSupabaseRecurringTransactionUpdate,
} from '@/data/supabase/mappers/recurring-transaction-mapper'
import { throwInactiveSupabaseFinanceRepository } from '@/data/supabase/repositories/inactive-supabase-repository'
import { throwSupabaseRepositoryError } from '@/data/supabase/repositories/supabase-repository-errors'
import {
  requireSupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContextInput,
} from '@/data/supabase/repositories/supabase-repository-context'
import { createSupabaseTransactionsRepository } from '@/data/supabase/repositories/supabase-transactions-repository'
import type { RecurringTransactionRow } from '@/data/supabase/supabase-finance-types'
import type { Database } from '@/lib/supabase/database.types'

type RecurringTransactionTableRow =
  Database['public']['Tables']['recurring_transactions']['Row']
type RecurringTransactionTableInsert =
  Database['public']['Tables']['recurring_transactions']['Insert']
type RecurringTransactionTableUpdate =
  Database['public']['Tables']['recurring_transactions']['Update']

function mapRecurringTransactionRow(
  row: RecurringTransactionTableRow,
): RecurringTransaction {
  return fromSupabaseRecurringTransactionRow(row as RecurringTransactionRow)
}

function createRecurringTransactionRecord(
  input: CreateRecurringTransactionInput,
): RecurringTransaction {
  const now = createTimestamp()
  const values = validateRecurringTransactionInput(input)

  return {
    id: createRecordId(),
    type: values.type,
    name: values.name,
    amount: values.amount,
    categoryId: values.categoryId,
    fromAccountId: values.fromAccountId,
    toAccountId: values.toAccountId,
    frequency: values.frequency,
    interval: values.interval,
    startDate: values.startDate,
    nextRunDate: values.nextRunDate,
    endDate: values.endDate,
    isActive: values.isActive ?? true,
    notes: values.notes,
    createdAt: now,
    updatedAt: now,
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

async function getSupabaseRecurringTransactionById(
  context: SupabaseFinanceRepositoryContext,
  id: string,
  options?: RepositoryListOptions,
) {
  let query = context.client
    .from('recurring_transactions')
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
    throwSupabaseRepositoryError('recurringTransactions.getById', error)
  }

  return data ? mapRecurringTransactionRow(data) : undefined
}

async function requireSupabaseRecurringTransaction(
  context: SupabaseFinanceRepositoryContext,
  id: string,
) {
  const recurringTransaction = await getSupabaseRecurringTransactionById(
    context,
    id,
    {
      includeArchived: true,
      includeDeleted: true,
    },
  )

  if (!recurringTransaction) {
    throw new RepositoryRecordNotFoundError('Recurring transaction', id)
  }

  return recurringTransaction
}

async function assertActiveCategoryForType(
  context: SupabaseFinanceRepositoryContext,
  recurringTransaction: CreateRecurringTransactionInput,
) {
  if (recurringTransaction.type === 'transfer') {
    return
  }

  if (!recurringTransaction.categoryId) {
    throw new RepositoryError('Category is required.')
  }

  const { data, error } = await context.client
    .from('categories')
    .select('id, type, archived_at, deleted_at')
    .eq('household_id', context.householdId)
    .eq('id', recurringTransaction.categoryId)
    .maybeSingle()

  if (error) {
    throwSupabaseRepositoryError(
      'recurringTransactions.categoryCheck',
      error,
    )
  }

  if (!data || data.archived_at || data.deleted_at) {
    throw new RepositoryError('Selected category is not available.')
  }

  if (data.type !== recurringTransaction.type) {
    throw new RepositoryError(
      `Selected category must be a ${recurringTransaction.type} category.`,
    )
  }
}

export const supabaseRecurringTransactionsRepository = {
  async getAll() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getById() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getDue() {
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
  async generateDue() {
    return throwInactiveSupabaseFinanceRepository()
  },
} satisfies RecurringTransactionsRepositoryContract

export function createSupabaseRecurringTransactionsRepository(
  input: SupabaseFinanceRepositoryContextInput,
): RecurringTransactionsRepositoryContract {
  const context = requireSupabaseFinanceRepositoryContext(input)
  const transactionsRepository = createSupabaseTransactionsRepository(input)

  return {
    async getAll(options?: RepositoryListOptions) {
      let query = context.client
        .from('recurring_transactions')
        .select('*')
        .eq('household_id', context.householdId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query
        .order('next_run_date', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        throwSupabaseRepositoryError('recurringTransactions.getAll', error)
      }

      return (data ?? []).map(mapRecurringTransactionRow)
    },

    async getById(id: string, options?: RepositoryListOptions) {
      return getSupabaseRecurringTransactionById(context, id, options)
    },

    async getDue(asOfDate = getTodayDateString()) {
      const query = context.client
        .from('recurring_transactions')
        .select('*')
        .eq('household_id', context.householdId)
        .eq('is_active', true)
        .is('archived_at', null)
        .is('deleted_at', null)
        .lte('next_run_date', asOfDate)

      const { data, error } = await query.order('next_run_date', {
        ascending: true,
      })

      if (error) {
        throwSupabaseRepositoryError('recurringTransactions.getDue', error)
      }

      return (data ?? [])
        .map(mapRecurringTransactionRow)
        .filter((recurringTransaction) =>
          isRecurringTransactionDue(recurringTransaction, asOfDate),
        )
    },

    async create(input: CreateRecurringTransactionInput) {
      const recurringTransaction = createRecurringTransactionRecord(input)

      await assertActiveCategoryForType(context, recurringTransaction)

      const insert = toSupabaseRecurringTransactionInsert(
        recurringTransaction,
        {
          householdId: context.householdId,
          userId: context.userId,
        },
      ) as RecurringTransactionTableInsert

      const { data, error } = await context.client
        .from('recurring_transactions')
        .insert(insert)
        .select()
        .single()

      if (error) {
        throwSupabaseRepositoryError('recurringTransactions.create', error)
      }

      if (!data) {
        throwSupabaseRepositoryError('recurringTransactions.create', {
          message: 'No recurring transaction row was returned.',
        })
      }

      return mapRecurringTransactionRow(data)
    },

    async update(id: string, input: UpdateRecurringTransactionInput) {
      const current = await requireSupabaseRecurringTransaction(context, id)

      if (current.archivedAt || current.deletedAt) {
        throw new RepositoryError(
          'Archived or deleted recurring transactions cannot be edited.',
        )
      }

      const merged = sanitizeRecurringTransactionInput(
        mergeRecurringTransactionInput(current, input),
      )

      validateRecurringTransactionInput(merged)
      await assertActiveCategoryForType(context, merged)

      const update = toSupabaseRecurringTransactionUpdate(merged, {
        userId: context.userId,
        now: createTimestamp(),
      }) as RecurringTransactionTableUpdate

      const { data, error } = await context.client
        .from('recurring_transactions')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throwSupabaseRepositoryError('recurringTransactions.update', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Recurring transaction', id)
      }

      return mapRecurringTransactionRow(data)
    },

    async archive(id: string) {
      const current = await requireSupabaseRecurringTransaction(context, id)
      const now = createTimestamp()
      const update: RecurringTransactionTableUpdate = {
        archived_at: current.archivedAt ?? now,
        is_active: false,
        updated_at: now,
        updated_by: context.userId,
      }

      const { data, error } = await context.client
        .from('recurring_transactions')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throwSupabaseRepositoryError('recurringTransactions.archive', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Recurring transaction', id)
      }

      return mapRecurringTransactionRow(data)
    },

    async deleteSoft(id: string) {
      const current = await requireSupabaseRecurringTransaction(context, id)
      const now = createTimestamp()
      const update: RecurringTransactionTableUpdate = {
        deleted_at: current.deletedAt ?? now,
        is_active: false,
        updated_at: now,
        updated_by: context.userId,
      }

      const { data, error } = await context.client
        .from('recurring_transactions')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throwSupabaseRepositoryError('recurringTransactions.deleteSoft', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Recurring transaction', id)
      }

      return mapRecurringTransactionRow(data)
    },

    async generateDue(asOfDate = getTodayDateString()) {
      const result: GenerateRecurringTransactionsResult = {
        generatedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        generated: [],
        skipped: [],
        failed: [],
      }
      const dueRecurringTransactions = await this.getDue(asOfDate)

      for (const recurringTransaction of dueRecurringTransactions) {
        const scheduledDate = recurringTransaction.nextRunDate

        if (
          recurringTransaction.lastGeneratedForDate &&
          recurringTransaction.lastGeneratedForDate === scheduledDate
        ) {
          result.skippedCount += 1
          result.skipped.push({
            recurringTransactionId: recurringTransaction.id,
            reason: 'Already generated for this scheduled date.',
            scheduledDate,
          })
          continue
        }

        try {
          const transaction = await transactionsRepository.create(
            transactionInputFromRecurring(recurringTransaction, scheduledDate),
          )
          const now = createTimestamp()
          const nextRunDate = calculateNextRunDate(
            scheduledDate,
            recurringTransaction.frequency,
            recurringTransaction.interval,
          )
          const remainsActive =
            !recurringTransaction.endDate ||
            nextRunDate <= recurringTransaction.endDate
          const update: RecurringTransactionTableUpdate = {
            next_run_date: nextRunDate,
            is_active: remainsActive,
            last_generated_at: now,
            last_generated_for_date: scheduledDate,
            updated_at: now,
            updated_by: context.userId,
          }
          const { error } = await context.client
            .from('recurring_transactions')
            .update(update)
            .eq('household_id', context.householdId)
            .eq('id', recurringTransaction.id)
            .eq('next_run_date', scheduledDate)

          if (error) {
            throwSupabaseRepositoryError(
              'recurringTransactions.generateDue.updateSchedule',
              error,
            )
          }

          result.generatedCount += 1
          result.generated.push({
            recurringTransactionId: recurringTransaction.id,
            scheduledDate,
            transactionId: transaction.id,
          })
        } catch (error) {
          result.failedCount += 1
          result.failed.push({
            recurringTransactionId: recurringTransaction.id,
            message: getErrorMessage(error),
            scheduledDate,
          })
        }
      }

      return result
    },
  }
}
