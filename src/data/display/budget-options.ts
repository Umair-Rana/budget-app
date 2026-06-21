import type { BudgetGroup } from '@/data/models/budget'

export const budgetGroupOptions: Array<{
  label: string
  value: BudgetGroup
}> = [
  { label: 'Needs', value: 'needs' },
  { label: 'Wants', value: 'wants' },
  { label: 'Savings', value: 'savings' },
  { label: 'Loans', value: 'loans' },
  { label: 'Custom', value: 'custom' },
]
