import type { EntityId, FinanceRecord } from '@/data/models/common'

export type BudgetGroup = 'needs' | 'wants' | 'savings' | 'loans' | 'custom'

export type BudgetAllocation = FinanceRecord & {
  month: string
  categoryId: EntityId
  plannedAmount: number
  group?: BudgetGroup
  notes?: string
}

export type CreateBudgetAllocationInput = {
  month: string
  categoryId: EntityId
  plannedAmount: number
  group?: BudgetGroup
  notes?: string
}

export type UpdateBudgetAllocationInput =
  Partial<CreateBudgetAllocationInput>
