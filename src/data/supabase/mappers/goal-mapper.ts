import type { Goal, UpdateGoalInput } from '@/data/models/goal'
import type {
  GoalInsertRow,
  GoalRow,
  GoalUpdateRow,
  SupabaseFinanceMapperContext,
} from '@/data/supabase/supabase-finance-types'
import {
  nullable,
  optional,
  toSupabaseRecordFields,
  toSupabaseUpdateMetadata,
} from '@/data/supabase/mappers/mapper-utils'

export function fromSupabaseGoalRow(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    targetDate: optional(row.target_date),
    priority: row.priority,
    status: row.status,
    icon: optional(row.icon),
    color: optional(row.color),
    notes: optional(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: optional(row.archived_at),
    deletedAt: optional(row.deleted_at),
  }
}

export function toSupabaseGoalInsert(
  goal: Goal,
  context: SupabaseFinanceMapperContext,
): GoalInsertRow {
  return {
    ...toSupabaseRecordFields(goal, context),
    name: goal.name,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    target_date: nullable(goal.targetDate),
    priority: goal.priority,
    status: goal.status,
    icon: nullable(goal.icon),
    color: nullable(goal.color),
    notes: nullable(goal.notes),
  }
}

export function toSupabaseGoalUpdate(
  input: UpdateGoalInput,
  context: Pick<SupabaseFinanceMapperContext, 'now' | 'userId'>,
): GoalUpdateRow {
  const update: GoalUpdateRow = toSupabaseUpdateMetadata(context)

  if ('name' in input) {
    update.name = input.name
  }

  if ('targetAmount' in input) {
    update.target_amount = input.targetAmount
  }

  if ('currentAmount' in input) {
    update.current_amount = input.currentAmount
  }

  if ('targetDate' in input) {
    update.target_date = nullable(input.targetDate)
  }

  if ('priority' in input) {
    update.priority = input.priority
  }

  if ('icon' in input) {
    update.icon = nullable(input.icon)
  }

  if ('color' in input) {
    update.color = nullable(input.color)
  }

  if ('notes' in input) {
    update.notes = nullable(input.notes)
  }

  return update
}
