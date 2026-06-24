import type { BudgetAllocation } from '@/data/models/budget'
import type { LocalBudgetRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  fromLocalRecordRow,
  nullable,
  optional,
  toLocalRecordRow,
} from '@/data/local-sqlite/mappers/mapper-utils'

export function fromLocalBudgetRow(row: LocalBudgetRow): BudgetAllocation {
  return {
    ...fromLocalRecordRow(row),
    categoryId: row.category_id,
    group: optional(row.group_name),
    month: row.month,
    notes: optional(row.notes),
    plannedAmount: row.planned_amount,
  }
}

export function toLocalBudgetRow(
  budget: BudgetAllocation,
  context: { householdId: string; userId?: string },
): LocalBudgetRow {
  return {
    ...toLocalRecordRow(budget, context),
    category_id: budget.categoryId,
    group_name: nullable(budget.group),
    month: budget.month,
    notes: nullable(budget.notes),
    planned_amount: budget.plannedAmount,
  }
}
