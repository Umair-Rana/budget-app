import type { CurrencyCode, FinanceRecord } from '@/data/models/common'

export type AccountType =
  | 'cash'
  | 'bank'
  | 'wallet'
  | 'credit_card'
  | 'savings'
  | 'investment'
  | 'loan_account'
  | 'other'

export type Account = FinanceRecord & {
  name: string
  type: AccountType
  icon: string
  color: string
  currency: CurrencyCode
  openingBalance: number
  currentBalance: number
  notes?: string
}

export type CreateAccountInput = {
  name: string
  type: AccountType
  icon: string
  color: string
  currency?: CurrencyCode
  openingBalance: number
  notes?: string
}

export type UpdateAccountInput = Partial<
  Pick<
    Account,
    'name' | 'type' | 'icon' | 'color' | 'currency' | 'openingBalance' | 'notes'
  >
>
