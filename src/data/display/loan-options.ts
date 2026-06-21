import type { LoanStatus, LoanType } from '@/data/models/loan'

export type LoanTypeOption = {
  value: LoanType
  label: string
}

export type LoanStatusOption = {
  value: LoanStatus
  label: string
}

export type LoanFilterValue = 'given' | 'taken' | 'all'

export const loanTypeValues = ['given', 'taken'] as const

export const loanTypeOptions: LoanTypeOption[] = [
  { value: 'given', label: 'Loan Given' },
  { value: 'taken', label: 'Loan Taken' },
]

export const loanFilterOptions: Array<{
  value: LoanFilterValue
  label: string
}> = [
  { value: 'given', label: 'Given' },
  { value: 'taken', label: 'Taken' },
  { value: 'all', label: 'All' },
]

export const loanStatusOptions: LoanStatusOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'archived', label: 'Archived' },
]

export function getLoanTypeLabel(type: LoanType) {
  return loanTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getLoanStatusLabel(status: LoanStatus) {
  return (
    loanStatusOptions.find((option) => option.value === status)?.label ?? status
  )
}
