import type {
  BudgetAllocation,
  UpdateBudgetAllocationInput,
} from '@/data/models/budget'
import type {
  BudgetInsertRow,
  BudgetRow,
  BudgetUpdateRow,
  SupabaseFinanceMapperContext,
} from '@/data/supabase/supabase-finance-types'
import {
  nullable,
  optional,
  toSupabaseRecordFields,
  toSupabaseUpdateMetadata,
} from '@/data/supabase/mappers/mapper-utils'

export function fromSupabaseBudgetRow(row: BudgetRow): BudgetAllocation {
  return {
    id: row.id,
    month: row.month,
    categoryId: row.category_id,
    plannedAmount: row.planned_amount,
    group: optional(row.group_name),
    notes: optional(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: optional(row.archived_at),
    deletedAt: optional(row.deleted_at),
  }
}

export function toSupabaseBudgetInsert(
  budget: BudgetAllocation,
  context: SupabaseFinanceMapperContext,
): BudgetInsertRow {
  return {
    ...toSupabaseRecordFields(budget, context),
    month: budget.month,
    category_id: budget.categoryId,
    planned_amount: budget.plannedAmount,
    group_name: nullable(budget.group),
    notes: nullable(budget.notes),
  }
}

export function toSupabaseBudgetUpdate(
  input: UpdateBudgetAllocationInput,
  context: Pick<SupabaseFinanceMapperContext, 'now' | 'userId'>,
): BudgetUpdateRow {
  const update: BudgetUpdateRow = toSupabaseUpdateMetadata(context)

  if ('month' in input) {
    update.month = input.month
  }

  if ('categoryId' in input) {
    update.category_id = input.categoryId
  }

  if ('plannedAmount' in input) {
    update.planned_amount = input.plannedAmount
  }

  if ('group' in input) {
    update.group_name = nullable(input.group)
  }

  if ('notes' in input) {
    update.notes = nullable(input.notes)
  }

  return update
}
