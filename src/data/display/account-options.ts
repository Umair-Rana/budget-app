import type { AccountType } from '@/data/models/account'

export type AccountTypeOption = {
  value: AccountType
  label: string
}

export type AccountIconOption = {
  value: string
  label: string
}

export const accountTypeValues = [
  'cash',
  'bank',
  'wallet',
  'credit_card',
  'savings',
  'investment',
  'loan_account',
  'other',
] as const

export const accountTypeOptions: AccountTypeOption[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan_account', label: 'Loan Account' },
  { value: 'other', label: 'Other' },
]

export const accountIconOptions: AccountIconOption[] = [
  { value: 'wallet-cards', label: 'Wallet Cards' },
  { value: 'landmark', label: 'Landmark' },
  { value: 'banknote', label: 'Banknote' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'piggy-bank', label: 'Piggy Bank' },
  { value: 'briefcase-business', label: 'Briefcase' },
  { value: 'coins', label: 'Coins' },
  { value: 'circle-dollar-sign', label: 'Money' },
]

export const defaultAccountColor = '#047857'

export function getAccountTypeLabel(type: AccountType) {
  return accountTypeOptions.find((option) => option.value === type)?.label ?? type
}
