import type { BudgetsRepositoryContract } from '@/data/contracts'
import type {
  BudgetAllocation,
  BudgetGroup,
  CreateBudgetAllocationInput,
  UpdateBudgetAllocationInput,
} from '@/data/models/budget'
import { createRecordId, createTimestamp } from '@/data/models/common'
import {
  RepositoryDuplicateRecordError,
  RepositoryError,
  RepositoryRecordNotFoundError,
} from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import {
  fromSupabaseBudgetRow,
  toSupabaseBudgetInsert,
  toSupabaseBudgetUpdate,
} from '@/data/supabase/mappers/budget-mapper'
import { throwInactiveSupabaseFinanceRepository } from '@/data/supabase/repositories/inactive-supabase-repository'
import {
  isSupabaseUniqueConstraintError,
  throwSupabaseRepositoryError,
} from '@/data/supabase/repositories/supabase-repository-errors'
import {
  requireSupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContextInput,
} from '@/data/supabase/repositories/supabase-repository-context'
import type { BudgetRow } from '@/data/supabase/supabase-finance-types'
import type { Database } from '@/lib/supabase/database.types'

type BudgetTableRow = Database['public']['Tables']['budgets']['Row']
type BudgetTableInsert = Database['public']['Tables']['budgets']['Insert']
type BudgetTableUpdate = Database['public']['Tables']['budgets']['Update']

const budgetGroups = ['needs', 'wants', 'savings', 'loans', 'custom'] as const

function mapBudgetRow(row: BudgetTableRow): BudgetAllocation {
  return fromSupabaseBudgetRow(row as BudgetRow)
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function isBudgetGroup(group: string): group is BudgetGroup {
  return budgetGroups.includes(group as BudgetGroup)
}

function normalizeGroup(group: BudgetGroup | undefined) {
  if (!group) {
    return undefined
  }

  if (!isBudgetGroup(group)) {
    throw new RepositoryError('Budget group is not supported.')
  }

  return group
}

function normalizeCreateInput(
  input: CreateBudgetAllocationInput,
): CreateBudgetAllocationInput {
  return {
    month: input.month.trim(),
    categoryId: input.categoryId,
    plannedAmount: input.plannedAmount,
    group: normalizeGroup(input.group),
    notes: normalizeNotes(input.notes),
  }
}

function assertMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new RepositoryError('Budget month is required.')
  }
}

function assertPlannedAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RepositoryError(
      'Budget planned amount must be greater than or equal to 0.',
    )
  }
}

function validateBudgetInput(input: CreateBudgetAllocationInput) {
  assertMonth(input.month)

  if (!input.categoryId) {
    throw new RepositoryError('Budget category is required.')
  }

  assertPlannedAmount(input.plannedAmount)
}

function createBudgetRecord(
  input: CreateBudgetAllocationInput,
): BudgetAllocation {
  const now = createTimestamp()
  const normalizedInput = normalizeCreateInput(input)

  return {
    id: createRecordId(),
    month: normalizedInput.month,
    categoryId: normalizedInput.categoryId,
    plannedAmount: normalizedInput.plannedAmount,
    group: normalizedInput.group,
    notes: normalizedInput.notes,
    createdAt: now,
    updatedAt: now,
  }
}

function mergeBudgetInput(
  current: BudgetAllocation,
  input: UpdateBudgetAllocationInput,
): CreateBudgetAllocationInput {
  return {
    month: input.month ?? current.month,
    categoryId: input.categoryId ?? current.categoryId,
    plannedAmount: input.plannedAmount ?? current.plannedAmount,
    group: 'group' in input ? input.group : current.group,
    notes: 'notes' in input ? input.notes : current.notes,
  }
}

async function getSupabaseBudgetById(
  context: SupabaseFinanceRepositoryContext,
  id: string,
  options?: RepositoryListOptions,
) {
  let query = context.client
    .from('budgets')
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
    throwSupabaseRepositoryError('budgets.getById', error)
  }

  return data ? mapBudgetRow(data) : undefined
}

async function requireSupabaseBudget(
  context: SupabaseFinanceRepositoryContext,
  id: string,
) {
  const budget = await getSupabaseBudgetById(context, id, {
    includeArchived: true,
    includeDeleted: true,
  })

  if (!budget) {
    throw new RepositoryRecordNotFoundError('Budget allocation', id)
  }

  return budget
}

async function assertActiveExpenseCategory(
  context: SupabaseFinanceRepositoryContext,
  categoryId: string,
) {
  const { data, error } = await context.client
    .from('categories')
    .select('id, type, archived_at, deleted_at')
    .eq('household_id', context.householdId)
    .eq('id', categoryId)
    .maybeSingle()

  if (error) {
    throwSupabaseRepositoryError('budgets.categoryCheck', error)
  }

  if (!data || data.archived_at || data.deleted_at) {
    throw new RepositoryError('Selected budget category is not available.')
  }

  if (data.type !== 'expense') {
    throw new RepositoryError('Budget category must be an expense category.')
  }
}

