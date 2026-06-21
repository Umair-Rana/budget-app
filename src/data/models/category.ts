import type { FinanceRecord } from '@/data/models/common'

export type CategoryType = 'income' | 'expense' | 'adjustment'

export type Category = FinanceRecord & {
  name: string
  type: CategoryType
  icon: string
  color: string
  isDefault: boolean
  defaultKey?: string
}

export type CreateCategoryInput = {
  name: string
  type: CategoryType
  icon: string
  color: string
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>
