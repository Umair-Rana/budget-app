import type { CategoryType } from '@/data/models/category'

export type CategoryTypeOption = {
  value: CategoryType
  label: string
}

export type CategoryIconOption = {
  value: string
  label: string
}

export type CategoryColorOption = {
  value: string
  label: string
}

export const categoryTypeValues = [
  'income',
  'expense',
  'adjustment',
] as const

export const categoryTypeOptions: CategoryTypeOption[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'adjustment', label: 'Adjustment' },
]

export const categoryIconOptions: CategoryIconOption[] = [
  { value: 'banknote', label: 'Banknote' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'gift', label: 'Gift' },
  { value: 'trending-up', label: 'Trending Up' },
  { value: 'circle-plus', label: 'Income' },
  { value: 'utensils', label: 'Food' },
  { value: 'shopping-basket', label: 'Groceries' },
  { value: 'shopping-bag', label: 'Shopping' },
  { value: 'bus', label: 'Transport' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'home', label: 'Home' },
  { value: 'bolt', label: 'Utilities' },
  { value: 'wifi', label: 'Internet' },
  { value: 'smartphone', label: 'Mobile' },
  { value: 'heart-pulse', label: 'Healthcare' },
  { value: 'graduation-cap', label: 'Education' },
  { value: 'clapperboard', label: 'Entertainment' },
  { value: 'landmark', label: 'Loan' },
  { value: 'circle-minus', label: 'Expense' },
  { value: 'wallet-cards', label: 'Wallet' },
  { value: 'pencil-ruler', label: 'Correction' },
  { value: 'list-checks', label: 'Checklist' },
  { value: 'ellipsis', label: 'Other' },
]

export const categoryColorOptions: CategoryColorOption[] = [
  { value: '#16a34a', label: 'Green' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#d97706', label: 'Amber' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#db2777', label: 'Pink' },
  { value: '#64748b', label: 'Slate' },
]

export const defaultCategoryColor = '#16a34a'

export function getCategoryTypeLabel(type: CategoryType) {
  return categoryTypeOptions.find((option) => option.value === type)?.label ?? type
}
