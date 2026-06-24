import type { Goal } from '@/data/models/goal'
import type { LocalGoalRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  fromLocalRecordRow,
  nullable,
  optional,
  toLocalRecordRow,
} from '@/data/local-sqlite/mappers/mapper-utils'

export function fromLocalGoalRow(row: LocalGoalRow): Goal {
  return {
    ...fromLocalRecordRow(row),
    color: optional(row.color),
    currentAmount: row.current_amount,
    icon: optional(row.icon),
    name: row.name,
    notes: optional(row.notes),
    priority: row.priority,
    status: row.status,
    targetAmount: row.target_amount,
    targetDate: optional(row.target_date),
  }
}

export function toLocalGoalRow(
  goal: Goal,
  context: { householdId: string; userId?: string },
): LocalGoalRow {
  return {
    ...toLocalRecordRow(goal, context),
    color: nullable(goal.color),
    current_amount: goal.currentAmount,
    icon: nullable(goal.icon),
    name: goal.name,
    notes: nullable(goal.notes),
    priority: goal.priority,
    status: goal.status,
    target_amount: goal.targetAmount,
    target_date: nullable(goal.targetDate),
  }
}
