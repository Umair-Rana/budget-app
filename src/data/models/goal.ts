import type { FinanceRecord, IsoDateString } from '@/data/models/common'

export type GoalPriority = 'low' | 'medium' | 'high'
export type GoalStatus = 'active' | 'completed' | 'archived'

export type Goal = FinanceRecord & {
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: IsoDateString
  priority: GoalPriority
  status: GoalStatus
  icon?: string
  color?: string
  notes?: string
}

export type CreateGoalInput = {
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: IsoDateString
  priority: GoalPriority
  icon?: string
  color?: string
  notes?: string
}

export type UpdateGoalInput = Partial<CreateGoalInput>

export type AddGoalContributionInput = {
  amount: number
  sourceAccountId: string
  date: IsoDateString
  notes?: string
}

export type WithdrawFromGoalInput = {
  amount: number
  destinationAccountId: string
  date: IsoDateString
  notes?: string
}