async function assertNoActiveDuplicate(
  context: SupabaseFinanceRepositoryContext,
  month: string,
  categoryId: string,
  excludeId?: string,
) {
  const { data, error } = await context.client
    .from('budgets')
    .select('id')
    .eq('household_id', context.householdId)
    .eq('month', month)
    .eq('category_id', categoryId)
    .is('deleted_at', null)
    .is('archived_at', null)

  if (error) {
    throwSupabaseRepositoryError('budgets.duplicateCheck', error)
  }

  const duplicate = (data ?? []).find((budget) => budget.id !== excludeId)

  if (duplicate) {
    throw new RepositoryDuplicateRecordError(
      'Budget allocation',
      'month and category',
    )
  }
}

function handleSupabaseBudgetWriteError(operation: string, error: unknown) {
  if (isSupabaseUniqueConstraintError(error)) {
    throw new RepositoryDuplicateRecordError(
      'Budget allocation',
      'month and category',
    )
  }

  throwSupabaseRepositoryError(operation, error)
}

export const supabaseBudgetsRepository = {
  async getAll() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getById() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getByMonth() {
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
} satisfies BudgetsRepositoryContract

export function createSupabaseBudgetsRepository(
  input: SupabaseFinanceRepositoryContextInput,
): BudgetsRepositoryContract {
  const context = requireSupabaseFinanceRepositoryContext(input)

  return {
    async getAll(options?: RepositoryListOptions) {
      let query = context.client
        .from('budgets')
        .select('*')
        .eq('household_id', context.householdId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query
        .order('month', { ascending: false })
        .order('category_id', { ascending: true })

      if (error) {
        throwSupabaseRepositoryError('budgets.getAll', error)
      }

      return (data ?? []).map(mapBudgetRow)
    },

    async getById(id: string, options?: RepositoryListOptions) {
      return getSupabaseBudgetById(context, id, options)
    },

    async getByMonth(month: string, options?: RepositoryListOptions) {
      assertMonth(month)

      let query = context.client
        .from('budgets')
        .select('*')
        .eq('household_id', context.householdId)
        .eq('month', month)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query.order('category_id', {
        ascending: true,
      })

      if (error) {
        throwSupabaseRepositoryError('budgets.getByMonth', error)
      }

      return (data ?? []).map(mapBudgetRow)
    },

    async create(input: CreateBudgetAllocationInput) {
      const budget = createBudgetRecord(input)

      validateBudgetInput(budget)
      await assertNoActiveDuplicate(context, budget.month, budget.categoryId)
      await assertActiveExpenseCategory(context, budget.categoryId)

      const insert = toSupabaseBudgetInsert(budget, {
        householdId: context.householdId,
        userId: context.userId,
      }) as BudgetTableInsert

      const { data, error } = await context.client
        .from('budgets')
        .insert(insert)
        .select()
        .single()

      if (error) {
        handleSupabaseBudgetWriteError('budgets.create', error)
      }

      if (!data) {
        throwSupabaseRepositoryError('budgets.create', {
          message: 'No budget row was returned.',
        })
      }

      return mapBudgetRow(data)
    },

    async update(id: string, input: UpdateBudgetAllocationInput) {
      const current = await requireSupabaseBudget(context, id)

      if (current.archivedAt || current.deletedAt) {
        throw new RepositoryError(
          'Archived or deleted budget allocations cannot be edited.',
        )
      }

      const merged = normalizeCreateInput(mergeBudgetInput(current, input))

      validateBudgetInput(merged)
      await assertNoActiveDuplicate(
        context,
        merged.month,
        merged.categoryId,
        id,
      )
      await assertActiveExpenseCategory(context, merged.categoryId)

      const update = toSupabaseBudgetUpdate(
        {
          month: merged.month,
          categoryId: merged.categoryId,
          plannedAmount: merged.plannedAmount,
          group: merged.group,
          notes: merged.notes,
        },
        {
          userId: context.userId,
          now: createTimestamp(),
        },
      ) as BudgetTableUpdate

      const { data, error } = await context.client
        .from('budgets')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        handleSupabaseBudgetWriteError('budgets.update', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Budget allocation', id)
      }

      return mapBudgetRow(data)
    },

    async archive(id: string) {
      const current = await requireSupabaseBudget(context, id)
      const now = createTimestamp()
      const update: BudgetTableUpdate = {
        archived_at: current.archivedAt ?? now,
        updated_at: now,
        updated_by: context.userId,
      }

      const { data, error } = await context.client
        .from('budgets')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throwSupabaseRepositoryError('budgets.archive', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Budget allocation', id)
      }

      return mapBudgetRow(data)
    },

    async deleteSoft(id: string) {
      const current = await requireSupabaseBudget(context, id)
      const now = createTimestamp()
      const update: BudgetTableUpdate = {
        deleted_at: current.deletedAt ?? now,
        updated_at: now,
        updated_by: context.userId,
      }

      const { data, error } = await context.client
        .from('budgets')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throwSupabaseRepositoryError('budgets.deleteSoft', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Budget allocation', id)
      }

      return mapBudgetRow(data)
    },
  }
}
