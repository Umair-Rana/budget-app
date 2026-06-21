import type { TransactionType } from '@/data/models/transaction'

export type TransactionTypeOption = {
  value: TransactionType
  label: string
}

export type TransactionSortOption = {
  value: TransactionSortValue
  label: string
}

export type TransactionSortValue =
  | 'newest'
  | 'oldest'
  | 'highest'
  | 'lowest'

export const transactionTypeValues = [
  'income',
  'expense',
  'transfer',
  'adjustment',
] as const

export const transactionTypeOptions: TransactionTypeOption[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
]

export const transactionSortOptions: TransactionSortOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest amount' },
  { value: 'lowest', label: 'Lowest amount' },
]

export function getTransactionTypeLabel(type: TransactionType) {
  return (
    transactionTypeOptions.find((option) => option.value === type)?.label ?? type
  )
}
